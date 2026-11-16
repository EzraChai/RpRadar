import { useEffect, useRef, useState } from "react";
import { Polyline, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  lineString,
  point,
  nearestPointOnLine,
  lineSliceAlong,
  length as turfLength,
} from "@turf/turf";

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY as string;
const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

// Maximum distance (in metres) an incident coordinate can deviate from the bus route.
// Cross streets and parallel streets beyond this threshold are excluded.
const MAX_DISTANCE_FROM_ROUTE_M = 45;

// Minimum span along the bus route (in metres) to consider a valid traffic segment.
// Cross street intersections only touch the route at a point (< 25m) and are filtered out.
const MIN_SPAN_M = 25;

export type TrafficSeverity = "heavy" | "moderate";

const TRAFFIC_STYLES: Record<
  TrafficSeverity,
  { color: string; weight: number; opacity: number }
> = {
  moderate: {
    color: "#eab308", // Vivid yellow for moderate traffic jam / slowdown
    weight: 16,
    opacity: 0.75,
  },
  heavy: {
    color: "#e53e3e", // Red for heavy traffic jam / closure
    weight: 16,
    opacity: 0.75,
  },
};

// ─── Geometry & Interval Helpers ─────────────────────────────────────────────

function toLatLng(coord: LatLngExpression): [number, number] | null {
  if (Array.isArray(coord)) {
    if (
      coord.length >= 2 &&
      typeof coord[0] === "number" &&
      typeof coord[1] === "number"
    ) {
      return [coord[0], coord[1]];
    }
    return null;
  }
  if (coord && typeof coord === "object" && "lat" in coord) {
    return [coord.lat, coord.lng];
  }
  return null;
}

/** Flatten and clean route positions into a continuous [lat, lng] array without adjacent duplicates */
function flattenRoute(positions: LatLngExpression[][]): [number, number][] {
  const flat: [number, number][] = [];
  if (positions.length === 0) return [];

  const firstItem = positions[0] as unknown;
  const isFlatList =
    Array.isArray(firstItem) &&
    firstItem.length === 2 &&
    typeof firstItem[0] === "number";

  if (isFlatList) {
    for (const coord of positions) {
      const p = toLatLng(coord as unknown as LatLngExpression);
      if (p) flat.push(p);
    }
  } else {
    for (const segment of positions) {
      for (const coord of segment) {
        const p = toLatLng(coord);
        if (p) flat.push(p);
      }
    }
  }

  // Remove adjacent duplicate coordinates
  const clean: [number, number][] = [];
  for (let i = 0; i < flat.length; i++) {
    if (
      i === 0 ||
      flat[i][0] !== flat[i - 1][0] ||
      flat[i][1] !== flat[i - 1][1]
    ) {
      clean.push(flat[i]);
    }
  }

  return clean;
}

/** Compute bounding box for the entire route formatted as minLon,minLat,maxLon,maxLat */
function getRouteBbox(flatRoute: [number, number][], padding = 0.01): string {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of flatRoute) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // TomTom bbox format: minLon,minLat,maxLon,maxLat
  const minLon = (minLng - padding).toFixed(5);
  const minLatStr = (minLat - padding).toFixed(5);
  const maxLon = (maxLng + padding).toFixed(5);
  const maxLatStr = (maxLat + padding).toFixed(5);

  return `${minLon},${minLatStr},${maxLon},${maxLatStr}`;
}

/** Merge overlapping or adjacent 1D intervals [startM, endM] */
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [[...sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current[0] <= last[1] + 5) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push([...current]);
    }
  }

  return merged;
}

/**
 * Subtract subtrahend intervals from base intervals.
 * Used so heavy jam intervals take visual priority over moderate intervals.
 */
function subtractIntervals(
  bases: [number, number][],
  subtrahends: [number, number][],
): [number, number][] {
  let result: [number, number][] = [...bases];

  for (const [subStart, subEnd] of subtrahends) {
    const nextResult: [number, number][] = [];
    for (const [bStart, bEnd] of result) {
      if (subEnd <= bStart || subStart >= bEnd) {
        nextResult.push([bStart, bEnd]);
      } else {
        if (bStart < subStart) {
          nextResult.push([bStart, subStart]);
        }
        if (bEnd > subEnd) {
          nextResult.push([subEnd, bEnd]);
        }
      }
    }
    result = nextResult;
  }

  return result.filter(([s, e]) => e - s >= MIN_SPAN_M);
}

function isHeavySeverity(mag: unknown, icon: unknown): boolean {
  if (icon === 8 || icon === 9) return true; // Road closed
  if (typeof mag === "number") {
    return mag >= 3; // 3 = major delay, 4 = road closure / indefinite
  }
  if (typeof mag === "string") {
    const lower = mag.toLowerCase();
    return lower === "major" || lower === "undefined" || lower === "indefinite";
  }
  return false;
}

