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
import { Link, useSearchParams } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  along,
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
import MYBasNSADirections from "@/../data/ns-a-trips.json";
import MYBasNSBShapes from "@/assets/ns_b/ns_b_shapes_flipped.json";
import MYBasNSBRoutes from "@/assets/ns_b/ns_b_routes_with_directions.json";
import MYBasNSBSchedule from "@/../data/ns-b-schedule.json";
import MYBasNSBDirections from "@/../data/ns-b-trips.json";
import MyBasMkShapes from "@/assets/mk/mk_shapes_flipped.json";
import MyBasMkRoutes from "@/assets/mk/mk_routes_with_directions.json";
import MyBasMkSchedule from "@/../data/mk-schedule.json";
import MyBasMkDirections from "@/../data/mk-trips.json";
import MyBasJbShapes from "@/assets/jb/jb_shapes_flipped.json";
import MyBasJbRoutes from "@/assets/jb/jb_routes_with_directions.json";
import MyBasJbSchedule from "@/../data/jb-schedule.json";
import MyBasJbDirections from "@/../data/jb-trips.json";
import MyBasPkShapes from "@/assets/pk/pk_shapes_flipped.json";
import MyBasPkRoutes from "@/assets/pk/pk_routes_with_directions.json";
import MyBasPkSchedule from "@/../data/pk-schedule.json";
import MyBasPkDirections from "@/../data/pk-trips.json";
import MyBasKtnShapes from "@/assets/ktn/ktn_shapes_flipped.json";
import MyBasKtnRoutes from "@/assets/ktn/ktn_routes_with_directions.json";
import MyBasKtnSchedule from "@/../data/rapid-ktn-schedule.json";
import MyBasKtnDirections from "@/../data/rapid-ktn-trips.json";
import MyBasAlrShapes from "@/assets/alr/alr_shapes_flipped.json";
import MyBasAlrRoutes from "@/assets/alr/alr_routes_with_directions.json";
import MyBasAlrSchedule from "@/../data/alr-schedule.json";
import MyBasAlrDirections from "@/../data/alr-trips.json";
import MyBasKgrShapes from "@/assets/kgr/kgr_shapes_flipped.json";
import MyBasKgrRoutes from "@/assets/kgr/kgr_routes_with_directions.json";
import MyBasKgrSchedule from "@/../data/kgr-schedule.json";
import MyBasKgrDirections from "@/../data/kgr-trips.json";
import MyBasKtbShapes from "@/assets/ktb/ktb_shapes_flipped.json";
import MyBasKtbRoutes from "@/assets/ktb/ktb_routes_with_directions.json";
import MyBasKtbSchedule from "@/../data/ktb-schedule.json";
import MyBasKtbDirections from "@/../data/ktb-trips.json";
import MyBasTrgShapes from "@/assets/trg/trg_shapes_flipped.json";
import MyBasTrgRoutes from "@/assets/trg/trg_routes_with_directions.json";
import MyBasTrgSchedule from "@/../data/trg-schedule.json";
import MyBasTrgDirections from "@/../data/trg-trips.json";
import MyBasSwShapes from "@/assets/sw/sw_shapes_flipped.json";
import MyBasSwRoutes from "@/assets/sw/sw_routes_with_directions.json";
import MyBasSwSchedule from "@/../data/sw-schedule.json";
import MyBasSwDirections from "@/../data/sw-trips.json";

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
import { GeolocateControl } from "@vis.gl/react-maplibre";
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

