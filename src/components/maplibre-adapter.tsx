import {
  Layer,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  Source,
  useMap as useMapLibre,
} from "@vis.gl/react-maplibre";
import type { MapRef } from "@vis.gl/react-maplibre";
import { setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

setWorkerUrl(maplibreWorkerUrl);

export type LatLngExpression = [number, number] | { lat: number; lng: number };
type Position = { lat: number; lng: number };
type Point = [number, number];
type PopupSelection = {
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
};
const PopupSelectionContext = createContext<PopupSelection | null>(null);

type MapFacade = {
  native: MapRef;
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (
    center: Point,
    zoom: number,
    options?: { duration?: number; [key: string]: unknown },
  ) => void;
  setView: (
    center: Point,
    zoom: number,
    options?: { [key: string]: unknown },
  ) => void;
  flyToBounds: (
    bounds: { toArray: () => [[number, number], [number, number]] },
    options?: { padding?: Point; duration?: number; [key: string]: unknown },
  ) => void;
  scrollWheelZoom: { enable: () => void; disable: () => void };
  doubleClickZoom: { enable: () => void; disable: () => void };
  dragging: { enable: () => void; disable: () => void };
};
function facade(native: MapRef): MapFacade {
  const map = native.getMap();
  return {
    native,
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    flyTo: ([lat, lng], zoom, options) =>
      map.flyTo({
        center: [lng, lat],
        zoom,
        duration: options?.duration ? options.duration * 1000 : undefined,
      }),
    setView: ([lat, lng], zoom) => map.easeTo({ center: [lng, lat], zoom }),
    flyToBounds: (bounds, options) => {
      const coordinates = bounds.toArray();
      if (!coordinates.flat().every(Number.isFinite)) return;
      map.fitBounds(coordinates, {
        padding: options?.padding?.[0] ?? 10,
        duration: options?.duration ? options.duration * 1000 : undefined,
      });
    },
    scrollWheelZoom: {
      enable: () => map.scrollZoom.enable(),
      disable: () => map.scrollZoom.disable(),
    },
    doubleClickZoom: {
      enable: () => map.doubleClickZoom.enable(),
      disable: () => map.doubleClickZoom.disable(),
    },
    dragging: {
      enable: () => map.dragPan.enable(),
      disable: () => map.dragPan.disable(),
    },
  };
}

export function useMap() {
  const { current } = useMapLibre();
  const ref = current;
  if (!ref) throw new Error("Map control rendered outside the MapLibre map");
  return useMemo(() => facade(ref), [ref]);
}

export function MapContainer({
  center,
  zoom,
  maxZoom,
  theme,
  id,
  className,
  children,
}: {
  center: Point;
  zoom: number;
  maxZoom?: number;
  theme: string;
  id?: string;
  className?: string;
  children: ReactNode;
  preferCanvas?: boolean;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
}) {
  const ref = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const flavor =
    theme === "dark" ||
    (theme !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  const apiKey = import.meta.env.VITE_PROTOMAPS_API_KEY as string | undefined;
  const mapStyle = apiKey
    ? `https://api.protomaps.com/styles/v5/${flavor}/en.json?key=${encodeURIComponent(apiKey)}`
    : {
        version: 8 as const,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background" as const,
            paint: { "background-color": "#f5f5f4" },
          },
        ],
      };
  useEffect(() => {
    if (!ready) return;
    const mapElement = ref.current?.getMap().getContainer();
    if (!mapElement) return;

    const positionTopRightControls = () => {
      const controls = mapElement.querySelector<HTMLElement>(
        ".maplibregl-ctrl-top-right",
      );
      controls?.style.setProperty("top", "92.5px", "important");
      controls?.style.setProperty("right", "6px", "important");
      controls?.style.setProperty("z-index", "1000", "important");
      const b = mapElement.querySelector<HTMLElement>(
        ".maplibregl-ctrl .maplibregl-ctrl-group",
      );
      b?.style.setProperty("box-shadow", "none", "important");
    };

    positionTopRightControls();
    const observer = new MutationObserver(positionTopRightControls);
    observer.observe(mapElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div id={id} className={className}>
      <MapLibreMap
        ref={ref}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{ longitude: center[1], latitude: center[0], zoom }}
        maxZoom={maxZoom}
        dragRotate={false}
        touchPitch={false}
        mapStyle={mapStyle}
        transformStyle={(_, nextStyle) => ({
          ...nextStyle,
          sprite: undefined,
          layers: nextStyle.layers.flatMap((layer) => {
            if (
              layer.type !== "symbol" ||
              !layer.layout ||
              !("icon-image" in layer.layout)
            ) {
              return [layer];
            }
            return [];
          }),
        })}
        onLoad={(event) => {
          setReady(true);
          event.target.touchZoomRotate.disableRotation();
        }}
      >
        {ready && (
          <PopupSelectionContext.Provider
            value={{ activeId: activePopupId, setActiveId: setActivePopupId }}
          >
            {children}
          </PopupSelectionContext.Provider>
        )}
      </MapLibreMap>
    </div>
  );
}

function asPosition(value: LatLngExpression): Position {
  if (Array.isArray(value)) {
    return { lat: Number(value[0]), lng: Number(value[1]) };
  }
  if (!value || typeof value !== "object") {
    return { lat: Number.NaN, lng: Number.NaN };
  }
  return { lat: Number(value.lat), lng: Number(value.lng) };
}

function isValidPosition(value: unknown): value is LatLngExpression {
  if (!Array.isArray(value) && (!value || typeof value !== "object"))
    return false;
  const { lat, lng } = asPosition(value as LatLngExpression);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function Polyline({
  positions,
  pathOptions = {},
}: {
  positions: LatLngExpression[][] | LatLngExpression[];
  pathOptions?: {
    color?: string;
    weight?: number;
    opacity?: number;
    lineCap?: string;
    lineJoin?: string;
  };
}) {
  const id = useId().replaceAll(":", "");
  const paths =
    positions.length &&
    Array.isArray(positions[0]) &&
    typeof positions[0][0] === "number"
      ? [positions as LatLngExpression[]]
      : (positions as LatLngExpression[][]);
  const features = paths
    .map((path) => path.filter(isValidPosition))
    .filter((path) => path.length > 1)
    .map((path) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: path.map((point) => {
          const p = asPosition(point);
          return [p.lng, p.lat];
        }),
      },
    }));
  const layer = {
    id: `line-${id}`,
    type: "line" as const,
    layout: {
      "line-cap": (pathOptions.lineCap as "round") ?? "round",
      "line-join": (pathOptions.lineJoin as "round") ?? "round",
    },
    paint: {
      "line-color": pathOptions.color ?? "#3388ff",
      "line-width": pathOptions.weight ?? 3,
      "line-opacity": pathOptions.opacity ?? 1,
    },
  };
  return (
    <Source
      id={`line-source-${id}`}
      type="geojson"
      data={{ type: "FeatureCollection", features }}
    >
      <Layer {...layer} />
    </Source>
  );
}

