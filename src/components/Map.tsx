import {
  MapContainer,
  Polyline,
  useMap,
  CircleMarker,
  Popup,
  Marker,
  divIcon,
  fitBoundsOf,
} from "./maplibre-adapter";
import { Link, useParams, useSearchParams } from "react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { transit_realtime } from "gtfs-realtime-bindings";
import type {
  LatLngExpression,
  CircleMarkerRef,
  DivIcon,
} from "./maplibre-adapter";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "./theme-provider";
import { GeolocateControl, Layer, Source } from "@vis.gl/react-maplibre";
import {
  bearing,
  distance,
  length,
  lineString,
  point,
  nearestPointOnLine,
} from "@turf/turf";
import { Minus, Plus, Settings, Star, X } from "lucide-react";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMobile } from "./DrawerMobile";
import RapidPenangShapes from "@/assets/rp/rp_shapes_flipped.json";
import RapidPenangRoutes from "@/assets/rp/rp_routes_with_directions.json";
import RapidPenangSchedule from "@/../data/rapid-penang-schedule.json";
import RapidKLShapes from "@/assets/rkl/rkl_shapes_flipped.json";
import RapidKLRoutes from "@/assets/rkl/rkl_routes_with_directions.json";
import RapidKLSchedule from "@/../data/rapid-kl-schedule.json";
import MRTFeederShapes from "@/assets/mrt/mrt_shapes_flipped.json";
import MRTFeederRoutes from "@/assets/mrt/mrt_routes_with_directions.json";
import MRTFeederSchedule from "@/../data/mrt-feeder-schedule.json";
import MYBasNSAShapes from "@/assets/ns_a/ns_a_shapes_flipped.json";
import MYBasNSARoutes from "@/assets/ns_a/ns_a_routes_with_directions.json";
import MYBasNSASchedule from "@/../data/ns-a-schedule.json";
import MYBasNSBShapes from "@/assets/ns_b/ns_b_shapes_flipped.json";
import MYBasNSBRoutes from "@/assets/ns_b/ns_b_routes_with_directions.json";
import MYBasNSBSchedule from "@/../data/ns-b-schedule.json";
import MyBasMkShapes from "@/assets/mk/mk_shapes_flipped.json";
import MyBasMkRoutes from "@/assets/mk/mk_routes_with_directions.json";
import MyBasMkSchedule from "@/../data/mk-schedule.json";
import MyBasJbShapes from "@/assets/jb/jb_shapes_flipped.json";
import MyBasJbRoutes from "@/assets/jb/jb_routes_with_directions.json";
import MyBasJbSchedule from "@/../data/jb-schedule.json";
import MyBasPkShapes from "@/assets/pk/pk_shapes_flipped.json";
import MyBasPkRoutes from "@/assets/pk/pk_routes_with_directions.json";
import MyBasPkSchedule from "@/../data/pk-schedule.json";
import MyBasKtnShapes from "@/assets/ktn/ktn_shapes_flipped.json";
import MyBasKtnRoutes from "@/assets/ktn/ktn_routes_with_directions.json";
import MyBasKtnSchedule from "@/../data/rapid-ktn-schedule.json";
import MyBasAlrShapes from "@/assets/alr/alr_shapes_flipped.json";
import MyBasAlrRoutes from "@/assets/alr/alr_routes_with_directions.json";
import MyBasAlrSchedule from "@/../data/alr-schedule.json";
import MyBasKgrShapes from "@/assets/kgr/kgr_shapes_flipped.json";
import MyBasKgrRoutes from "@/assets/kgr/kgr_routes_with_directions.json";
import MyBasKgrSchedule from "@/../data/kgr-schedule.json";
import MyBasKtbShapes from "@/assets/ktb/ktb_shapes_flipped.json";
import MyBasKtbRoutes from "@/assets/ktb/ktb_routes_with_directions.json";
import MyBasKtbSchedule from "@/../data/ktb-schedule.json";
import MyBasTrgShapes from "@/assets/trg/trg_shapes_flipped.json";
import MyBasTrgRoutes from "@/assets/trg/trg_routes_with_directions.json";
import MyBasTrgSchedule from "@/../data/trg-schedule.json";
import MyBasSwShapes from "@/assets/sw/sw_shapes_flipped.json";
import MyBasSwRoutes from "@/assets/sw/sw_routes_with_directions.json";
import MyBasSwSchedule from "@/../data/sw-schedule.json";

import RapidRailShapes from "@/assets/rail/shapes_flipped.json";
import RapidRailRoutesWithShapesID from "@/assets/rail/routes_with_shapes.json";
import RapidRailRoutesWithStops from "@/assets/rail/routes_with_directions.json";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getCurrentDate,
  getCurrentDateEvenAfter12,
  hasCurrentTimePassed,
  findT310Heading,
  nextBusTime,
} from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BusScheduleType } from "@/hooks/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { pusher, AVL_API } from "@/lib/pusher";
import type { AvlVehicle } from "@/lib/pusher";
import { TrafficLayer } from "./TrafficLayer";
import { deriveVehicleDirectionBuckets } from "@/lib/vehicle-direction-buckets";
import type { Feature, LineString } from "geojson";

type IVehiclePosition = transit_realtime.IVehiclePosition;

const rapidPenangDirectionByTripId = new Map<string, number>();
for (const schedule of RapidPenangSchedule) {
  for (const tripId of schedule.trip_ids) {
    // Keep the first match, as Array.find did before this index existed.
    if (!rapidPenangDirectionByTripId.has(tripId)) {
      rapidPenangDirectionByTripId.set(tripId, schedule.d);
    }
  }
}

function darkenHex(hex: string, percent = 10) {
  hex = hex.replace("#", "");

  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  const factor = 1 - percent / 100;

  const newR = Math.max(0, Math.round(r * factor));
  const newG = Math.max(0, Math.round(g * factor));
  const newB = Math.max(0, Math.round(b * factor));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}