type IVehiclePosition = transit_realtime.IVehiclePosition;

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
  const [searchParams] = useSearchParams();
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
        setRoute(
          RapidPenangRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(RapidPenangSchedule as unknown as BusScheduleType);
        break;

      case "rkl":
        setRoute(
          RapidKLRoutes.some((r) => r.route_id === searchParams.get("id"))
            ? RapidKLRoutes.find((r) => r.route_id === searchParams.get("id"))
            : MRTFeederRoutes.find(
                (r) => r.route_id === searchParams.get("id"),
              ),
        );
        setBusSchedule(
          RapidKLRoutes.some((r) => r.route_id === searchParams.get("id"))
            ? (RapidKLSchedule as unknown as BusScheduleType)
            : (MRTFeederSchedule as unknown as BusScheduleType),
        );
        break;

      case "ns":
        setRoute(
          MYBasNSARoutes.some((r) => r.route_id === searchParams.get("id"))
            ? MYBasNSARoutes.find((r) => r.route_id === searchParams.get("id"))
            : MYBasNSBRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(
          MYBasNSARoutes.some((r) => r.route_id === searchParams.get("id"))
            ? (MYBasNSASchedule as unknown as BusScheduleType)
            : (MYBasNSBSchedule as unknown as BusScheduleType),
        );
        break;

      case "mk":
        setRoute(
          MyBasMkRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasMkSchedule as unknown as BusScheduleType);
        break;

      case "jb":
        setRoute(
          MyBasJbRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasJbSchedule as unknown as BusScheduleType);
        break;
      case "pk":
        setRoute(
          MyBasPkRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasPkSchedule as unknown as BusScheduleType);
        break;
      case "ktn":
        setRoute(
          MyBasKtnRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasKtnSchedule as unknown as BusScheduleType);
        break;
      case "alr":
        setRoute(
          MyBasAlrRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasAlrSchedule as unknown as BusScheduleType);
        break;
      case "kgr":
        setRoute(
          MyBasKgrRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasKgrSchedule as unknown as BusScheduleType);
        break;
      case "ktb":
        setRoute(
          MyBasKtbRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasKtbSchedule as unknown as BusScheduleType);
        break;
      case "trg":
        setRoute(
          MyBasTrgRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasTrgSchedule as unknown as BusScheduleType);
        break;
      case "sw":
        setRoute(
          MyBasSwRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasSwSchedule as unknown as BusScheduleType);
    }
  }, [provider, searchParams]);

  const markerRefs = useRef<{ [key: string]: CircleMarkerRef | null }>({});
  const starredRoutes = useStarredRoutes();
  const [direction, setDirection] = useState(() => {
    return provider === "jb" || provider === "mk" ? 1 : 0;
  });
  const [positions, setPositions] = useState<LatLngExpression[][]>([]);
  const [positionsDirection, setPositionsDirection] = useState(direction);
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (searchParams.get("id") === null) {
      const defaultDirection = provider === "jb" || provider === "mk" ? 1 : 0;
      setDirection(defaultDirection);
      setPositions([]);
      setPositionsDirection(defaultDirection);
      return;
    }
    if (searchParams.get("id")) {
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
  }, [route?.directions, direction, isMobile, searchParams]);

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
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.enable();
        }}
        className="absolute overflow-hidden p-0 gap-0 top-4 right-4 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold"
      >
        <Button
          style={{
            touchAction: "none",
          }}
          className="rounded-none"
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
          className="rounded-none"
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

  const StopsCard = () => {
    const map = useMap();
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
              className={`px-2 h-6 font-semibold flex justify-center items-center text-sm border-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-[#e74e9f]" : "border-red-500"} rounded-lg text-black dark:text-white`}
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
                  route?.directions.find((d) => d.direction_id === direction)
                    ?.route_long_name
                }
              </h4>
            </div>

            {route?.directions.length >= 2 && (
              <Button
                variant={"outline"}
                className="bg-white w-full"
                onClick={() =>
                  setDirection((prev) => {
                    return prev === 1 ? 0 : 1;
                  })
                }
              >
                Change Direction
              </Button>
            )}
          </CardTitle>

          <div className="mt-2 ml-2 overflow-y-auto h-full overflow-x-clip ">
            {route?.directions
              .find((d) => {
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
              })
              ?.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className={`${idx === 0 && "mt-2"} flex relative w-full `}
                >
                  {/* Bullet */}
                  <div className="flex w-3 flex-col items-center mr-1">
                    <div
                      className={`w-3 h-3 absolute rounded-full ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-[#78BFF5]"} z-10`}
                    ></div>
                    {/* Vertical line */}
                    {idx <
                      (route?.directions?.find(
                        (d) => d.direction_id === direction,
                      )?.stops.length ?? 0) -
                        1 && (
                      <div
                        className={`h-full w-1 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-[#87CEFA]"}`}
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
                        }
                      }}
                      className="cursor-pointer m-2 !hover:bg-transparent  text-sm font-medium rounded-none mx-1 -mt-4 justify-start w-full text-left whitespace-normal wrap-break-words"
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
                      (provider === "rp" ||
                        provider === "ns" ||
                        provider === "jb" ||
                        provider === "ktn" ||
                        provider === "alr" ||
                        provider === "pk" ||
                        provider === "kgr" ||
                        provider === "ktb" ||
                        provider === "trg" ||
                        provider === "sw" ||
                        provider === "mk") && (
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
  };

  function FitBoundsToPolyline({ color }: { color: string }) {
    const map = useMap();

    if (route?.directions.length === 0) return null;
    if (route?.directions.length === 1) {
      if (provider === "jb" || provider === "mk") {
        setDirection(1);
      } else {
        setDirection(0);
      }
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
                  click: () =>
                    map.setView([stop.lat, stop.lon], 16, { animate: true }),
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
        {route?.directions.find((d) => {
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
        })?.stops.length &&
          positions.length &&
          route.directions
            .find((d) => {
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
            })
            ?.stops.map((stop, idx) => (
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
                  click: () =>
                    map.setView([stop.lat, stop.lon], 16, { animate: true }),
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

        {positions.length !== 0 && (
          <FitBoundsToPolyline
            color={
              provider === "rkl" &&
              route?.route_short_name === route?.directions[0].route_long_name
                ? "#28ab78"
                : provider !== "rkl" && provider !== "rp"
                  ? "#e74e9f"
                  : "#78BFF5"
            }
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
              <>
                <Polyline
                  key={route.route_id}
                  pathOptions={{
                    color: "#" + route.route_color,
                    weight: 7,
                    opacity: 0.6,
                  }}
                  positions={
                    RapidRailShapes.features
                      .find(
                        (pos) => route.shape_ids[0] === pos.properties.shape_id,
                      )
                      ?.geometry.coordinates.map(
                        (coord) => [coord[0], coord[1]] as [number, number],
                      ) ?? []
                  }
                />
                {RapidRailRoutesWithStops.find(
                  (r) => r.route_id === route.route_id,
                )?.directions[0]?.stops.map((stop) => (
                  <CircleMarker
                    key={stop.stop_id}
                    radius={4}
                    center={[stop.lat, stop.lon]}
                    pathOptions={{
                      color: "transparent",
                      fillColor: "white",
                      fillOpacity: 0.6,
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
            ))}
          </>
        )}

        <CustomZoomControls />
        <Card className="absolute overflow-hidden p-0 w-10 flex justify-center items-center gap-0 top-36.5 mr-px right-4 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
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
                  <SelectTrigger className="bg-white">
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
          routeId={searchParams.get("id")}
        />
        {!isMobile && route && (
          <>
            <StopsCard />
            <Card className="absolute z-500 pointer-events-none top-4 left-1/2 -translate-x-1/2 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-2xl shadow-md text-lg font-semibold">
              <div className="flex justify-between items-center gap-4">
                <div
                  className={`text-2xl font-bold border-2 p-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-xl`}
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
                  className={`text-2xl font-bold border-2 p-2 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "border-[#28ab78]" : provider !== "rkl" && provider !== "rp" ? "border-pink-500" : "border-red-500"} rounded-xl`}
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

function FlyToRoute({
  positions,
  isMobile,
  routeId,
}: {
  positions: LatLngExpression[][];
  isMobile: boolean;
  routeId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
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

function AnimatedVehicleMarker({
  position,
  icon,
  heading,
  direction,
  routeLine,
  routeProgress,
  followsRoute,
  routeOrientation,
  children,
}: {
  position: { lat: number; lng: number };
  icon: DivIcon;
  heading: number;
  direction: number;
  routeLine: ReturnType<typeof lineString>;
  routeProgress: number;
  followsRoute: boolean;
  routeOrientation: 1 | -1;
  children: ReactNode;
}) {
  const animationDuration = 1500;
  const markerRef = useRef<{
    getLatLng: () => { lat: number; lng: number };
    setLatLng: (position: [number, number]) => void;
    getElement: () => HTMLElement | undefined;
  } | null>(null);
  // Keep the adapter's declarative coordinates in sync with the imperative animation.
  // Otherwise a React rerender can restore the marker's mount position.
  const markerPositionRef = useRef(position);
  const previousHeadingRef = useRef(heading);
  const previousPositionDirectionRef = useRef(direction);
  const previousHeadingDirectionRef = useRef(direction);
  const currentRouteProgressRef = useRef(routeProgress);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const target = { lat: position.lat, lng: position.lng };
    const normalizeHeading = (value: number) => ((value % 360) + 360) % 360;
    const applyHeading = (value: number) => {
      const image = marker
        .getElement()
        ?.querySelector("img") as HTMLImageElement | null;
      if (!image) return;
      const normalizedHeading = normalizeHeading(value);
      image.style.transition = "none";
      image.style.transform = `rotate(${normalizedHeading}deg)`;
      previousHeadingRef.current = normalizedHeading;
    };
    const routeLength = length(routeLine, { units: "meters" });
    const routeHeadingAt = (progress: number, travelSign: number) => {
      if (routeLength === 0) return normalizeHeading(heading);
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
      const routeHeading = normalizeHeading(
        bearing(
          along(routeLine, from, { units: "meters" }),
          along(routeLine, to, { units: "meters" }),
        ),
      );
      return routeHeading;
    };
    const applyCurrentHeading = (travelSign = routeOrientation) => {
      applyHeading(
        followsRoute ? routeHeadingAt(routeProgress, travelSign) : heading,
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
    const movementSign = routeOrientation;
    const isPositionNoise = followsRoute
      ? Math.abs(routeProgress - startProgress) < 8
      : distance(
          point([start.lng, start.lat]),
          point([target.lng, target.lat]),
          { units: "meters" },
        ) < 4;
    if (isPositionNoise) {
      if (followsRoute) applyCurrentHeading(movementSign);
      return;
    }
    if (start.lat === target.lat && start.lng === target.lng) {
      if (followsRoute) currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      if (followsRoute) applyCurrentHeading(movementSign);
      return;
    }

    // GPS can project onto a distant segment where a route doubles back near a hub.
    // Avoid animating that projection error as if the bus travelled the whole route.
    const MAX_ROUTE_ANIMATION_DISTANCE_METERS = 500;
    if (
      followsRoute &&
      Math.abs(routeProgress - startProgress) >
        MAX_ROUTE_ANIMATION_DISTANCE_METERS
    ) {
      currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      marker.setLatLng([target.lat, target.lng]);
      applyCurrentHeading(movementSign);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (followsRoute) currentRouteProgressRef.current = routeProgress;
      markerPositionRef.current = target;
      marker.setLatLng([target.lat, target.lng]);
      applyCurrentHeading(movementSign);
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
        const routePoint = along(routeLine, currentProgress, {
          units: "meters",
        });
        const travelSign = movementSign;
        nextPosition = {
          lat: routePoint.geometry.coordinates[1],
          lng: routePoint.geometry.coordinates[0],
        };
        const nextHeading = routeHeadingAt(currentProgress, travelSign);
        const image = marker
          .getElement()
          ?.querySelector("img") as HTMLImageElement | null;
        if (image) {
          image.style.transition = "none";
          image.style.transform = `rotate(${nextHeading}deg)`;
        }
        previousHeadingRef.current = nextHeading;
      }
      // Land exactly on the newest projected position; along() can differ by a
      // few pixels at the route endpoint due to distance rounding.
      if (progress === 1) nextPosition = target;
      markerPositionRef.current = nextPosition;
      marker.setLatLng([nextPosition.lat, nextPosition.lng]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else if (followsRoute) {
        currentRouteProgressRef.current = routeProgress;
        applyCurrentHeading(movementSign);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [
    animationDuration,
    direction,
    followsRoute,
    heading,
    position.lat,
    position.lng,
    routeLine,
    routeOrientation,
    routeProgress,
  ]);

  useEffect(() => {
    if (followsRoute) return;
    const image = markerRef.current
      ?.getElement()
      ?.querySelector("img") as HTMLImageElement | null;

    if (!image) return;

    const normalize = (value: number) => ((value % 360) + 360) % 360;

    const targetHeading = normalize(heading);

    // Direction changed: snap immediately without animation
    if (previousHeadingDirectionRef.current !== direction) {
      previousHeadingDirectionRef.current = direction;
      previousHeadingRef.current = targetHeading;

      image.style.transition = "none";
      image.style.transform = `rotate(${targetHeading}deg)`;

      return;
    }

    const previousHeading = normalize(previousHeadingRef.current);

    // Calculate shortest rotation (-180 to +180)
    const delta = ((targetHeading - previousHeading + 540) % 360) - 180;

    // Ignore insignificant changes
    if (Math.abs(delta) < 0.5) {
      image.style.transition = "none";
      image.style.transform = `rotate(${targetHeading}deg)`;
      previousHeadingRef.current = targetHeading;
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      image.style.transition = "none";
      image.style.transform = `rotate(${targetHeading}deg)`;
      previousHeadingRef.current = targetHeading;
      return;
    }

    // Use relative rotation to prevent unnecessary 360-degree turns
    const nextHeading = previousHeadingRef.current + delta;

    image.style.transition = `transform ${animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`;

    image.style.transform = `rotate(${nextHeading}deg)`;

    previousHeadingRef.current = nextHeading;
  }, [animationDuration, direction, followsRoute, heading]);

  return (
    <Marker ref={markerRef} position={markerPositionRef.current} icon={icon}>
      {children}
    </Marker>
  );
}

function VehiclesMarker({
  direction,
  route,
  positions,
}: {
  direction: number;
  positions: LatLngExpression[][];
  route:
    | {
        route_id: string;
        route_short_name: string;
        directions: {
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
    | undefined;
}) {
  const [vehicles, setVehicles] = useState<Map<string, IVehiclePosition>>(
    new Map(),
  );

  const [provider, setProvider] = useState<string | undefined>();
  const [BusSchedule, setBusSchedule] =
    useState<BusScheduleType>(RapidPenangSchedule);

  useEffect(() => {
    const userProvider = localStorage.getItem("provider");
    setProvider(userProvider || "rp");

    if (userProvider === "rkl") {
      const combinedSchedule = [...RapidKLSchedule, ...MRTFeederSchedule];
      setBusSchedule(combinedSchedule as unknown as BusScheduleType);
    } else if (userProvider === "ns") {
      const combinedSchedule = [...MYBasNSASchedule, ...MYBasNSBSchedule];
      setBusSchedule(combinedSchedule as unknown as BusScheduleType);
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

  const [directionsLocation, setDirectionsLocation] = useState<{
    0: IVehiclePosition[];
    1: IVehiclePosition[];
  }>({ 0: [], 1: [] });
  const routeSnapStateRef = useRef(new Map<string, boolean>());
  const vehicleRouteProgressRef = useRef(new Map<string, number>());

  const timerRef = useRef<number | null>(null);
  const fetchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (provider !== "rp" && provider !== "rkl") return;
    if (!route?.route_short_name) return;

    let routeId = route.route_short_name;
    console.log("routeId", route.route_id);
    if (provider !== "rp") {
      if (route.route_id.valueOf().startsWith("3")) {
        routeId = route.route_short_name + "0";
      } else {
        routeId = route.route_id;
      }
    }

    function avlToVehicle(bus: AvlVehicle): IVehiclePosition {
      if (
        bus.is_inside_endstop === "depot" ||
        bus.is_inside_endstop === "end"
      ) {
        return {};
      }

      // dir "01" → 1, "02" → 0
      let directionId: number;

      if (
        bus.route === "T310" ||
        bus.route === "CAT" ||
        bus.route === "103" ||
        bus.route === "CT15"
      ) {
        // if (
        //   !RapidPenangSchedule.find((b) => b.trip_ids.includes(bus.trip_no))
        // ) {
        //   return {};
        // }
        directionId = 0;
      } else if (bus.dir === "01") {
        directionId = 1;
      } else if (bus.dir === "02") {
        directionId = 0;
      } else {
        directionId =
          RapidPenangSchedule.find((b) => b.trip_ids.includes(bus.trip_no))
            ?.d ?? 0; // default to 0 if dir is not recognized
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

    // 1. Fetch the latest snapshot from the REST API
    function fetchAvl() {
      fetch(`${AVL_API}/${routeId}`)
        .then((res) => res.json())
        .then((data: { vehicles: AvlVehicle[] }) => {
          setVehicles((prev) => {
            const updated = new Map(prev);
            data.vehicles.forEach((bus) => {
              updated.set(bus.bus_no, avlToVehicle(bus));
            });
            return updated;
          });
        })
        .catch(() => {});
    }

    fetchAvl();
    fetchRef.current = fetchAvl;

    // 2. Subscribe to the Pusher channel for live updates
    const channel = pusher.subscribe(`avl.route.${routeId}`);

    channel.bind("avl.data", (bus: AvlVehicle) => {
      setVehicles((prev) => {
        const updated = new Map(prev);
        updated.set(bus.bus_no, avlToVehicle(bus));
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
      pusher.unsubscribe(`avl.route.${routeId}`);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      fetchRef.current = null;
      setVehicles(new Map());
    };
  }, [provider, route?.route_short_name]);

  useEffect(() => {
    if (!provider || provider === "rp" || provider === "rkl") return;

    async function loadData() {
      try {
        let res: Response | null = null;
        const URL =
          "https://my-gtfs-api.wolfram-7b5.workers.dev/api/vehicle-position/";
        if (provider === "ns") {
          res = await fetch(`${URL}mybas-seremban`);
        } else if (provider === "mk") {
          res = await fetch(`${URL}mybas-melaka`);
        } else if (provider === "jb") {
          res = await fetch(`${URL}mybas-johor`);
        } else if (provider === "pk") {
          res = await fetch(`${URL}mybas-ipoh`);
        } else if (provider === "alr") {
          res = await fetch(`${URL}mybas-alor-setar`);
        } else if (provider === "kgr") {
          res = await fetch(`${URL}mybas-kangar`);
        } else if (provider === "ktb") {
          res = await fetch(`${URL}mybas-kota-bharu`);
        } else if (provider === "trg") {
          res = await fetch(`${URL}mybas-kuala-terengganu`);
        } else if (provider === "ktn") {
          res = await fetch(`${URL}prasarana?category=rapid-bus-kuantan`);
        } else if (provider === "sw") {
          res = await fetch(`${URL}mybas-kuching`);
        } else if (provider === "ktmb") {
          res = await fetch(`${URL}ktmb`);
        }

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

          return updated;
        });

        if (res?.ok) {
          const buffer = await res.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer),
          );

          setVehicles((prev) => {
            const updated = new Map(prev);

            feed.entity.forEach((entity) => {
              const vehicle = entity.vehicle;
              console.log(vehicle);
              const plate = vehicle?.vehicle?.licensePlate;

              if (!vehicle || !plate) return;

              updated.set(plate, vehicle);
            });

            return updated;
          });
        }
      } catch (err) {}
    }

    // initial load
    loadData();

    fetchRef.current = loadData;

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(loadData, 10000); // every 10 seconds

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchRef.current?.();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // cleanup
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      fetchRef.current = null;
      setVehicles(new Map());
    };
  }, [provider]); // re-run if provider changes

  let busIcon = null;
  if (provider === "rp") {
    busIcon = (bearing: number, _: string | null | undefined) =>
      divIcon({
        className: "",
        html: `<img 
    src="${bearing < 0 || bearing > 180 ? "/rp-bus2.webp" : "/rp-bus.webp"}"
    style="
      width:100px;
      height:100px;
      transform-origin: center center;
      display:block;
    "
  />`,
        iconSize: [24, 24],
        iconAnchor: [50, 50],
      });
  } else if (provider === "rkl") {
    busIcon = (
      bearing: number,
      routeId: string | null | undefined,
      routeShortName: string | null | undefined,
    ) => {
      if (routeId === routeShortName?.concat("0")) {
        return divIcon({
          className: "",
          html: `<img 
        src="${bearing < 0 || bearing > 180 ? "/mrt-bus2.webp" : "/mrt-bus.webp"}"
    style="
      width:100px;
      height:100px;
      transform-origin: center center;
      display:block;
    "
  />`,
          iconSize: [24, 24],
          iconAnchor: [50, 50],
        });
      } else {
        return divIcon({
          className: "",
          html: `<img 
    src="${bearing < 0 || bearing > 180 ? "/rkl-bus2.webp" : "/rkl-bus.webp"}"
    style="
      width:100px;
      height:100px;
      transform-origin: center center;
      display:block;
    "
  />`,
          iconSize: [24, 24],
          iconAnchor: [50, 50],
        });
      }
    };
  } else if (provider !== "rp" && provider !== "rkl") {
    busIcon = (
      bearing: number,
      _: string | null | undefined,
      __: string | null | undefined,
      ___: string | null | undefined,
    ) =>
      divIcon({
        className: "",
        html: `<img 
    src="${bearing < 0 || bearing > 180 ? "/basmy-bus2.webp" : "/basmy-bus.webp"}"
    style="
      width:100px;
      height:100px;
      transform-origin: center center;
      display:block;
    "
  />`,
        iconSize: [24, 24],
        iconAnchor: [50, 50],
      });
  } else {
    busIcon = (_: number) => divIcon();
  }

  useEffect(() => {
    setDirectionsLocation({ 0: [], 1: [] });
    if (provider === "rp") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      console.log("vehicleForThisRoute", vehicleForThisRoute);
      vehicleForThisRoute.forEach((v) => {
        const dirNum = Number(v.trip?.directionId);
        if (dirNum === 0 || dirNum === 1) {
          setDirectionsLocation((prev) => ({
            ...prev,
            [dirNum]: [...prev[dirNum as 0 | 1], v],
          }));
        }
      });
    } else if (provider === "rkl") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      vehicleForThisRoute.forEach((v) => {
        const dirNum = Number(v.trip?.directionId);
        if (dirNum === 0 || dirNum === 1) {
          setDirectionsLocation((prev) => ({
            ...prev,
            [dirNum]: [...prev[dirNum as 0 | 1], v],
          }));
        }
      });
    } else if (provider === "ns") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MYBasNSADirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );
        if (!directions) {
          directions = MYBasNSBDirections.find(
            (d) => d.trip_id === v.trip?.tripId,
          );
        }

        if (directions === undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "mk") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasMkDirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );

        if (directions === undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0]],
            1: [...prev[1], v],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "jb") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasJbDirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );

        if (directions === undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "pk") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasPkDirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );

        if (directions === undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "ktn") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasKtnDirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );

        if (directions === undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "alr") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        if (MyBasAlrDirections.length === 0) {
          return;
        }
        let directions = MyBasAlrDirections.find(
          (d: any) =>
            d.route_id === route?.route_id && d.trip_id === v.trip?.tripId,
        );

        if (directions !== undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "kgr") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasKgrDirections.find(
          (d) => d.route_id === route?.route_id && d.trip_id === v.trip?.tripId,
        );

        if (directions !== undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "ktb") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      vehicleForThisRoute.forEach((v) => {
        if (v.trip?.directionId === 0 || v.trip?.directionId === 1) {
          const directionId = v.trip.directionId;
          setDirectionsLocation((prev) => ({
            ...prev,
            [directionId]: [...prev[directionId], v],
          }));
          return;
        }
        let directions = MyBasKtbDirections.find(
          (d) => d.route_id === route?.route_id && d.trip_id === v.trip?.tripId,
        );

        if (directions !== undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "sw") {
      const vehicleForThisRoute = Array.from(vehicles.values());
      vehicleForThisRoute.forEach((v) => {
        let directions = MyBasSwDirections.find(
          (d) => d.route_id === route?.route_id && d.trip_id === v.trip?.tripId,
        );

        if (directions !== undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    } else if (provider === "trg") {
      const vehicleForThisRoute = Array.from(vehicles.values());

      vehicleForThisRoute.forEach((v) => {
        let directions = MyBasTrgDirections.find(
          (d) => d.route_id === route?.route_id && d.trip_id === v.trip?.tripId,
        );

        if (directions !== undefined && route?.directions.length === 1) {
          setDirectionsLocation((prev) => ({
            0: [...prev[0], v],
            1: [...prev[1]],
          }));
        } else if (directions !== undefined) {
          const dirNum = Number(directions.direction_id);
          if (dirNum === 0 || dirNum === 1) {
            setDirectionsLocation((prev) => ({
              ...prev,
              [dirNum]: [...prev[dirNum as 0 | 1], v],
            }));
          }
        }
      });
    }
  }, [route?.route_id, route?.directions.length, vehicles]);

  // convert positions (LatLngExpression[][]) to GeoJSON Positions [lon, lat]
  const coordsForLine = useMemo(
    () =>
      positions
        .map((pos) => {
          const p = pos as unknown as [number, number];
          // flip [lat, lon] -> [lon, lat] for Turf
          return [p[1], p[0]] as [number, number];
        })
        .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    [positions],
  );
  // Turf lineString requires two or more positions.
  const line = useMemo(
    () => (coordsForLine.length >= 2 ? lineString(coordsForLine) : null),
    [coordsForLine],
  );
  const routeLength = useMemo(
    () => (line ? length(line, { units: "meters" }) : 0),
    [line],
  );
  const routeOrientation = useMemo<1 | -1>(() => {
    if (!line || coordsForLine.length < 2) return 1;
    const selectedDirection =
      route?.directions.find((item) => item.direction_id === direction) ??
      route?.directions[0];
    const stops = selectedDirection?.stops;
    if (!stops || stops.length < 2) return 1;
    let firstProgress = nearestPointOnLine(
      line,
      point([stops[0].lon, stops[0].lat]),
      { units: "meters" },
    ).properties.location;
    const endpointsDistance = distance(
      point(coordsForLine[0]),
      point(coordsForLine[coordsForLine.length - 1]),
      { units: "meters" },
    );
    if (endpointsDistance < 20 && firstProgress > routeLength - 100) {
      firstProgress = 0;
    }
    for (const stop of stops.slice(1)) {
      let stopProgress = nearestPointOnLine(
        line,
        point([stop.lon, stop.lat]),
        { units: "meters" },
      ).properties.location;
      if (endpointsDistance < 20 && stopProgress > routeLength - 100) {
        stopProgress = 0;
      }
      const stopProgressDelta = stopProgress - firstProgress;
      if (Math.abs(stopProgressDelta) > 30) {
        return stopProgressDelta > 0 ? 1 : -1;
      }
    }
    return 1;
  }, [coordsForLine, direction, line, route?.directions, routeLength]);
  if (directionsLocation[direction as 0 | 1].length === 0 || !line) return null;

  return (
    <>
      {directionsLocation[direction as 0 | 1].map((v, idx) => {
        const busPoint = point(
          typeof v.position?.latitude === "number" &&
            typeof v.position?.longitude === "number"
            ? [v.position.longitude, v.position.latitude]
            : [0, 0],
        );
        const hasLiveBearing =
          (provider === "rp" || provider === "rkl") &&
          typeof v.position?.bearing === "number" &&
          Number.isFinite(v.position.bearing);
        const isClosedRoute =
          coordsForLine.length > 1 &&
          distance(
            point(coordsForLine[0]),
            point(coordsForLine[coordsForLine.length - 1]),
            { units: "meters" },
          ) < 20;
        const snapped = nearestPointOnLine(line, busPoint, { units: "meters" });
        if (hasLiveBearing && isClosedRoute) {
          const routeCoordinates = line.geometry.coordinates;
          const nearestDistance = snapped.properties.dist;
          const routeLength = length(line, { units: "meters" });
          let traversedDistance = 0;
          let bestCandidate: {
            point: typeof snapped;
            progress: number;
            distance: number;
            score: number;
            index: number;
          } | null = null;
          const angleDifference = (first: number, second: number) =>
            Math.abs(((first - second + 540) % 360) - 180);

          for (
            let segmentIndex = 0;
            segmentIndex < routeCoordinates.length - 1;
            segmentIndex++
          ) {
            const segmentStart = routeCoordinates[segmentIndex];
            const segmentEnd = routeCoordinates[segmentIndex + 1];
            const segmentLength = distance(
              point(segmentStart),
              point(segmentEnd),
              { units: "meters" },
            );
            if (segmentLength < 0.5) continue;

            const segmentLine = lineString([segmentStart, segmentEnd]);
            const candidate = nearestPointOnLine(segmentLine, busPoint, {
              units: "meters",
            });
            const candidateProgress =
              traversedDistance + candidate.properties.location;
            if (candidate.properties.dist <= nearestDistance + 15) {
              const tangentStart = along(
                line,
                Math.max(0, candidateProgress - 4),
                { units: "meters" },
              );
              const tangentEnd = along(
                line,
                Math.min(routeLength, candidateProgress + 4),
                { units: "meters" },
              );
              let candidateHeading = bearing(tangentStart, tangentEnd);
              if (routeOrientation === -1) candidateHeading += 180;
              const angleError = angleDifference(
                candidateHeading,
                v.position!.bearing!,
              );
              const score = angleError + candidate.properties.dist * 2;
              if (!bestCandidate || score < bestCandidate.score) {
                bestCandidate = {
                  point: candidate,
                  progress: candidateProgress,
                  distance: candidate.properties.dist,
                  score,
                  index: segmentIndex,
                };
              }
            }
            traversedDistance += segmentLength;
          }

          if (bestCandidate) {
            snapped.geometry = bestCandidate.point.geometry;
            snapped.properties.location = bestCandidate.progress;
            snapped.properties.index = bestCandidate.index;
            snapped.properties.dist = bestCandidate.distance;
          }
        }

        const MAX_OFF_ROUTE_DISTANCE = 200;
        if (snapped.properties.dist > MAX_OFF_ROUTE_DISTANCE) {
          return null;
        }
        const busKey = `${route?.route_id}:${direction}:${v.vehicle?.licensePlate ?? idx}`;
        let routeProgress = snapped.properties.location;
        const selectedDirection =
          route?.directions.find((item) => item.direction_id === direction) ??
          route?.directions[0];
        const firstStop = selectedDirection?.stops[0];
        if (
          isClosedRoute &&
          firstStop &&
          distance(busPoint, point([firstStop.lon, firstStop.lat]), {
            units: "meters",
          }) < 25 &&
          (routeProgress < 100 || routeProgress > routeLength - 100)
        ) {
          const previousProgress = vehicleRouteProgressRef.current.get(busKey);
          routeProgress =
            previousProgress !== undefined && previousProgress > routeLength / 2
              ? routeLength
              : 0;
        }
        vehicleRouteProgressRef.current.set(busKey, routeProgress);
        const wasSnappedToRoute =
          routeSnapStateRef.current.get(busKey) ?? false;
        const snapDistance = wasSnappedToRoute ? 25 : 10;
        const isOffRoute = snapped.properties.dist > snapDistance;
        routeSnapStateRef.current.set(busKey, !isOffRoute);

        const coords = line.geometry.coordinates;
        let idx2 = snapped.properties.index;

        // Safety check
        if (idx2 >= coords.length - 1) {
          idx2 = coords.length - 2;
        }
        // Pick next point to calculate bearing
        if (idx2 >= coords.length - 1) idx2 = coords.length - 2;
        const start = coords[idx2];
        const end = coords[idx2 + 1];
        const routeHeading =
          start && end ? bearing(point(start), point(end)) : 0;
        const heading =
          isOffRoute && hasLiveBearing
            ? v.position!.bearing!
            : routeOrientation === 1
              ? routeHeading
              : (routeHeading + 180) % 360;

        return (
          <div key={v.vehicle?.licensePlate ?? idx}>
            {v && (
              <AnimatedVehicleMarker
                position={{
                  lat: isOffRoute
                    ? busPoint.geometry.coordinates[1] || 0
                    : snapped.geometry.coordinates[1] || 0,
                  lng: isOffRoute
                    ? busPoint.geometry.coordinates[0] || 0
                    : snapped.geometry.coordinates[0] || 0,
                }}
                heading={heading}
                direction={direction}
                routeLine={line}
                routeProgress={routeProgress}
                followsRoute={!isOffRoute}
                routeOrientation={routeOrientation}
                icon={busIcon(
                  heading,
                  v.trip?.tripId,
                  v.trip?.routeId,
                  route?.route_short_name,
                )}
              >
                <Popup maxWidth={500} offset={[0, 8]} closeButton={false}>
                  <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
                    <p className="text-lg font-semibold">
                      {v.vehicle?.licensePlate}
                    </p>
                    <p className="mt-4">
                      Route:{" "}
                      {provider === "rp"
                        ? v.trip?.routeId?.replace(".", "")
                        : route?.route_short_name}
                    </p>
                    {(provider === "rp" || provider === "rkl") && (
                      <p>Speed: {v.position?.speed?.toFixed(0)}km/h</p>
                    )}
                    <p>
                      {(() => {
                        const schedEntries = BusSchedule.filter(
                          (s) =>
                            s.r === route?.route_id &&
                            s.dt === getCurrentDateEvenAfter12(),
                        );
                        for (const entry of schedEntries) {
                          const idx = entry.trip_ids.findIndex(
                            (id) => id === v.trip?.tripId,
                          );
                          if (idx >= 0) {
                            return `Departure: ${entry.t[idx].substring(0, 5)}`;
                          }
                        }
                        return "";
                      })()}
                    </p>
                    {provider === "rp" &&
                      v.trip?.routeId === "T310" &&
                      typeof v.position?.latitude === "number" &&
                      v.position.latitude >= 5.353 && (
                        <p>
                          {"Heading: "}
                          {findT310Heading(
                            (() => {
                              const schedEntries = BusSchedule.filter(
                                (s) =>
                                  s.r === route?.route_id &&
                                  s.dt === getCurrentDateEvenAfter12(),
                              );
                              for (const entry of schedEntries) {
                                const idx = entry.trip_ids.findIndex(
                                  (id) => id === v.trip?.tripId,
                                );
                                if (idx >= 0) return entry.t[idx];
                              }
                              return "";
                            })(),
                          )
                            ? "Queensbay Mall"
                            : "Padang Kawad"}
                        </p>
                      )}
                  </div>
                </Popup>
              </AnimatedVehicleMarker>
            )}
          </div>
        );
      })}
    </>
  );
}