type PopupConfig = {
  children: ReactNode;
  maxWidth?: number;
  closeButton?: boolean;
  className?: string;
  offset?: [number, number];
};
export function Popup(props: PopupConfig) {
  return props.children;
}

export type CircleMarkerRef = {
  isPopupOpen: () => boolean;
  openPopup: () => void;
};
export function CircleMarker({
  center,
  radius = 6,
  pathOptions = {},
  eventHandlers,
  children,
  ref,
}: {
  center: Point;
  radius?: number;
  pathOptions?: { color?: string; fillColor?: string; fillOpacity?: number };
  eventHandlers?: { click?: () => void };
  children?: ReactNode;
  ref?: (marker: CircleMarkerRef | null) => void;
}) {
  const selection = useContext(PopupSelectionContext);
  if (!selection)
    throw new Error("Map marker rendered outside the MapLibre map");
  const id = useId();
  const open = selection.activeId === id;
  const child = Children.toArray(children).find(isValidElement);
  const config = child ? (child.props as PopupConfig) : null;
  useEffect(() => {
    ref?.({
      isPopupOpen: () => selection.activeId === id,
      openPopup: () => selection.setActiveId(id),
    });
    return () => ref?.(null);
  }, [id, ref, selection]);
  return (
    <>
      <MapLibreMarker latitude={center[0]} longitude={center[1]}>
        <button
          aria-label="Show bus stop name"
          className="map-stop-marker"
          onClick={(event) => {
            event.stopPropagation();
            eventHandlers?.click?.();
            selection.setActiveId(id);
          }}
          style={{
            width: radius * 2,
            height: radius * 2,
            borderRadius: "50%",
            border: `2px solid ${pathOptions.color ?? "#3388ff"}`,
            background: pathOptions.fillColor ?? "white",
            opacity: pathOptions.fillOpacity ?? 1,
            padding: 0,
            cursor: "pointer",
          }}
        />
      </MapLibreMarker>
      {open && config && (
        <MapLibrePopup
          latitude={center[0]}
          longitude={center[1]}
          anchor="bottom"
          offset={10}
          closeButton={config.closeButton ?? false}
          onClose={() =>
            selection.setActiveId((activeId) =>
              activeId === id ? null : activeId,
            )
          }
          maxWidth={`${config.maxWidth ?? 500}px`}
          className="map-popup"
          style={{ zIndex: 200, pointerEvents: "none" }}
        >
          {config.children}
        </MapLibrePopup>
      )}
    </>
  );
}