// ─── Single API Fetch & Mapping ──────────────────────────────────────────────

interface ClassifiedTrafficSegments {
  heavy: [number, number][][];
  moderate: [number, number][][];
}

/**
 * Fetches real-time traffic jams and incidents using a SINGLE API call (TomTom Incident Details),
 * then maps and slices the congested sections strictly along the bus route.
 * Roads outside the bus route (perpendicular streets, continuing roads, etc.) are excluded.
 */
async function fetchRouteTrafficSingleApi(
  flatRoute: [number, number][],
  signal?: AbortSignal,
): Promise<ClassifiedTrafficSegments> {
  if (!TOMTOM_API_KEY || flatRoute.length < 2) {
    return { heavy: [], moderate: [] };
  }

  const coordsForTurf = flatRoute.map(([lat, lng]) => [lng, lat]);
  const routeLine = lineString(coordsForTurf);
  const totalLengthM = turfLength(routeLine, { units: "meters" });
  if (totalLengthM <= 0) return { heavy: [], moderate: [] };

  const bbox = getRouteBbox(flatRoute);
  // Single GET request retrieving all traffic incidents and jams within the route's bounding box
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails` +
    `?key=${TOMTOM_API_KEY}&bbox=${bbox}&timeValidityFilter=present`;

  let data: any;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return { heavy: [], moderate: [] };
    data = await res.json();
  } catch {
    return { heavy: [], moderate: [] };
  }

  if (signal?.aborted) return { heavy: [], moderate: [] };

  const rawIncidents = data?.incidents ?? data?.features ?? [];
  console.log(
    `[TrafficLayer] Single API call returned ${rawIncidents.length} traffic incident(s) in bbox`,
  );

  const rawHeavyIntervals: [number, number][] = [];
  const rawModerateIntervals: [number, number][] = [];

  for (const inc of rawIncidents) {
    const geom = inc.geometry;
    if (!geom) continue;

    const props = inc.properties ?? {};
    const mag = props.magnitudeOfDelay;
    const icon = props.iconCategory;
    const isHeavy = isHeavySeverity(mag, icon);

    // Handle point incidents (accidents, hazards, localized jams)
    if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
      const [lon, lat] = geom.coordinates;
      const sn = nearestPointOnLine(routeLine, point([lon, lat]), {
        units: "meters",
      });
      const dist = sn.properties.dist ?? Infinity;
      if (dist <= MAX_DISTANCE_FROM_ROUTE_M) {
        const len = props.length && props.length > 0 ? props.length : 100;
        const loc = sn.properties.location ?? 0;
        const s = Math.max(0, loc - len / 2);
        const e = Math.min(totalLengthM, loc + len / 2);
        if (e - s >= MIN_SPAN_M) {
          if (isHeavy) {
            rawHeavyIntervals.push([s, e]);
          } else {
            rawModerateIntervals.push([s, e]);
          }
        }
      }
      continue;
    }

    // Handle line incidents (traffic jam stretches, road closures)
    const lines: [number, number][][] = [];
    if (geom.type === "LineString" && Array.isArray(geom.coordinates)) {
      lines.push(geom.coordinates);
    } else if (
      geom.type === "MultiLineString" &&
      Array.isArray(geom.coordinates)
    ) {
      for (const line of geom.coordinates) {
        if (Array.isArray(line)) lines.push(line);
      }
    }

    for (const lineCoords of lines) {
      const locs: number[] = [];
      for (const coord of lineCoords) {
        if (!Array.isArray(coord) || coord.length < 2) continue;
        const [lon, lat] = coord;
        const sn = nearestPointOnLine(routeLine, point([lon, lat]), {
          units: "meters",
        });
        const dist = sn.properties.dist ?? Infinity;
        if (dist <= MAX_DISTANCE_FROM_ROUTE_M) {
          locs.push(sn.properties.location ?? 0);
        }
      }

      if (locs.length >= 2) {
        const minL = Math.max(0, Math.min(...locs));
        const maxL = Math.min(totalLengthM, Math.max(...locs));
        const span = maxL - minL;
        // Cross-street incidents only intersect at a point (< 25m) and are rejected
        if (span >= MIN_SPAN_M) {
          if (isHeavy) {
            rawHeavyIntervals.push([minL, maxL]);
          } else {
            rawModerateIntervals.push([minL, maxL]);
          }
        }
      }
    }
  }

  // Merge intervals of the same severity
  const mergedHeavy = mergeIntervals(rawHeavyIntervals);
  const mergedModerate = mergeIntervals(rawModerateIntervals);

  // Subtract heavy intervals from moderate intervals so heavy takes visual precedence
  const finalModerate = subtractIntervals(mergedModerate, mergedHeavy);

  // Slice the actual bus route polyline so only the bus route is rendered
  const heavyPolylines: [number, number][][] = [];
  for (const [startM, endM] of mergedHeavy) {
    if (endM - startM < MIN_SPAN_M) continue;
    try {
      const sliced = lineSliceAlong(routeLine, startM, endM, {
        units: "meters",
      });
      const coords = sliced.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      if (coords.length >= 2) {
        heavyPolylines.push(coords);
      }
    } catch {
      // Ignore invalid slice edge cases
    }
  }

  const moderatePolylines: [number, number][][] = [];
  for (const [startM, endM] of finalModerate) {
    if (endM - startM < MIN_SPAN_M) continue;
    try {
      const sliced = lineSliceAlong(routeLine, startM, endM, {
        units: "meters",
      });
      const coords = sliced.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      if (coords.length >= 2) {
        moderatePolylines.push(coords);
      }
    } catch {
      // Ignore invalid slice edge cases
    }
  }

  return {
    heavy: heavyPolylines,
    moderate: moderatePolylines,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TrafficLayerProps {
  /** The route positions (polyline segments) */
  positions: LatLngExpression[][];
  /** Whether the traffic overlay is currently visible */
  visible: boolean;
}

/**
 * TrafficLayer fetches TomTom real-time traffic flow data with a SINGLE API request
 * and renders traffic jams (heavy in red, moderate in yellow) strictly along the bus route.
 */
export function TrafficLayer({ positions, visible }: TrafficLayerProps) {
  const map = useMap();
  const [trafficSegments, setTrafficSegments] =
    useState<ClassifiedTrafficSegments>({ heavy: [], moderate: [] });
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Create dedicated pane so traffic polylines sit above tilePane (200) but below overlayPane (400)
  useEffect(() => {
    if (!map.getPane("trafficJamPane")) {
      const pane = map.createPane("trafficJamPane");
      pane.style.zIndex = "350";
      pane.style.pointerEvents = "none";
    }
  }, [map]);

  const refresh = async (currentPositions: LatLngExpression[][]) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const flat = flattenRoute(currentPositions);
    if (flat.length < 2) {
      setTrafficSegments({ heavy: [], moderate: [] });
      return;
    }

    setLoading(true);
    try {
      // Exactly ONE API call to fetch traffic for the entire route
      const result = await fetchRouteTrafficSingleApi(flat, signal);
      if (signal.aborted) return;
      console.log(
        `[TrafficLayer] Single API result: ${result.heavy.length} heavy (red) and ${result.moderate.length} moderate (yellow) segments on bus route`,
      );
      setTrafficSegments(result);
    } catch (err) {
      if (signal.aborted) return;
      console.error("[TrafficLayer] Error fetching traffic data:", err);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Re-fetch whenever positions change or visibility is toggled on
  useEffect(() => {
    if (!visible) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTrafficSegments({ heavy: [], moderate: [] });
      return;
    }

    if (positions.length === 0) {
      setTrafficSegments({ heavy: [], moderate: [] });
      return;
    }

    // Immediate single fetch
    refresh(positions);

    // Schedule refresh every 3 minutes
    intervalRef.current = setInterval(() => {
      refresh(positions);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortRef.current) abortRef.current.abort();
    };
  }, [visible, positions]);

  void loading;

  if (
    !visible ||
    (trafficSegments.heavy.length === 0 &&
      trafficSegments.moderate.length === 0)
  ) {
    return null;
  }

  return (
    <>
      {/* Moderate traffic slowdown (yellow) rendered first */}
      {trafficSegments.moderate.map((coords, i) => (
        <Polyline
          key={`mod-${i}-${coords[0][0]}-${coords[0][1]}`}
          positions={coords}
          pathOptions={{
            color: TRAFFIC_STYLES.moderate.color,
            weight: TRAFFIC_STYLES.moderate.weight,
            opacity: TRAFFIC_STYLES.moderate.opacity,
            lineCap: "round",
            lineJoin: "round",
            pane: "trafficJamPane",
          }}
          pane="trafficJamPane"
        />
      ))}

      {/* Heavy traffic jam / closure (red) rendered on top */}
      {trafficSegments.heavy.map((coords, i) => (
        <Polyline
          key={`heavy-${i}-${coords[0][0]}-${coords[0][1]}`}
          positions={coords}
          pathOptions={{
            color: TRAFFIC_STYLES.heavy.color,
            weight: TRAFFIC_STYLES.heavy.weight,
            opacity: TRAFFIC_STYLES.heavy.opacity,
            lineCap: "round",
            lineJoin: "round",
            pane: "trafficJamPane",
          }}
          pane="trafficJamPane"
        />
      ))}
    </>
  );
}