function lighterHex(hex: string, percent = 10) {
  hex = hex.replace("#", "");

  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  const newR = Math.round(r + (255 - r) * (percent / 100));
  const newG = Math.round(g + (255 - g) * (percent / 100));
  const newB = Math.round(b + (255 - b) * (percent / 100));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

function App() {
  const { id: pathRouteId } = useParams();
  const [searchParams] = useSearchParams();
  const queryRouteId = searchParams.get("id");
  const routeId = pathRouteId ?? queryRouteId;
  const highlightStopId = searchParams.get("stopId") ?? undefined;
  const [provider, setProvider] = useState<string>(() => {
    return localStorage.getItem("provider") || "rp";
  });
  const [railVisible, setRailVisible] = useState(() => {
    return localStorage.getItem("railVisible") === "true" || false;
  });

  const [trafficVisible, setTrafficVisible] = useState(() => {
    const saved = localStorage.getItem("trafficVisible");
    return saved !== null ? saved === "true" : false;
  });

  const [route, setRoute] = useState<
    | {
        route_id: string;
        route_short_name: string;
        directions: {
          service_ids?: string[];
          direction_id: number;
          shape_id: string;
          route_long_name: string;
          stops: {
            stop_id: string;
            stop_name: string;
            lat: number;
            lon: number;
          }[];
        }[];
      }
    | undefined
  >();
  const [BusSchedule, setBusSchedule] = useState<BusScheduleType | null>(null);

  useEffect(() => {
    switch (provider) {
      case "rp":
        setRoute(RapidPenangRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(RapidPenangSchedule as unknown as BusScheduleType);
        break;

      case "rkl":
        setRoute(
          RapidKLRoutes.some((r) => r.route_id === routeId)
            ? RapidKLRoutes.find((r) => r.route_id === routeId)
            : MRTFeederRoutes.find((r) => r.route_id === routeId),
        );
        setBusSchedule(
          RapidKLRoutes.some((r) => r.route_id === routeId)
            ? (RapidKLSchedule as unknown as BusScheduleType)
            : (MRTFeederSchedule as unknown as BusScheduleType),
        );
        break;

      case "ns":
        setRoute(
          MYBasNSARoutes.some((r) => r.route_id === routeId)
            ? MYBasNSARoutes.find((r) => r.route_id === routeId)
            : MYBasNSBRoutes.find((r) => r.route_id === routeId),
        );
        setBusSchedule(
          MYBasNSARoutes.some((r) => r.route_id === routeId)
            ? (MYBasNSASchedule as unknown as BusScheduleType)
            : (MYBasNSBSchedule as unknown as BusScheduleType),
        );
        break;

      case "mk":
        setRoute(MyBasMkRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasMkSchedule as unknown as BusScheduleType);
        break;

      case "jb":
        setRoute(MyBasJbRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasJbSchedule as unknown as BusScheduleType);
        break;
      case "pk":
        setRoute(MyBasPkRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasPkSchedule as unknown as BusScheduleType);
        break;
      case "ktn":
        setRoute(MyBasKtnRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasKtnSchedule as unknown as BusScheduleType);
        break;
      case "alr":
        setRoute(MyBasAlrRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasAlrSchedule as unknown as BusScheduleType);
        break;
      case "kgr":
        setRoute(MyBasKgrRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasKgrSchedule as unknown as BusScheduleType);
        break;
      case "ktb":
        setRoute(MyBasKtbRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasKtbSchedule as unknown as BusScheduleType);
        break;
      case "trg":
        setRoute(MyBasTrgRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasTrgSchedule as unknown as BusScheduleType);
        break;
      case "sw":
        setRoute(MyBasSwRoutes.find((r) => r.route_id === routeId));
        setBusSchedule(MyBasSwSchedule as unknown as BusScheduleType);
    }
  }, [provider, routeId]);

  const markerRefs = useRef<{ [key: string]: CircleMarkerRef | null }>({});
  const [direction, setDirection] = useState(() => {
    return provider === "jb" || provider === "mk" ? 1 : 0;
  });
  const [positions, setPositions] = useState<LatLngExpression[][]>([]);
  const [positionsDirection, setPositionsDirection] = useState(direction);
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!routeId) {
      const defaultDirection = provider === "jb" || provider === "mk" ? 1 : 0;
      setDirection(defaultDirection);
      setPositions([]);
      setPositionsDirection(defaultDirection);
      return;
    }
    if (routeId) {
      const shapeId = route?.directions.find((d) => {
        if (provider === "mk") {
          const today = new Date().getDay();
          if (today !== 5 && today !== 6 && today !== 0) {
            return (
              (d.direction_id === direction &&
                d.service_ids?.includes("ALLDAY")) ||
              (d.direction_id === direction &&
                d.service_ids?.includes("MONTHURS"))
            );
          } else {
            return (
              (d.direction_id === direction &&
                d.service_ids?.includes("ALLDAY")) ||
              (d.direction_id === direction &&
                d.service_ids?.includes("FRISUN"))
            );
          }
        } else {
          return d.direction_id === direction;
        }
      })?.shape_id;

      let filteredShape = null;

      if (provider === "rp") {
        filteredShape = RapidPenangShapes.features.filter(
          (feature) => feature.properties.shape_id === shapeId,
        );
      } else if (provider === "rkl") {
        if (
          RapidKLShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = RapidKLShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        } else if (
          MRTFeederShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MRTFeederShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "ns") {
        if (
          MYBasNSAShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MYBasNSAShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        } else if (
          MYBasNSBShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MYBasNSBShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "mk") {
        if (
          MyBasMkShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasMkShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "jb") {
        if (
          MyBasJbShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasJbShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "pk") {
        if (
          MyBasPkShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasPkShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "ktn") {
        if (
          MyBasKtnShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasKtnShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "alr") {
        if (
          MyBasAlrShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasAlrShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "kgr") {
        if (
          MyBasKgrShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasKgrShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "ktb") {
        if (
          MyBasKtbShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasKtbShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "trg") {
        if (
          MyBasTrgShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasTrgShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "sw") {
        if (
          MyBasSwShapes.features.some(
            (feature) => feature.properties.shape_id === shapeId,
          )
        ) {
          filteredShape = MyBasSwShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      }
      if (filteredShape?.length) {
        setPositions(
          filteredShape[0].geometry
            .coordinates as unknown as LatLngExpression[][],
        );
        setPositionsDirection(direction);
      }
    } else {
      if (isMobile) {
        setDirection(0);
        setPositions([]);
        setPositionsDirection(0);
      }
    }
  }, [route?.directions, direction, isMobile, routeId]);

  // Ensure direction matches the highlighted stop if arriving via stop search
  useEffect(() => {
    if (!highlightStopId || !route) return;
    const dirWithStop = route.directions.find((d) =>
      d.stops.some((s) => s.stop_id === highlightStopId),
    );
    if (dirWithStop && dirWithStop.direction_id !== direction) {
      setDirection(dirWithStop.direction_id);
    }
  }, [route, highlightStopId, direction]);

  // Drop stop-marker refs that belong to previously selected routes so
  // stale CircleMarkerRef proxies (and their context closures) are not
  // retained across route switches.
  useEffect(() => {
    const keep = new Set<string>();
    for (const d of route?.directions ?? []) {
      for (const s of d.stops) keep.add(s.stop_id);
    }
    for (const key of Object.keys(markerRefs.current)) {
      if (!keep.has(key)) delete markerRefs.current[key];
    }
  }, [route, markerRefs]);

  return (
    <div className="w-full max-h-dvh overflow-hidden flex justify-center items-center grid-style">
      <MapContainer
        id="map"
        preferCanvas={true}
        theme={theme}
        maxZoom={18}
        zoomControl={false}
        center={
          provider === "rp"
            ? [5.4164, 100.3327]
            : provider === "rkl"
              ? [3.139, 101.6869]
              : provider === "ns"
                ? [2.7297, 101.9381]
                : provider === "mk"
                  ? [2.1881, 102.2516]
                  : provider === "jb"
                    ? [1.4927, 103.7412]
                    : provider === "pk"
                      ? [4.5841, 101.083]
                      : provider === "ktn"
                        ? [3.8077, 103.326]
                        : provider === "alr"
                          ? [6.121, 100.3605]
                          : provider === "kgr"
                            ? [6.4414, 100.1986]
                            : provider === "ktb"
                              ? [6.1293, 102.2399]
                              : provider === "trg"
                                ? [5.3302, 103.1408]
                                : provider === "sw"
                                  ? [1.55, 110.333]
                                  : [5.4164, 100.3327]
        }
        zoom={
          provider === "rkl" ||
          provider === "ns" ||
          provider === "jb" ||
          provider === "pk" ||
          provider === "alr" ||
          provider === "ktn" ||
          provider === "ktb" ||
          provider === "trg" ||
          provider === "sw"
            ? 12.5
            : 13.5
        }
        scrollWheelZoom={true}
        className="w-full h-dvh"
      >
        {isMobile && (
          <DrawerMobile
            markerRefs={markerRefs}
            setDirection={setDirection}
            direction={direction}
            route={route}
          />
        )}
        {!isMobile && (
          <AppSidebar
            setPositions={setPositions}
            setRailVisible={setRailVisible}
            railVisible={railVisible}
            trafficVisible={trafficVisible}
            setTrafficVisible={setTrafficVisible}
          />
        )}

        <TrafficLayer visible={trafficVisible} positions={positions} />

        {/* Keep rail geometry beneath the selected bus route and vehicles. */}
        {provider === "rkl" && railVisible && <RailLinesLayer />}

        {positions.length !== 0 && (
          <FitBoundsToPolyline
            route={route}
            provider={provider}
            direction={direction}
            positions={positions}
            markerRefs={markerRefs}
            setDirection={setDirection}
            color={
              provider === "rkl" &&
              route?.route_short_name === route?.directions[0].route_long_name
                ? "#28ab78"
                : route?.route_id === "B1000"
                  ? "#115740"
                  : provider !== "rkl" && provider !== "rp"
                    ? "#e74e9f"
                    : "#78BFF5"
            }
          />
        )}
        {highlightStopId && (
          <HighlightStop
            highlightStopId={highlightStopId}
            route={route}
            direction={direction}
            positions={positions}
            markerRefs={markerRefs}
          />
        )}
        <VehiclesMarker
          key={provider}
          positions={positionsDirection === direction ? positions : []}
          direction={direction}
          route={route}
        />
        {provider === "rkl" && railVisible && (
          <>
            {RapidRailRoutesWithShapesID.map((route) => (
              <RailStopsMarkers key={route.route_id} route={route} />
            ))}
          </>
        )}

        <CustomZoomControls />
        <Card className="absolute overflow-hidden p-0 w-10 h-10 flex justify-center items-center gap-0 top-[150px] mr-px right-3.75 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
          {/* <ModeToggle /> */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="icon"
                style={{
                  touchAction: "none",
                }}
                className="rounded-none"
                variant={"ghost"}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Settings className="text-sm" />
              </Button>
            </DialogTrigger>
            <DialogContent className="z-1003 backdrop-blur-lg border border-b-0 border-x-0 dark:border-neutral-500 bg-white/50 dark:bg-white/20 rounded-[10px] outline-none">
              <DialogHeader>
                <DialogTitle className="text-left">Settings</DialogTitle>
              </DialogHeader>
              <div className="flex items-center">
                <div className="flex-1">
                  <h1 className="text-neutral-800 dark:text-neutral-100">
                    Theme
                  </h1>
                </div>
                <ModeToggle variant="outline" size="icon" />
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <h1 className="text-neutral-800 dark:text-neutral-100">
                    Region
                  </h1>
                </div>
                <Select
                  onValueChange={(value) => {
                    setProvider(value);
                    setPositions([]);
                    setBusSchedule(null);
                    localStorage.setItem("provider", value);
                    window.history.replaceState(
                      {},
                      "",
                      window.location.pathname,
                    );
                    window.location.reload();
                  }}
                  value={provider}
                >
                  <SelectTrigger className="bg-white text-base">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent className="z-1006 border-0 backdrop-blur-lg bg-white/50 dark:bg-white/10">
                    <SelectItem value="rp">Penang</SelectItem>
                    <SelectItem value="rkl">Selangor/KL</SelectItem>
                    <SelectItem value="ns">Seremban</SelectItem>
                    <SelectItem value="mk">Melaka</SelectItem>
                    <SelectItem value="jb">Johor Bahru</SelectItem>
                    <SelectItem value="pk">Ipoh</SelectItem>
                    {/* <SelectItem value="ktn">Kuantan</SelectItem> */}
                    <SelectItem value="alr">Alor Setar</SelectItem>
                    <SelectItem value="kgr">Kangar</SelectItem>
                    <SelectItem value="ktb">Kota Bharu</SelectItem>
                    <SelectItem value="trg">Kuala Terengganu</SelectItem>
                    <SelectItem value="sw">Kuching</SelectItem>
                    {/* <SelectItem value="ktmb">KTMB</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <h1 className="text-neutral-800 dark:text-neutral-100">
                    Traffic Jam Indicator
                  </h1>
                </div>
                <Switch
                  className="data-[state=checked]:bg-neutral-800!"
                  checked={trafficVisible}
                  onCheckedChange={(checked) => {
                    setTrafficVisible(checked);
                    localStorage.setItem("trafficVisible", checked.toString());
                  }}
                />
              </div>
              {provider === "rkl" && (
                <div className="flex items-center">
                  <div className="flex-1">
                    <h1 className="text-neutral-800 dark:text-neutral-100">
                      Show Rails
                    </h1>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-neutral-800!"
                    checked={railVisible}
                    onCheckedChange={(checked) => {
                      setRailVisible(checked);
                      localStorage.setItem("railVisible", checked.toString());
                    }}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </Card>
        <UserLocation />
        <FlyToRoute
          positions={positions}
          isMobile={isMobile}
          routeId={routeId ?? null}
          highlightStopId={highlightStopId}
        />
        {!isMobile && route && (
          <>
            <StopsCard
              route={route}
              provider={provider}
              direction={direction}
              setDirection={setDirection}
              BusSchedule={BusSchedule}
              markerRefs={markerRefs}
            />
            <Card className="absolute z-500 pointer-events-none top-4 left-1/2 -translate-x-1/2 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-2xl shadow-md text-lg font-semibold">
              <div className="flex justify-between items-center gap-4">
                <div
                  className={`text-2xl font-bold border-2 p-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : route.route_id === "B1000" ? "bg-[#115740] border-none" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-xl`}
                >
                  {route?.route_short_name}
                </div>

                <div>
                  <h4 className="font-semibold">
                    {route.directions?.find((d) => d.direction_id === direction)
                      ?.route_long_name || ""}
                  </h4>
                </div>
                <div
                  className={`text-2xl font-bold border-2 p-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : route.route_id === "B1000" ? "bg-[#115740] border-none" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-xl`}
                >
                  {route?.route_short_name}
                </div>
              </div>
            </Card>
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default App;

type RailRoute = (typeof RapidRailRoutesWithShapesID)[number];

// All rail lines share ONE GeoJSON source and ONE line layer with a
// data-driven color. Computed once at module scope so the data identity is
// stable for the lifetime of the app (no setData re-parses ever).
const RAIL_LINES_DATA = {
  type: "FeatureCollection" as const,
  features: RapidRailRoutesWithShapesID.flatMap((route) => {
    return route.shape_ids.flatMap((shapeId) => {
      const shape = RapidRailShapes.features.find(
        (feature) => shapeId === feature.properties.shape_id,
      );
      // These exported shapes store [latitude, longitude], while GeoJSON and
      // MapLibre require [longitude, latitude].
      const coordinates =
        shape?.geometry.coordinates.map(
          ([lat, lon]) => [lon, lat] as [number, number],
        ) ?? [];
      if (coordinates.length < 2) return [];
      return [
        {
          type: "Feature" as const,
          properties: { color: "#" + route.route_color },
          geometry: { type: "LineString" as const, coordinates },
        },
      ];
    });
  }),
};

function RailLinesLayer() {
  return (
    <Source id="rapid-rail-lines" type="geojson" data={RAIL_LINES_DATA}>
      <Layer
        id="rapid-rail-line-layer"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": ["get", "color"] as unknown as string,
          "line-width": 7,
          "line-opacity": 0.5,
        }}
      />
    </Source>
  );
}

function RailStopsMarkers({ route }: { route: RailRoute }) {
  return (
    <>
      {RapidRailRoutesWithStops.find(
        (r) => r.route_id === route.route_id,
      )?.directions[0]?.stops.map((stop) => (
        <CircleMarker
          key={stop.stop_id}
          radius={6}
          center={[stop.lat, stop.lon]}
          pathOptions={{
            fillColor: "white",
            color: "#" + route.route_color,
            fillOpacity: 0.8,
          }}
        >
          <Popup
            className="pointer-events-none"
            maxWidth={500}
            offset={[0, 8]}
            closeButton={false}
          >
            <div className="border inline-flex gap-2 border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-center">
              <span
                className={`inline-block font-bold rounded-md px-1.5 ${route.route_code === "PYL" && "text-black"}`}
                style={{
                  backgroundColor: `#${route.route_color}`,
                }}
              >
                {route.route_code}
              </span>
              {stop.stop_name.trim()}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function matchActiveDirection(
  directions: RouteDirection[],
  provider: string,
  direction: number,
) {
  return directions.find((d) => {
    if (provider === "mk") {
      const today = new Date().getDay();
      if (today !== 5 && today !== 6 && today !== 0) {
        return (
          (d.direction_id === direction && d.service_ids?.includes("ALLDAY")) ||
          (d.direction_id === direction && d.service_ids?.includes("MONTHURS"))
        );
      } else {
        return (
          (d.direction_id === direction && d.service_ids?.includes("ALLDAY")) ||
          (d.direction_id === direction && d.service_ids?.includes("FRISUN"))
        );
      }
    } else {
      return d.direction_id === direction;
    }
  });
}

/**
 * Flies the map to the highlighted stop (from stop-name search) and opens
 * its popup once the markers have been rendered.
 */
function HighlightStop({
  highlightStopId,
  route,
  direction,
  positions,
  markerRefs,
}: {
  highlightStopId: string;
  route: RouteInfo | undefined;
  direction: number;
  positions: LatLngExpression[][];
  markerRefs: React.RefObject<{ [key: string]: CircleMarkerRef | null }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!highlightStopId || !route) return;

    const currentDir = route.directions.find(
      (d) => d.direction_id === direction,
    );
    const stopObj = currentDir?.stops.find(
      (s) => s.stop_id === highlightStopId,
    );

    if (stopObj) {
      map.flyTo([stopObj.lat, stopObj.lon], 16, { animate: true });
    }

    const openMarkerPopup = () => {
      const marker = markerRefs.current[highlightStopId];
      if (marker) {
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
        return true;
      }
      return false;
    };

    if (!openMarkerPopup()) {
      const timer = setTimeout(openMarkerPopup, 300);
      const timer2 = setTimeout(openMarkerPopup, 800);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [map, highlightStopId, route, direction, positions, markerRefs]);
  return null;
}

function CustomZoomControls() {
  const map = useMap();

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();

  return (
    <Card
      onMouseEnter={() => {
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
      }}
      onMouseLeave={() => {
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
      }}
      className="absolute overflow-hidden w-10 h-20 p-0 gap-0 top-4 right-4 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold"
    >
      <Button
        style={{
          touchAction: "none",
        }}
        className="flex h-1/2 w-full items-center justify-center rounded-none p-0"
        variant={"ghost"}
        onClick={(e) => {
          e.stopPropagation();
          zoomIn();
        }}
      >
        <Plus />
      </Button>
      <Button
        style={{
          touchAction: "none",
        }}
        className="flex h-1/2 w-full items-center justify-center rounded-none p-0"
        variant={"ghost"}
        onClick={(e) => {
          e.stopPropagation();
          zoomOut();
        }}
      >
        <Minus />
      </Button>
    </Card>
  );
}

function StopsCard({
  route,
  provider,
  direction,
  setDirection,
  BusSchedule,
  markerRefs,
}: {
  route: RouteInfo;
  provider: string;
  direction: number;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  BusSchedule: BusScheduleType | null;
  markerRefs: React.RefObject<{ [key: string]: CircleMarkerRef | null }>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingDirectionChange, setPendingDirectionChange] = useState(false);
  const map = useMap();
  const starredRoutes = useStarredRoutes();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pendingDirectionChange || searchParams.has("stopId")) return;

    setDirection((prev) => (prev === 1 ? 0 : 1));
    setPendingDirectionChange(false);
  }, [pendingDirectionChange, searchParams, setDirection]);
  if (route)
    return (
      <Card
        onMouseEnter={() => {
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.dragging.disable();
        }}
        onMouseLeave={() => {
          map.doubleClickZoom.enable();
          map.scrollWheelZoom.enable();
          map.dragging.enable();
        }}
        className="absolute z-1000 py-0 overflow-hidden gap-0 w-1/5 scroll-smooth bottom-10 backdrop-blur-lg border-white dark:border-neutral-500 bg-white/50 dark:bg-white/10 right-4  shadow-md h-1/2 "
      >
        <div className="flex justify-between w-full items-center px-6 pt-6 pb-1">
          <div
            className={`px-2 h-6 font-semibold flex justify-center items-center text-sm border-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : route.route_id === "B1000" ? "bg-[#115740] border-none" : provider !== "rkl" && provider !== "rp" ? "border-[#e74e9f]" : "border-red-500"} rounded-lg text-black dark:text-white`}
          >
            {route?.route_short_name}
          </div>
          <div className="flex items-center gap-3">
            <Star
              fill={
                starredRoutes.starred.includes(route.route_id || "")
                  ? "oklch(79.5% 0.184 86.047)"
                  : "none"
              }
              onClick={() => starredRoutes.toggle(route.route_id || "")}
              className={`w-4 h-4 cursor-pointer ${
                starredRoutes.starred.includes(route.route_id || "") &&
                "text-yellow-500 "
              }`}
            />
            <Link
              onClick={() => {
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                map.dragging.enable();
              }}
              to={"/"}
            >
              <X className="w-5 h-5 outline-none text-black dark:text-white" />
            </Link>
          </div>
        </div>

        <CardTitle className="space-y-2 px-6 pb-6">
          <div className="flex justify-between items-center gap-2">
            <h4 className="font-semibold text-balance text-xl">
              {
                matchActiveDirection(route.directions, provider, direction)
                  ?.route_long_name
              }
            </h4>
          </div>

          {route?.directions.length >= 2 && (
            <Button
              variant={"outline"}
              className="bg-white w-full"
              onClick={() => {
                Object.values(markerRefs.current).forEach((marker) => {
                  if (marker?.isPopupOpen()) {
                    marker.closePopup();
                  }
                });
                if (searchParams.has("stopId")) {
                  const params = new URLSearchParams(searchParams);
                  params.delete("stopId");
                  setSearchParams(params, { replace: true });
                  setPendingDirectionChange(true);
                } else {
                  setDirection((prev) => {
                    return prev === 1 ? 0 : 1;
                  });
                }
              }}
            >
              Change Direction
            </Button>
          )}
        </CardTitle>

        <div className="mt-2 ml-2 overflow-y-auto h-full overflow-x-clip ">
          {matchActiveDirection(
            route.directions,
            provider,
            direction,
          )?.stops.map((stop, idx) => (
            <div
              key={stop.stop_id + idx}
              className={`${idx === 0 && "mt-2"} flex relative w-full`}
            >
              {/* Bullet */}
              <div className="flex w-3 flex-col items-center mr-1">
                <div
                  className={`w-3 h-3 absolute rounded-full ${
                    provider === "rkl" &&
                    route.directions[0].route_long_name ===
                      route.route_short_name
                      ? "bg-[#219166]"
                      : route.route_id === "B1000"
                        ? "bg-[#115740]"
                        : provider !== "rkl" && provider !== "rp"
                          ? "bg-pink-400"
                          : "bg-[#78BFF5]"
                  } z-10`}
                ></div>
                {/* Vertical line */}
                {idx <
                  (matchActiveDirection(route.directions, provider, direction)
                    ?.stops.length ?? 0) -
                    1 && (
                  <div
                    className={`h-full w-1 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : route.route_id === "B1000" ? "bg-[#115740]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-[#87CEFA]"}`}
                  ></div>
                )}
              </div>
              {/* Stop Name */}
              <div className="w-full">
                <Button
                  variant={"ghost"}
                  onClick={() => {
                    const marker = markerRefs.current[stop.stop_id];
                    if (marker) {
                      if (!marker.isPopupOpen()) {
                        marker.openPopup();
                      }

                      map.flyTo([stop.lat, stop.lon], 16, {
                        animate: true,
                      });

                      const params = new URLSearchParams(searchParams);
                      params.set("stopId", stop.stop_id);
                      setSearchParams(params, { replace: true });
                    }
                  }}
                  className="cursor-pointer m-2 !hover:bg-transparent text-sm font-medium rounded-none mx-1 -mt-4 justify-start w-full text-left whitespace-normal wrap-break-words"
                >
                  <p>{stop.stop_name.trim()}</p>
                </Button>
                {idx === 0 &&
                  BusSchedule &&
                  BusSchedule.find(
                    (s) =>
                      s.r === route.route_id &&
                      s.d === direction &&
                      s.dt === getCurrentDate(),
                  )?.t &&
                  provider !== "rkl" && (
                    <Collapsible className="px-6 mb-4">
                      <CollapsibleTrigger asChild>
                        <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                          Next bus will depart at{" "}
                          {nextBusTime(
                            BusSchedule.find(
                              (s) =>
                                s.r === route.route_id &&
                                s.d === direction &&
                                s.dt === getCurrentDate(),
                            )?.t || [],
                            currentTime,
                          )}
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2">Scheduled</div>
                        <div className="grid grid-cols-6 self-center ">
                          {BusSchedule.find(
                            (s) =>
                              s.r === route.route_id &&
                              s.d === direction &&
                              s.dt === getCurrentDate(),
                          )?.t.map((time, idx) => (
                            <div
                              key={idx}
                              className={`${
                                hasCurrentTimePassed(time)
                                  ? "dark:text-neutral-500 text-neutral-400"
                                  : "dark:text-white text-black"
                              } px-2`}
                            >
                              {time.substring(0, 5)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                {idx === 0 &&
                  BusSchedule &&
                  provider === "rkl" &&
                  BusSchedule.length > 0 &&
                  nextBusTime(
                    BusSchedule.find(
                      (s) =>
                        s.r === route.route_id &&
                        s.d === direction &&
                        s.dt === getCurrentDate(),
                    )?.t || [],
                    currentTime,
                  ) && (
                    <Collapsible className="px-6 mb-4">
                      <CollapsibleTrigger asChild>
                        <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                          Next bus will depart at{" "}
                          {nextBusTime(
                            BusSchedule.find(
                              (s) =>
                                s.r === route.route_id &&
                                s.d === direction &&
                                s.dt === getCurrentDate(),
                            )?.t || [],
                            currentTime,
                          )}
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2">Scheduled</div>
                        <div className="grid grid-cols-6 self-center ">
                          {BusSchedule.find(
                            (s) =>
                              s.r === route.route_id &&
                              s.d === direction &&
                              s.dt === getCurrentDate(),
                          )?.t.map((time, idx) => (
                            <div
                              key={idx}
                              className={`${
                                hasCurrentTimePassed(time)
                                  ? "dark:text-neutral-500 text-neutral-400"
                                  : "dark:text-white text-black"
                              } px-2`}
                            >
                              {time.substring(0, 5)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  return null;
}

function FitBoundsToPolyline({
  route,
  provider,
  direction,
  positions,
  color,
  markerRefs,
  setDirection,
}: {
  route: RouteInfo | undefined;
  provider: string;
  direction: number;
  positions: LatLngExpression[][];
  color: string;
  markerRefs: React.RefObject<{ [key: string]: CircleMarkerRef | null }>;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
}) {
  const map = useMap();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleStopClick = (stop: RouteDirection["stops"][number]) => {
    map.setView([stop.lat, stop.lon], 16, { animate: true });
    const params = new URLSearchParams(searchParams);
    params.set("stopId", stop.stop_id);
    setSearchParams(params, { replace: true });
  };

  // Single-direction routes: normalize direction once after mount instead of
  // during render.
  useEffect(() => {
    if (route?.directions.length === 1) {
      setDirection(provider === "jb" || provider === "mk" ? 1 : 0);
    }
  }, [route, provider, setDirection]);

  if (route?.directions.length === 0) return null;
  if (route?.directions.length === 1) {
    return (
      <>
        <Polyline
          pathOptions={{ color: color, weight: 7 }}
          positions={positions}
        />
        {positions.length &&
          route.directions[0].stops.map((stop, idx) => (
            <CircleMarker
              ref={(ref) => {
                markerRefs.current[stop.stop_id] = ref;
              }}
              key={idx}
              radius={6}
              center={[stop.lat, stop.lon]}
              pathOptions={{
                color: color,
                fillColor: "white",
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => handleStopClick(stop),
              }}
            >
              <Popup
                className="pointer-events-none"
                maxWidth={500}
                offset={[0, 8]}
                closeButton={false}
              >
                <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-center">
                  {stop.stop_name.trim()}
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </>
    );
  }

  return (
    <>
      <Polyline
        pathOptions={{
          color:
            provider !== "rkl" && provider !== "rp"
              ? lighterHex(color, 40)
              : color,
          weight: 7,
        }}
        positions={positions}
      />
      {matchActiveDirection(route?.directions ?? [], provider, direction)?.stops
        .length &&
        positions.length &&
        matchActiveDirection(
          route?.directions ?? [],
          provider,
          direction,
        )?.stops.map((stop, idx) => (
          <CircleMarker
            ref={(ref) => {
              markerRefs.current[stop.stop_id] = ref;
            }}
            key={idx}
            radius={6}
            center={[stop.lat, stop.lon]}
            pathOptions={{
              color: darkenHex(color),
              fillColor: "white",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => handleStopClick(stop),
            }}
          >
            <Popup
              className="pointer-events-none"
              maxWidth={500}
              offset={[0, 8]}
              closeButton={false}
            >
              <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-center">
                {stop.stop_name.trim()}
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </>
  );
}

function FlyToRoute({
  positions,
  isMobile,
  routeId,
  highlightStopId,
}: {
  positions: LatLngExpression[][];
  isMobile: boolean;
  routeId: string | null;
  highlightStopId?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (highlightStopId) return;
    const bounds = fitBoundsOf(positions);
    if (!bounds) return;

    const nativeMap = map.native;
    nativeMap.resize();
    const viewportHeight = nativeMap.getContainer().clientHeight;
    const padding = isMobile
      ? {
          top: 80,
          right: 48,
          bottom: Math.round(viewportHeight * 0.34),
          left: 48,
        }
      : { top: 112, right: 400, bottom: 112, left: 240 };
    nativeMap.fitBounds(bounds.toArray(), {
      padding,
      maxZoom: 17.5,
      duration: 800,
    });
  }, [positions, isMobile, map, routeId]);

  return null;
}

function UserLocation() {
  return (
    <GeolocateControl
      position="top-right"
      positionOptions={{ enableHighAccuracy: true }}
      trackUserLocation
      showUserLocation
    />
  );
}

type PrecomputedSegment = {
  index: number;
  line: Feature<LineString>;
  startDist: number;
  endDist: number;
  startCoord: [number, number];
  endCoord: [number, number];
  midCoord: [number, number];
  segLen: number;
  bearing: number;
};

type RouteDirection = {
  direction_id: number;
  shape_id: string;
  route_long_name: string;
  service_ids?: string[];
  stops: {
    stop_id: string;
    stop_name: string;
    lat: number;
    lon: number;
  }[];
};

type RouteInfo = {
  route_id: string;
  route_short_name: string;
  directions: RouteDirection[];
};

const ICON_CACHE: Record<string, { left: DivIcon; right: DivIcon }> = {
  rp: {
    left: divIcon({
      className: "",
      html: `<img src="/rp-bus2.webp" style="width:37px;height:91px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
    right: divIcon({
      className: "",
      html: `<img src="/rp-bus.webp" style="width:37px;height:91px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
  },
  mrt: {
    left: divIcon({
      className: "",
      html: `<img src="/mrt-bus2.webp" style="width:100px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
    right: divIcon({
      className: "",
      html: `<img src="/mrt-bus.webp" style="width:100px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
  },
  rkl: {
    left: divIcon({
      className: "",
      html: `<img src="/rkl-bus2.webp" style="width:37px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
    right: divIcon({
      className: "",
      html: `<img src="/rkl-bus.webp" style="width:37px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
  },
  basmy: {
    left: divIcon({
      className: "",
      html: `<img src="/basmy-bus2.webp" style="width:100px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
    right: divIcon({
      className: "",
      html: `<img src="/basmy-bus.webp" style="width:100px;height:100px;transform-origin:center center;display:block;will-change:transform;" />`,
      iconSize: [24, 24],
      iconAnchor: [50, 50],
    }),
  },
};

function getCachedBusIcon(
  provider: string | undefined,
  bearingDeg: number,
  routeId?: string,
): DivIcon {
  const side = bearingDeg <= 0 || bearingDeg > 180 ? "left" : "right";
  if (provider === "rp") return ICON_CACHE.rp[side];
  if (provider === "rkl") {
    return routeId?.startsWith("3")
      ? ICON_CACHE.mrt[side]
      : ICON_CACHE.rkl[side];
  }
  return ICON_CACHE.basmy[side];
}

function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedBearing(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function angleDifference(first: number, second: number): number {
  return Math.abs(((first - second + 540) % 360) - 180);
}

function samplePointAtDistance(
  segments: PrecomputedSegment[],
  routeLength: number,
  targetDist: number,
  fallbackLat: number,
  fallbackLng: number,
): { lat: number; lng: number } {
  if (segments.length === 0 || routeLength <= 0) {
    return { lat: fallbackLat, lng: fallbackLng };
  }

  const clamped = Math.max(0, Math.min(routeLength, targetDist));
  let low = 0;
  let high = segments.length - 1;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (segments[mid].endDist < clamped) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const seg = segments[low];
  const segSpan = seg.endDist - seg.startDist;
  const t =
    segSpan > 0
      ? Math.max(0, Math.min(1, (clamped - seg.startDist) / segSpan))
      : 0;

  return {
    lng: seg.startCoord[0] + (seg.endCoord[0] - seg.startCoord[0]) * t,
    lat: seg.startCoord[1] + (seg.endCoord[1] - seg.startCoord[1]) * t,
  };
}

function sampleHeadingAtDistance(
  segments: PrecomputedSegment[],
  routeLength: number,
  progress: number,
  travelSign: 1 | -1,
  fallbackHeading: number,
): number {
  if (segments.length === 0 || routeLength <= 0) {
    return normalizeHeading(fallbackHeading);
  }

  const lookAhead = 8;
  let from = progress;
  let to = Math.max(
    0,
    Math.min(routeLength, progress + travelSign * lookAhead),
  );
  if (from === to) {
    from = Math.max(
      0,
      Math.min(routeLength, progress - travelSign * lookAhead),
    );
    to = progress;
  }

  const p1 = samplePointAtDistance(segments, routeLength, from, 0, 0);
  const p2 = samplePointAtDistance(segments, routeLength, to, 0, 0);
  if (p1.lat === p2.lat && p1.lng === p2.lng) {
    return normalizeHeading(fallbackHeading);
  }

  // Fast equirectangular bearing (no Turf object allocation)
  const rad = Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * rad;
  const lat1 = p1.lat * rad;
  const lat2 = p2.lat * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeHeading(Math.atan2(y, x) / rad);
}

const prefersReducedMotionQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

function AnimatedVehicleMarker({
  position,
  icon,
  heading,
  direction,
  routeLength,
  precomputedSegments,
  routeProgress,
  followsRoute,
  useRouteHeading,
  routeOrientation,
  children,
}: {
  position: { lat: number; lng: number };
  icon: DivIcon;
  heading: number;
  direction: number;
  routeLength: number;
  precomputedSegments: PrecomputedSegment[];
  routeProgress: number;
  followsRoute: boolean;
  useRouteHeading: boolean;
  routeOrientation: 1 | -1;
  children: ReactNode;
}) {
  const animationDuration = 1500;
  const markerRef = useRef<{
    getLatLng: () => { lat: number; lng: number };
    setLatLng: (position: [number, number]) => void;
    getElement: () => HTMLElement | undefined;
  } | null>(null);

  const markerPositionRef = useRef(position);
  const cachedImgRef = useRef<HTMLImageElement | null>(null);
  const previousHeadingRef = useRef(normalizeHeading(heading));
  const previousPositionDirectionRef = useRef(direction);
  const previousHeadingDirectionRef = useRef(direction);
  const currentRouteProgressRef = useRef(routeProgress);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const getImageElement = (): HTMLImageElement | null => {
      if (cachedImgRef.current && cachedImgRef.current.isConnected) {
        return cachedImgRef.current;
      }
      const img =
        (marker
          .getElement()
          ?.querySelector("img") as HTMLImageElement | null) ?? null;
      cachedImgRef.current = img;
      return img;
    };

    const applyHeading = (value: number) => {
      const image = getImageElement();
      if (!image) return;
      const normalized = normalizeHeading(value);
      // Only write the transition reset once: writing it every animation
      // frame re-invalidates the element style needlessly.
      if (image.style.transition !== "none") {
        image.style.transition = "none";
      }
      image.style.transform = `rotate(${normalized}deg)`;
      previousHeadingRef.current = normalized;
    };

    const target = { lat: position.lat, lng: position.lng };
    const applyCurrentHeading = () => {
      applyHeading(
        followsRoute && useRouteHeading
          ? sampleHeadingAtDistance(
              precomputedSegments,
              routeLength,
              routeProgress,
              routeOrientation,
              heading,
            )
          : heading,
      );
    };

    if (previousPositionDirectionRef.current !== direction) {
      previousPositionDirectionRef.current = direction;
      currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      marker.setLatLng([target.lat, target.lng]);
      applyCurrentHeading();
      return;
    }

    const start = marker.getLatLng();
    if (!followsRoute) currentRouteProgressRef.current = routeProgress;
    const startProgress = currentRouteProgressRef.current;

    const isPositionNoise = followsRoute
      ? Math.abs(routeProgress - startProgress) < 8
      : distance(
          point([start.lng, start.lat]),
          point([target.lng, target.lat]),
          { units: "meters" },
        ) < 4;

    if (isPositionNoise) {
      if (followsRoute) applyCurrentHeading();
      return;
    }

    if (start.lat === target.lat && start.lng === target.lng) {
      if (followsRoute) currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      if (followsRoute) applyCurrentHeading();
      return;
    }

    const MAX_ROUTE_ANIMATION_DISTANCE_METERS = 500;
    if (
      (followsRoute &&
        Math.abs(routeProgress - startProgress) >
          MAX_ROUTE_ANIMATION_DISTANCE_METERS) ||
      prefersReducedMotionQuery?.matches
    ) {
      if (followsRoute) currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      marker.setLatLng([target.lat, target.lng]);
      applyCurrentHeading();
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / animationDuration, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);

      let nextPosition = {
        lat: start.lat + (target.lat - start.lat) * easedProgress,
        lng: start.lng + (target.lng - start.lng) * easedProgress,
      };

      if (followsRoute) {
        const currentProgress =
          startProgress + (routeProgress - startProgress) * easedProgress;
        currentRouteProgressRef.current = currentProgress;

        nextPosition = samplePointAtDistance(
          precomputedSegments,
          routeLength,
          currentProgress,
          nextPosition.lat,
          nextPosition.lng,
        );
        const nextHeading = useRouteHeading
          ? sampleHeadingAtDistance(
              precomputedSegments,
              routeLength,
              currentProgress,
              routeOrientation,
              heading,
            )
          : heading;
        applyHeading(nextHeading);
      }

      if (progress === 1) nextPosition = target;
      markerPositionRef.current = nextPosition;
      marker.setLatLng([nextPosition.lat, nextPosition.lng]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else if (followsRoute) {
        currentRouteProgressRef.current = routeProgress;
        applyCurrentHeading();
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [
    animationDuration,
    direction,
    followsRoute,
    heading,
    useRouteHeading,
    position.lat,
    position.lng,
    precomputedSegments,
    routeLength,
    routeOrientation,
    routeProgress,
  ]);

  useEffect(() => {
    if (followsRoute) return;
    const image =
      cachedImgRef.current && cachedImgRef.current.isConnected
        ? cachedImgRef.current
        : ((markerRef.current
            ?.getElement()
            ?.querySelector("img") as HTMLImageElement | null) ?? null);
    if (!image) return;
    cachedImgRef.current = image;

    const targetHeading = normalizeHeading(heading);

    if (previousHeadingDirectionRef.current !== direction) {
      previousHeadingDirectionRef.current = direction;
      previousHeadingRef.current = targetHeading;
      image.style.transition = "none";
      image.style.transform = `rotate(${targetHeading}deg)`;
      return;
    }

    const previousHeading = normalizeHeading(previousHeadingRef.current);
    const delta = ((targetHeading - previousHeading + 540) % 360) - 180;

    if (Math.abs(delta) < 0.5 || prefersReducedMotionQuery?.matches) {
      image.style.transition = "none";
      image.style.transform = `rotate(${targetHeading}deg)`;
      previousHeadingRef.current = targetHeading;
      return;
    }

    const nextHeading = previousHeadingRef.current + delta;
    image.style.transition = `transform ${animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    image.style.transform = `rotate(${nextHeading}deg)`;
    previousHeadingRef.current = nextHeading;
  }, [animationDuration, direction, followsRoute, heading]);

  return (
    <Marker
      ref={markerRef}
      position={markerPositionRef.current}
      icon={icon}
      imperativePosition
    >
      {children}
    </Marker>
  );
}

const SingleVehicleItem = memo(function SingleVehicleItem({
  vehicle,
  busKey,
  provider,
  route,
  direction,
  line,
  routeLength,
  routeOrientation,
  isClosedRoute,
  firstStopPoint,
  precomputedSegments,
  departureTime,
  routeSnapState,
  vehicleRouteProgress,
}: {
  vehicle: IVehiclePosition;
  busKey: string;
  provider: string | undefined;
  route: RouteInfo | undefined;
  direction: number;
  line: Feature<LineString>;
  routeLength: number;
  routeOrientation: 1 | -1;
  isClosedRoute: boolean;
  firstStopPoint: Feature<GeoJSON.Point> | null;
  precomputedSegments: PrecomputedSegment[];
  departureTime: string;
  routeSnapState: Map<string, boolean>;
  vehicleRouteProgress: Map<string, number>;
}) {
  const lat = vehicle.position?.latitude;
  const lng = vehicle.position?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const busPoint = point([lng, lat]);
  const hasLiveBearing =
    (provider === "rp" || provider === "rkl") &&
    typeof vehicle.position?.bearing === "number" &&
    Number.isFinite(vehicle.position.bearing);

  const snapped = nearestPointOnLine(line, busPoint, { units: "meters" });

  if (hasLiveBearing && precomputedSegments.length > 0) {
    const nearestDistance = snapped.properties.pointDistance;
    const threshold = nearestDistance + 15;
    // Cheap equirectangular lower bound on the bus-to-segment distance lets
    // us skip distant segments before paying for nearestPointOnLine.
    const rad = Math.PI / 180;
    const kx = Math.cos(lat * rad) * 111320;
    const ky = 110574;
    let bestCandidate: {
      point: typeof snapped;
      progress: number;
      distance: number;
      score: number;
      index: number;
    } | null = null;

    for (const seg of precomputedSegments) {
      const dx = (seg.midCoord[0] - lng) * kx;
      const dy = (seg.midCoord[1] - lat) * ky;
      if (Math.hypot(dx, dy) - seg.segLen > threshold) continue;

      const candidate = nearestPointOnLine(seg.line, busPoint, {
        units: "meters",
      });
      if (candidate.properties.pointDistance <= nearestDistance + 15) {
        const candidateProgress =
          seg.startDist + candidate.properties.totalDistance;
        const angleError = angleDifference(
          seg.bearing,
          vehicle.position!.bearing!,
        );
        const score = angleError * 4 + candidate.properties.pointDistance * 0.5;
        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = {
            point: candidate,
            progress: candidateProgress,
            distance: candidate.properties.pointDistance,
            score,
            index: seg.index,
          };
        }
      }
    }

    if (bestCandidate) {
      snapped.geometry = bestCandidate.point.geometry;
      snapped.properties.totalDistance = bestCandidate.progress;
      snapped.properties.segmentIndex = bestCandidate.index;
      snapped.properties.pointDistance = bestCandidate.distance;
    }
  }

  const MAX_OFF_ROUTE_DISTANCE = 200;
  if (snapped.properties.pointDistance > MAX_OFF_ROUTE_DISTANCE) {
    return null;
  }

  let routeProgress = snapped.properties.totalDistance;
  if (
    isClosedRoute &&
    firstStopPoint &&
    distance(busPoint, firstStopPoint, { units: "meters" }) < 25 &&
    (routeProgress < 100 || routeProgress > routeLength - 100)
  ) {
    const previousProgress = vehicleRouteProgress.get(busKey);
    routeProgress =
      previousProgress !== undefined && previousProgress > routeLength / 2
        ? routeLength
        : 0;
  }
  vehicleRouteProgress.set(busKey, routeProgress);

  const wasSnappedToRoute = routeSnapState.get(busKey) ?? false;
  const snapDistance = wasSnappedToRoute ? 25 : 10;
  const isOffRoute = snapped.properties.pointDistance > snapDistance;
  routeSnapState.set(busKey, !isOffRoute);

  const coords = line.geometry.coordinates;
  const segIdx = Math.min(snapped.properties.segmentIndex, coords.length - 2);
  const start = coords[segIdx];
  const end = coords[segIdx + 1];
  const routeHeading = start && end ? bearing(point(start), point(end)) : 0;
  const liveBearing = hasLiveBearing
    ? normalizeHeading(vehicle.position!.bearing!)
    : null;
  // Use the live bearing to resolve which direction the bus is travelling on
  // a route whose shape may be shared by both directions.
  const vehicleRouteOrientation: 1 | -1 =
    (provider === "rp" || provider === "rkl") && liveBearing !== null
      ? angleDifference(routeHeading, liveBearing) <=
        angleDifference((routeHeading + 180) % 360, liveBearing)
        ? 1
        : -1
      : routeOrientation;
  const heading = hasLiveBearing
    ? normalizeSignedBearing(vehicle.position!.bearing!)
    : vehicleRouteOrientation === 1
      ? routeHeading
      : (routeHeading + 180) % 360;

  const icon = getCachedBusIcon(provider, heading, route?.route_id);
  const markerPosition = {
    lat: isOffRoute ? lat : snapped.geometry.coordinates[1] || 0,
    lng: isOffRoute ? lng : snapped.geometry.coordinates[0] || 0,
  };

  return (
    <AnimatedVehicleMarker
      position={markerPosition}
      heading={heading}
      direction={direction}
      routeLength={routeLength}
      precomputedSegments={precomputedSegments}
      routeProgress={routeProgress}
      followsRoute={!isOffRoute}
      // Live bearings can lag at turns. Keep Rapid KL and Penang markers
      // aligned to the matched route segment while they move along it.
      useRouteHeading={
        provider === "rp" || provider === "rkl" || !hasLiveBearing
      }
      routeOrientation={vehicleRouteOrientation}
      icon={icon}
    >
      <Popup maxWidth={500} offset={[0, 8]} closeButton={false}>
        <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
          <p className="text-lg font-semibold">
            {vehicle.vehicle?.licensePlate}
          </p>
          <p className="mt-4">
            Route:{" "}
            {provider === "rp"
              ? vehicle.trip?.routeId?.replace(".", "")
              : route?.route_short_name}
          </p>
          {(provider === "rp" || provider === "rkl") && (
            <p>Speed: {vehicle.position?.speed?.toFixed(0)}km/h</p>
          )}
          {departureTime && <p>Departure: {departureTime.substring(0, 5)}</p>}
          {provider === "rp" &&
            vehicle.trip?.routeId === "T310" &&
            lat >= 5.353 && (
              <p>
                {"Heading: "}
                {findT310Heading(departureTime)
                  ? "Queensbay Mall"
                  : "Padang Kawad"}
              </p>
            )}
        </div>
      </Popup>
    </AnimatedVehicleMarker>
  );
});

export function VehiclesMarker({
  direction,
  route,
  positions,
}: {
  direction: number;
  positions: LatLngExpression[][];
  route: RouteInfo | undefined;
}) {
  const [vehicles, setVehicles] = useState<Map<string, IVehiclePosition>>(
    () => new Map(),
  );
  const [provider, setProvider] = useState<string | undefined>();
  const [BusSchedule, setBusSchedule] =
    useState<BusScheduleType>(RapidPenangSchedule);

  useEffect(() => {
    const userProvider = localStorage.getItem("provider");
    setProvider(userProvider || "rp");

    if (userProvider === "rkl") {
      setBusSchedule([
        ...RapidKLSchedule,
        ...MRTFeederSchedule,
      ] as unknown as BusScheduleType);
    } else if (userProvider === "ns") {
      setBusSchedule([
        ...MYBasNSASchedule,
        ...MYBasNSBSchedule,
      ] as unknown as BusScheduleType);
    } else if (userProvider === "mk") {
      setBusSchedule(MyBasMkSchedule);
    } else if (userProvider === "jb") {
      setBusSchedule(MyBasJbSchedule);
    } else if (userProvider === "pk") {
      setBusSchedule(MyBasPkSchedule);
    } else if (userProvider === "ktn") {
      setBusSchedule(MyBasKtnSchedule);
    } else if (userProvider === "alr") {
      setBusSchedule(MyBasAlrSchedule);
    } else if (userProvider === "kgr") {
      setBusSchedule(MyBasKgrSchedule);
    } else if (userProvider === "ktb") {
      setBusSchedule(MyBasKtbSchedule);
    } else if (userProvider === "trg") {
      setBusSchedule(MyBasTrgSchedule);
    } else if (userProvider === "sw") {
      setBusSchedule(MyBasSwSchedule);
    }
  }, []);

  const vehiclesByDirection = useMemo(
    () =>
      deriveVehicleDirectionBuckets({
        vehicles: vehicles.values(),
        provider,
        routeId: route?.route_id,
        routeDirectionCount: route?.directions.length,
      }),
    [provider, route?.directions.length, route?.route_id, vehicles],
  );

  const routeSnapStateRef = useRef(new Map());
  const vehicleRouteProgressRef = useRef(new Map());
  const timerRef = useRef<number | null>(null);
  const fetchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (provider !== "rp" && provider !== "rkl") return;
    if (!route?.route_short_name) return;

    let routeId = route.route_short_name;
    if (provider !== "rp") {
      routeId = route.route_id.valueOf().startsWith("3")
        ? route.route_short_name + "0"
        : route.route_id;
    }

    function avlToVehicle(bus: AvlVehicle): IVehiclePosition {
      if (
        bus.is_inside_endstop === "depot" ||
        bus.is_inside_endstop === "end"
      ) {
        return {};
      }

      let directionId: number;
      if (
        bus.route === "T310" ||
        bus.route === "CAT" ||
        bus.route === "103" ||
        bus.route === "CT15"
      ) {
        directionId = rapidPenangDirectionByTripId.get(bus.trip_no) ?? 1;
      } else {
        const scheduleDirectionId = rapidPenangDirectionByTripId.get(
          bus.trip_no,
        );
        if (scheduleDirectionId !== undefined) {
          directionId = scheduleDirectionId;
        } else if (bus.dir === "01") {
          directionId = 1;
        } else {
          directionId = 0;
        }
      }

      return {
        trip: {
          tripId: bus.trip_no,
          routeId: bus.route,
          directionId,
        },
        vehicle: {
          id: bus.bus_no,
          label: bus.bus_no,
          licensePlate: bus.bus_no,
        },
        position: {
          latitude: bus.latitude,
          longitude: bus.longitude,
          bearing: bus.angle,
          speed: bus.speed,
        },
        timestamp: Math.floor(
          new Date(bus.dt_gps + " +08:00").getTime() / 1000,
        ),
      };
    }

    // Abort in-flight requests when the route changes so a stale response
    // can never repopulate vehicles for the newly selected route.
    const abortController = new AbortController();

    function fetchAvl() {
      fetch(`${AVL_API}/${routeId}`, {
        signal: abortController.signal,
      })
        .then((res) => res.json())
        .then((data: { vehicles: AvlVehicle[] }) => {
          if (abortController.signal.aborted) return;
          setVehicles((prev) => {
            const updated = new Map(prev);
            for (const bus of data.vehicles) {
              if (bus.region === "rkl" && bus.route === "B1000" && !bus.dir) {
                continue;
              }
              updated.set(bus.bus_no, avlToVehicle(bus));
            }
            return updated;
          });
        })
        .catch(() => {});
    }

    fetchAvl();
    fetchRef.current = fetchAvl;

    const channel = pusher.subscribe(`avl.route.${routeId}`);
    channel.bind("avl.data", (bus: AvlVehicle) => {
      if (bus.region === "rkl" && bus.route === "B1000" && !bus.dir) {
        return;
      }
      setVehicles((prev) => {
        const existing = prev.get(bus.bus_no);
        const nextVehicle = avlToVehicle(bus);
        if (
          existing &&
          existing.position?.latitude === nextVehicle.position?.latitude &&
          existing.position?.longitude === nextVehicle.position?.longitude &&
          existing.position?.bearing === nextVehicle.position?.bearing &&
          existing.trip?.tripId === nextVehicle.trip?.tripId
        ) {
          return prev;
        }
        const updated = new Map(prev);
        updated.set(bus.bus_no, nextVehicle);
        return updated;
      });
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchRef.current?.();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortController.abort();
      pusher.unsubscribe(`avl.route.${routeId}`);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      fetchRef.current = null;
      setVehicles(new Map());
    };
  }, [provider, route?.route_id, route?.route_short_name]);

  useEffect(() => {
    if (!provider || provider === "rp" || provider === "rkl") return;

    const PROVIDER_ENDPOINTS: Record<string, string> = {
      ns: "mybas-seremban",
      mk: "mybas-melaka",
      jb: "mybas-johor",
      pk: "mybas-ipoh",
      alr: "mybas-alor-setar",
      kgr: "mybas-kangar",
      ktb: "mybas-kota-bharu",
      trg: "mybas-kuala-terengganu",
      ktn: "prasarana?category=rapid-bus-kuantan",
      sw: "mybas-kuching",
      ktmb: "ktmb",
    };

    // Abort the polling fetch on provider change/unmount so stale vehicle
    // data is never committed after the effect has been cleaned up.
    const abortController = new AbortController();

    async function loadData() {
      const endpoint = provider ? PROVIDER_ENDPOINTS[provider] : undefined;
      if (!endpoint) return;

      try {
        const res = await fetch(
          `https://my-gtfs-api.wolfram-7b5.workers.dev/api/vehicle-position/${endpoint}`,
          { signal: abortController.signal },
        );
        const feed = res.ok
          ? transit_realtime.FeedMessage.decode(
              new Uint8Array(await res.arrayBuffer()),
            )
          : null;
        if (abortController.signal.aborted) return;

        setVehicles((prev) => {
          const now = Date.now();
          const updated = new Map(prev);

          for (const [plate, vehicle] of updated) {
            const tsNumber =
              typeof vehicle.timestamp === "object" &&
              typeof (vehicle.timestamp as any).toNumber === "function"
                ? (vehicle.timestamp as any).toNumber()
                : Number(vehicle.timestamp);
            if (!vehicle.timestamp || tsNumber * 1000 < now - 200000) {
              updated.delete(plate);
            }
          }

          if (feed) {
            for (const entity of feed.entity) {
              const vehicle = entity.vehicle;
              const plate = vehicle?.vehicle?.licensePlate;
              if (vehicle && plate) {
                updated.set(plate, vehicle);
              }
            }
          }

          return updated;
        });
      } catch {
        // ignore network errors
      }
    }

    loadData();
    fetchRef.current = loadData;

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(loadData, 10000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchRef.current?.();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortController.abort();
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      fetchRef.current = null;
      setVehicles(new Map());
    };
  }, [provider]);

  // Prune snap/progress bookkeeping for vehicles of previously selected
  // routes so these maps cannot grow unbounded across route switches.
  useEffect(() => {
    const prefix = `${route?.route_id}:`;
    for (const key of routeSnapStateRef.current.keys()) {
      if (!key.startsWith(prefix)) routeSnapStateRef.current.delete(key);
    }
    for (const key of vehicleRouteProgressRef.current.keys()) {
      if (!key.startsWith(prefix)) vehicleRouteProgressRef.current.delete(key);
    }
  }, [route?.route_id]);

  const coordsForLine = useMemo(
    () =>
      positions
        .map((pos) => {
          const p = pos as unknown as [number, number];
          return [p[1], p[0]] as [number, number];
        })
        .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    [positions],
  );

  const line = useMemo(
    () => (coordsForLine.length >= 2 ? lineString(coordsForLine) : null),
    [coordsForLine],
  );

  const routeLength = useMemo(
    () => (line ? length(line, { units: "meters" }) : 0),
    [line],
  );

  const isClosedRoute = useMemo(() => {
    if (coordsForLine.length <= 1) return false;
    return (
      distance(
        point(coordsForLine[0]),
        point(coordsForLine[coordsForLine.length - 1]),
        { units: "meters" },
      ) < 20
    );
  }, [coordsForLine]);

  const selectedDirection = useMemo(
    () =>
      route?.directions.find((item) => item.direction_id === direction) ??
      route?.directions[0],
    [direction, route?.directions],
  );

  const firstStopPoint = useMemo(() => {
    const firstStop = selectedDirection?.stops[0];
    return firstStop ? point([firstStop.lon, firstStop.lat]) : null;
  }, [selectedDirection]);

  const routeOrientation = useMemo<1 | -1>(() => {
    if (!line || coordsForLine.length < 2) return 1;
    const stops = selectedDirection?.stops;
    if (!stops || stops.length < 2) return 1;

    let firstProgress = nearestPointOnLine(
      line,
      point([stops[0].lon, stops[0].lat]),
      { units: "meters" },
    ).properties.totalDistance;

    if (isClosedRoute && firstProgress > routeLength - 100) {
      firstProgress = 0;
    }

    for (const stop of stops.slice(1)) {
      let stopProgress = nearestPointOnLine(line, point([stop.lon, stop.lat]), {
        units: "meters",
      }).properties.totalDistance;
      if (isClosedRoute && stopProgress > routeLength - 100) {
        stopProgress = 0;
      }
      const stopProgressDelta = stopProgress - firstProgress;
      if (Math.abs(stopProgressDelta) > 30) {
        return stopProgressDelta > 0 ? 1 : -1;
      }
    }
    return 1;
  }, [
    coordsForLine.length,
    isClosedRoute,
    line,
    routeLength,
    selectedDirection,
  ]);

  const precomputedSegments = useMemo<PrecomputedSegment[]>(() => {
    if (!line) return [];
    const coords = line.geometry.coordinates;
    const segments: PrecomputedSegment[] = [];
    let traversed = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const start = coords[i] as [number, number];
      const end = coords[i + 1] as [number, number];
      const segLength = distance(point(start), point(end), { units: "meters" });
      if (segLength < 0.5) continue;

      const rawBearing = bearing(point(start), point(end));
      segments.push({
        index: i,
        line: lineString([start, end]),
        startDist: traversed,
        endDist: traversed + segLength,
        startCoord: start,
        endCoord: end,
        midCoord: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
        segLen: segLength,
        bearing:
          routeOrientation === -1 ? (rawBearing + 180) % 360 : rawBearing,
      });
      traversed += segLength;
    }

    return segments;
  }, [line, routeOrientation]);

  const tripDepartureMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!route?.route_id) return map;
    const today = getCurrentDateEvenAfter12();

    for (const entry of BusSchedule) {
      if (entry.r !== route.route_id || entry.dt !== today) continue;
      entry.trip_ids.forEach((id, idx) => {
        if (entry.t[idx]) {
          map.set(id, entry.t[idx]);
        }
      });
    }
    return map;
  }, [BusSchedule, route?.route_id]);

  const activeVehicles = vehiclesByDirection[direction as 0 | 1];
  if (activeVehicles.length === 0 || !line) return null;

  return (
    <>
      {activeVehicles.map((v, idx) => {
        const plate = v.vehicle?.licensePlate ?? String(idx);
        const busKey = `${route?.route_id}:${direction}:${plate}`;
        const departureTime = v.trip?.tripId
          ? (tripDepartureMap.get(v.trip.tripId) ?? "")
          : "";

        return (
          <SingleVehicleItem
            key={plate}
            vehicle={v}
            busKey={busKey}
            provider={provider}
            route={route}
            direction={direction}
            line={line}
            routeLength={routeLength}
            routeOrientation={routeOrientation}
            isClosedRoute={isClosedRoute}
            firstStopPoint={firstStopPoint}
            precomputedSegments={precomputedSegments}
            departureTime={departureTime}
            routeSnapState={routeSnapStateRef.current}
            vehicleRouteProgress={vehicleRouteProgressRef.current}
          />
        );
      })}
    </>
  );
}