export function Marker({
  position,
  icon,
  children,
  ref,
  imperativePosition = false,
}: {
  position: Position;
  icon: { options?: { html?: string; className?: string } };
  children?: ReactNode;
  ref?: React.Ref<unknown>;
  imperativePosition?: boolean;
}) {
  const selection = useContext(PopupSelectionContext);
  if (!selection)
    throw new Error("Map marker rendered outside the MapLibre map");
  const id = useId();
  const open = selection.activeId === id;
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const popupRef = useRef<React.ComponentRef<typeof MapLibrePopup> | null>(
    null,
  );
  const livePosition = markerRef.current?.getLngLat();
  const popupPosition = livePosition
    ? { lat: livePosition.lat, lng: livePosition.lng }
    : position;
  const child = Children.toArray(children).find(isValidElement);
  const config = child ? (child.props as PopupConfig) : null;
  const html = icon?.options?.html ?? "";
  const markerChildren = (
    <button
      type="button"
      aria-label="Show bus information"
      className={icon?.options?.className ?? ""}
      onClick={(event) => {
        event.stopPropagation();
        selection.setActiveId(id);
      }}
      style={{
        border: 0,
        padding: 0,
        background: "transparent",
        cursor: "pointer",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
  useEffect(() => {
    if (!ref) return;
    const proxy = {
      getLatLng: () => ({
        lat: markerRef.current?.getLngLat().lat ?? position.lat,
        lng: markerRef.current?.getLngLat().lng ?? position.lng,
      }),
      setLatLng: (p: Point | Position) => {
        const next = asPosition(p as LatLngExpression);
        markerRef.current?.setLngLat([next.lng, next.lat]);
        popupRef.current?.setLngLat([next.lng, next.lat]);
      },
      getElement: () => markerRef.current?.getElement(),
      isPopupOpen: () => selection.activeId === id,
      openPopup: () => selection.setActiveId(id),
    };
    if (typeof ref === "function") ref(proxy);
    else (ref as React.RefObject<unknown>).current = proxy;
  }, [id, position.lat, position.lng, ref, selection]);
  return (
    <>
      <MapLibreMarker
        ref={markerRef}
        latitude={
          imperativePosition
            ? (livePosition?.lat ?? position.lat)
            : position.lat
        }
        longitude={
          imperativePosition
            ? (livePosition?.lng ?? position.lng)
            : position.lng
        }
        anchor="center"
        style={{ zIndex: 100 }}
      >
        {markerChildren}
      </MapLibreMarker>
      {open && config && (
        <MapLibrePopup
          ref={popupRef}
          latitude={popupPosition.lat}
          longitude={popupPosition.lng}
          anchor="bottom"
          offset={10}
          closeButton={config.closeButton ?? false}
          onClose={() =>
            selection.setActiveId((activeId) =>
              activeId === id ? null : activeId,
            )
          }
          maxWidth={`${config.maxWidth ?? 500}px`}
          className="map-popup"
          style={{ zIndex: 200, pointerEvents: "none" }}
        >
          {config.children}
        </MapLibrePopup>
      )}
    </>
  );
}

export function divIcon(
  options: {
    html?: string;
    className?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
  } = {},
) {
  return { options };
}

export function fitBoundsOf(positions: LatLngExpression[][]) {
  const points: [number, number][] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      const isCoordinate =
        value.length >= 2 &&
        !Array.isArray(value[0]) &&
        !Array.isArray(value[1]) &&
        typeof value[0] !== "object" &&
        typeof value[1] !== "object";
      if (isCoordinate && isValidPosition(value)) {
        const { lat, lng } = asPosition(value);
        points.push([lng, lat]);
        return;
      }
      value.forEach(visit);
      return;
    }

    if (isValidPosition(value)) {
      const { lat, lng } = asPosition(value);
      points.push([lng, lat]);
    }
  };
  visit(positions);
  if (!points.length) return null;
  const minX = Math.min(...points.map((p) => p[0]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  const maxY = Math.max(...points.map((p) => p[1]));
  return {
    toArray: () =>
      [
        [minX, minY],
        [maxX, maxY],
      ] as [[number, number], [number, number]],
  };
}

export type DivIcon = ReturnType<typeof divIcon>;
