import {
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  CircleMarker,
  Popup,
  Marker,
} from "react-leaflet";
import { divIcon, Polyline as LeafletPolyline } from "leaflet";
import L from "leaflet";
import { Link, useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { transit_realtime } from "gtfs-realtime-bindings";
import type { LatLngExpression } from "leaflet";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "./theme-provider";
import { bearing, lineString, point, nearestPointOnLine } from "@turf/turf";
import { Minus, Plus, Settings, Star, X } from "lucide-react";
import { LocateControl } from "leaflet.locatecontrol";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMobile } from "./DrawerMobile";
import RapidPenangShapes from "@/assets/rp/rp_shapes_flipped.json";
import RapidPenangRoutes from "@/assets/rp/rp_routes_with_directions.json";
import RapidPenangDirections from "@/../data/rapid-penang-trips.json";
import RapidPenangSchedule from "@/../data/rapid-penang-schedule.json";
import RapidKLShapes from "@/assets/rkl/rkl_shapes_flipped.json";
import RapidKLRoutes from "@/assets/rkl/rkl_routes_with_directions.json";
import RapidKLDirections from "@/../data/rapid-kl-trips.json";
import RapidKLSchedule from "@/../data/rapid-kl-schedule.json";
import MRTFeederShapes from "@/assets/mrt/mrt_shapes_flipped.json";
import MRTFeederRoutes from "@/assets/mrt/mrt_routes_with_directions.json";
import MRTFeederSchedule from "@/../data/mrt-feeder-schedule.json";
import MRTFeederDirections from "@/../data/mrt-feeder-trips.json";
import MYBasNSAShapes from "@/assets/ns_a/ns_a_shapes_flipped.json";
import MYBasNSARoutes from "@/assets/ns_a/ns_a_routes_with_directions.json";
import MYBasNSASchedule from "@/../data/ns-a-schedule.json";
import MYBasNSADirections from "@/../data/ns-a-trips.json";
import MYBasNSBShapes from "@/assets/ns_b/ns_b_shapes_flipped.json";
import MYBasNSBRoutes from "@/assets/ns_b/ns_b_routes_with_directions.json";
import MYBasNSBSchedule from "@/../data/ns-b-schedule.json";
import MYBasNSBDirections from "@/../data/ns-b-trips.json";
import MyBasMeShapes from "@/assets/me/me_shapes_flipped.json";
import MyBasMeRoutes from "@/assets/me/me_routes_with_directions.json";
import MyBasMeSchedule from "@/../data/me-schedule.json";
import MyBasMeDirections from "@/../data/me-trips.json";

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
import "leaflet/dist/leaflet.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
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

function App() {
  const [searchParams] = useSearchParams();
  const [provider, setProvider] = useState<string>(() => {
    return localStorage.getItem("provider") || "rp";
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
          RapidKLRoutes.find((r) => r.route_id === searchParams.get("id"))
            ? RapidKLRoutes.find((r) => r.route_id === searchParams.get("id"))
            : MRTFeederRoutes.find(
                (r) => r.route_id === searchParams.get("id"),
              ),
        );
        setBusSchedule(
          RapidKLRoutes.find((r) => r.route_id === searchParams.get("id"))
            ? (RapidKLSchedule as unknown as BusScheduleType)
            : (MRTFeederSchedule as unknown as BusScheduleType),
        );
        break;

      case "ns":
        setRoute(
          MYBasNSARoutes.find((r) => r.route_id === searchParams.get("id"))
            ? MYBasNSARoutes.find((r) => r.route_id === searchParams.get("id"))
            : MYBasNSBRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(
          MYBasNSARoutes.find((r) => r.route_id === searchParams.get("id"))
            ? (MYBasNSASchedule as unknown as BusScheduleType)
            : (MYBasNSBSchedule as unknown as BusScheduleType),
        );
        break;

      case "me":
        setRoute(
          MyBasMeRoutes.find((r) => r.route_id === searchParams.get("id")),
        );
        setBusSchedule(MyBasMeSchedule as unknown as BusScheduleType);
        break;
    }
  }, [provider, searchParams]);

  const markerRefs = useRef<{ [key: string]: L.CircleMarker | null }>({});
  const starredRoutes = useStarredRoutes();
  const [direction, setDirection] = useState(() => {
    return provider === "me" ? 1 : 0;
  });
  const [positions, setPositions] = useState<LatLngExpression[][]>([]);
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (searchParams.get("id") === null) {
      setDirection(0);
      setPositions([]);
      return;
    }
    if (searchParams.get("id")) {
      const shapeId = route?.directions.find((d) => {
        if (provider === "me") {
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
          RapidKLShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          ).length > 0
        ) {
          filteredShape = RapidKLShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        } else if (
          MRTFeederShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          ).length > 0
        ) {
          filteredShape = MRTFeederShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "ns") {
        if (
          MYBasNSAShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          ).length > 0
        ) {
          filteredShape = MYBasNSAShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        } else if (
          MYBasNSBShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          ).length > 0
        ) {
          filteredShape = MYBasNSBShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      } else if (provider === "me") {
        if (
          MyBasMeShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          ).length > 0
        ) {
          filteredShape = MyBasMeShapes.features.filter(
            (feature) => feature.properties.shape_id === shapeId,
          );
        }
      }
      if (filteredShape?.length) {
        setPositions(
          filteredShape[0].geometry
            .coordinates as unknown as LatLngExpression[][],
        );
      }
    } else {
      if (isMobile) {
        setDirection(0);
        setPositions([]);
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
          className="absolute z-1000 py-0 overflow-hidden gap-0 w-1/5 scroll-smooth bottom-8 backdrop-blur-lg border-white dark:border-neutral-500 bg-white/50 dark:bg-white/10 right-4  shadow-md h-1/2 "
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
              <Link to={"/"}>
                <X className="w-5 h-5 text-black dark:text-white" />
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
                if (provider === "me") {
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
                      className={`w-3 h-3 absolute rounded-full ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-blue-600"} z-10`}
                    ></div>
                    {/* Vertical line */}
                    {idx <
                      route?.directions.filter(
                        (d) => d.direction_id === direction,
                      )[0]?.stops.length -
                        1 && (
                      <div
                        className={`h-full w-1 ${provider === "rkl" && route.directions[0].route_long_name === route.route_short_name ? "bg-[#219166]" : provider !== "rkl" && provider !== "rp" ? "bg-pink-400" : "bg-blue-500"}`}
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
                      (provider === "rp" ||
                        provider === "ns" ||
                        provider === "me") && (
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
    const polylineRef = useRef<LeafletPolyline | null>(null);

    useEffect(() => {
      if (!polylineRef.current) return;
      // if (positions.length < 2) return;

      const bounds = polylineRef.current.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          padding: [10, 10],
          duration: 0.5, // seconds
          easeLinearity: 0.25,
        });
      }
    }, [positions]);

    function darkenHex(hex: string, percent = 10) {
      hex = hex.replace("#", "");

      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      const factor = 1 - percent / 100;

      const newR = Math.max(0, Math.round(r * factor));
      const newG = Math.max(0, Math.round(g * factor));
      const newB = Math.max(0, Math.round(b * factor));

      const toHex = (v: number) => v.toString(16).padStart(2, "0");

      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
    function lighterHex(hex: string, percent = 10) {
      hex = hex.replace("#", "");

      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      const newR = Math.round(r + (255 - r) * (percent / 100));
      const newG = Math.round(g + (255 - g) * (percent / 100));
      const newB = Math.round(b + (255 - b) * (percent / 100));

      const toHex = (v: number) => v.toString(16).padStart(2, "0");

      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
    if (route?.directions.length === 0) return null;
    if (route?.directions.length === 1) {
      setDirection(0);
      return (
        <>
          <Polyline
            ref={polylineRef}
            pathOptions={{ color: color, weight: 5 }}
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
      <>
        <Polyline
          ref={polylineRef}
          pathOptions={{
            color:
              provider !== "rkl" && provider !== "rp"
                ? lighterHex(color, 40)
                : color,
            weight: 5,
          }}
          positions={positions}
        />
        {route?.directions.find((d) => {
          if (provider === "me") {
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
              if (provider === "me") {
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
    <>
      <div className="w-full max-h-dvh overflow-hidden">
        <MapContainer
          id="map"
          preferCanvas={true}
          maxZoom={17}
          zoomControl={false}
          center={
            provider === "rkl"
              ? [3.139, 101.6869]
              : provider === "ns"
                ? [2.7297, 101.9381]
                : provider === "me"
                  ? [2.1881, 102.2516]
                  : [5.4164, 100.3327]
          }
          zoom={provider === "rkl" ? 12.5 : provider === "ns" ? 12.5 : 13.5}
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
          {!isMobile && <AppSidebar setPositions={setPositions} />}
          {/* <PMTileLayer /> */}
          {/* <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url={`https://api.maptiler.com/maps/${
              theme === "dark"
                ? "streets-v4-dark"
                : theme === "light"
                  ? "streets-v4"
                  : typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "streets-v4-dark"
                    : "streets-v4"
            }/{z}/{x}/{y}{r}.png?key=MO1DtSBoGGc9Z8DDsmip`}
          /> */}
          <TileLayer
            maxZoom={17}
            attribution={
              '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            }
            key={theme}
            url={`https://tiles.stadiamaps.com/tiles/${
              theme === "dark"
                ? "alidade_smooth_dark"
                : theme === "light"
                  ? "alidade_smooth"
                  : typeof window !== "undefined" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "alidade_smooth_dark"
                    : "alidade_smooth"
            }/{z}/{x}/{y}{r}.png`}
          />

          {positions.length !== 0 && (
            <FitBoundsToPolyline
              color={
                provider === "rkl" &&
                route?.route_short_name === route?.directions[0].route_long_name
                  ? "#28ab78"
                  : provider !== "rkl" && provider !== "rp"
                    ? "#e74e9f"
                    : "blue"
              }
            />
          )}
          <VehiclesMarker
            positions={positions}
            direction={direction}
            route={route}
          />

          <CustomZoomControls />
          {isMobile && (
            <Card className="absolute overflow-hidden p-0 w-10 flex justify-center items-center gap-0 top-24.75 mr-px right-4 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
              {/* <ModeToggle /> */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
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
                    <Button variant={"outline"} className="">
                      <ModeToggle />
                    </Button>
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
                        <SelectItem value="ns">Negeri Sembilan</SelectItem>
                        <SelectItem value="me">Melaka</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          )}
          <UserLocation />
          {!isMobile && route && <StopsCard />}
          {!isMobile && route && (
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
          )}
        </MapContainer>
      </div>
    </>
  );
}

export default App;

function UserLocation() {
  const map = useMap();

  if (!map) return null;
  if (!LocateControl) return null;
  document.querySelector(".leaflet-control-locate")?.remove();
  const lc = new LocateControl({
    position: "topright",
    showPopup: false,
    locateOptions: {
      enableHighAccuracy: true,
      watch: true,
    },
    strings: {
      title: "Current Position",
    },
  }).addTo(map);

  const button = lc.getContainer();
  if (button) {
    L.DomEvent.on(button, "click", L.DomEvent.stopPropagation);
    L.DomEvent.on(button, "mousedown", L.DomEvent.stopPropagation); // optional
  }

  return null;
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
  const [vehicles, setVehicles] = useState<
    Map<string, transit_realtime.IVehiclePosition>
  >(new Map());

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
    } else if (userProvider === "me") {
      setBusSchedule(MyBasMeSchedule);
    }
  }, []);

  const [directionsLocation, setDirectionsLocation] = useState<{
    0: transit_realtime.IVehiclePosition[];
    1: transit_realtime.IVehiclePosition[];
  }>({ 0: [], 1: [] });

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        let res: Response | null = null;
        let res2: Response | null = null;

        if (provider === "rkl") {
          res = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl",
          );
          res2 = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-mrtfeeder",
          );
        } else if (provider === "ns") {
          res = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-seremban-a",
          );
          res2 = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-seremban-b",
          );
        } else if (provider === "me") {
          res = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-melaka",
          );
        } else if (provider === "rp") {
          res = await fetch(
            "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-penang",
          );
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
            if (!vehicle.timestamp || tsNumber * 1000 < now - 120000) {
              updated.delete(plate);
            }
          }

          return updated;
        });

        if (res) {
          const buffer = await res.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer),
          );

          setVehicles((prev) => {
            const updated = new Map(prev);

            feed.entity.forEach((entity) => {
              const vehicle = entity.vehicle;
              const plate = vehicle?.vehicle?.licensePlate;

              if (!vehicle || !plate) return;

              updated.set(plate, vehicle);
            });

            return updated;
          });
        }

        if (res2) {
          const buffer = await res2.arrayBuffer();
          const feed = transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer),
          );

          setVehicles((prev) => {
            const updated = new Map(prev);

            feed.entity.forEach((entity) => {
              const vehicle = entity.vehicle;
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

    timerRef.current = window.setInterval(loadData, 15000); // every 15 seconds

    // cleanup
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setVehicles(new Map());
    };
  }, [provider]); // re-run if provider changes

  let busIcon = null;
  if (provider === "rp") {
    busIcon = (bearing: number, _: string | null | undefined) =>
      divIcon({
        className: "",
        html: `<img 
    src="${bearing < 0 ? "/rp-bus2.png" : "/rp-bus.png"}"
    alt="Rapid Penang bus"
    style="
      width:100px;
      height:100px;
      transform: rotate(${bearing}deg);
      transform-origin: center center;
      display:block;
    "
  />`,
        iconSize: [24, 24],
        iconAnchor: [50, 50],
      });
  } else if (provider === "rkl") {
    busIcon = (bearing: number, tripId: string | null | undefined) => {
      if (typeof tripId === "string" && tripId.charAt(0) === "w") {
        return divIcon({
          className: "",
          html: `<img 
    src="${bearing < 0 ? "/rkl-bus2.png" : "/rkl-bus.png"}"
    alt="Rapid KL bus"
    style="
      width:100px;
      height:100px;
      transform: rotate(${bearing}deg);
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
    src="${bearing < 0 ? "/mrt-bus2.png" : "/mrt-bus.png"}"
    alt="MRT Feeder bus"
    style="
      width:100px;
      height:100px;
      transform: rotate(${bearing}deg);
      transform-origin: center center;
      display:block;
    "
  />`,
          iconSize: [24, 24],
          iconAnchor: [50, 50],
        });
      }
    };
  } else if (provider === "ns" || provider === "me") {
    busIcon = (bearing: number, _: string | null | undefined) =>
      divIcon({
        className: "",
        html: `<img 
    src="${bearing < 0 ? "/basmy-bus2.png" : "/basmy-bus.png"}"
    alt="BASMY bus"
    style="
      width:100px;
      height:100px;
      transform: rotate(${bearing}deg);
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
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_short_name,
      );

      vehicleForThisRoute.forEach((v) => {
        const directions = RapidPenangDirections.find(
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
              [dirNum]: [...prev[dirNum], v],
            }));
          }
        }
      });
    } else if (provider === "rkl") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) =>
          v.trip?.routeId === route?.route_id ||
          v.trip?.routeId === route?.route_short_name,
      );

      vehicleForThisRoute.forEach((v) => {
        let directions = RapidKLDirections.find(
          (d) => d.trip_id === v.trip?.tripId,
        );
        if (!directions) {
          directions = MRTFeederDirections.find(
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
              [dirNum]: [...prev[dirNum], v],
            }));
          }
        }
      });
    } else if (provider === "ns") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
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
              [dirNum]: [...prev[dirNum], v],
            }));
          }
        }
      });
    } else if (provider === "me") {
      const vehicleForThisRoute = Array.from(vehicles.values()).filter(
        (v) => v.trip?.routeId === route?.route_id,
      );

      vehicleForThisRoute.forEach((v) => {
        let directions = MyBasMeDirections.find(
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
              [dirNum]: [...prev[dirNum], v],
            }));
          }
        }
      });
    }
  }, [route?.route_short_name, route?.directions.length, vehicles]);

  if (directionsLocation[direction as 0 | 1].length === 0) return null;

  // convert positions (LatLngExpression[][]) to GeoJSON Positions [lon, lat]
  const coordsForLine = positions
    .map((pos) => {
      const p = pos as unknown as [number, number];
      // flip [lat, lon] -> [lon, lat] for Turf
      return [p[1], p[0]] as [number, number];
    })
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  // Turf lineString requires two or more positions; if we don't have enough, skip rendering vehicles.
  if (coordsForLine.length < 2) {
    return null;
  }
  const line = lineString(coordsForLine);

  return (
    <>
      {directionsLocation[direction as 0 | 1].map((v, idx) => {
        // console.log(v.position.longitude, v.position.latitude);
        const busPoint = point(
          typeof v.position?.latitude === "number" &&
            typeof v.position?.longitude === "number"
            ? [v.position.longitude, v.position.latitude]
            : [0, 0],
        );
        const snapped = nearestPointOnLine(line, busPoint, { units: "meters" });

        // 50 meters threshold
        const MAX_SNAP_DISTANCE = 50;
        const MAX_OFF_ROUTE_DISTANCE = 1000;

        let isOffRoute = false;
        if (snapped.properties.dist > MAX_OFF_ROUTE_DISTANCE) {
          return null;
        } else if (snapped.properties.dist > MAX_SNAP_DISTANCE) {
          isOffRoute = true;
        }

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

        return (
          <div key={idx}>
            {v && (
              <Marker
                position={{
                  lat: isOffRoute
                    ? busPoint.geometry.coordinates[1] || 0
                    : snapped.geometry.coordinates[1] || 0,
                  lng: isOffRoute
                    ? busPoint.geometry.coordinates[0] || 0
                    : snapped.geometry.coordinates[0] || 0,
                }}
                icon={busIcon(
                  isOffRoute
                    ? v.position?.bearing || 0
                    : bearing(point(start), point(end)) ||
                        v.position?.bearing ||
                        0,
                  v.trip?.tripId,
                )}
              >
                <Popup
                  maxWidth={500}
                  offset={[0, 8]}
                  className="pointer-events-none"
                  closeButton={false}
                >
                  <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
                    <p className="text-lg font-semibold">
                      {v.vehicle?.licensePlate}
                    </p>
                    <p className="mt-4">
                      Route:{" "}
                      {provider === "rp"
                        ? v.trip?.routeId
                        : route?.route_short_name}
                    </p>
                    {(provider === "rp" || provider === "rkl") && (
                      <p>Speed: {v.position?.speed?.toFixed(0)}km/h</p>
                    )}
                    <p>
                      {(() => {
                        const showDeparture =
                          provider !== "rkl" &&
                          route?.route_short_name !==
                            route?.directions[0].route_long_name;

                        if (!showDeparture) return "";

                        const currentBus = BusSchedule.find(
                          (s) =>
                            s.r === route?.route_id &&
                            s.d === direction &&
                            s.dt === getCurrentDateEvenAfter12(),
                        );
                        if (!currentBus) return "";

                        const idx = currentBus.trip_ids.findIndex(
                          (id) => id === v.trip?.tripId,
                        );

                        return idx >= 0
                          ? `Departure: ${currentBus.t[idx].substring(0, 5)}`
                          : "";
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
                              const currentBus = BusSchedule.find(
                                (s) =>
                                  s.r === route?.route_id &&
                                  s.d === direction &&
                                  s.dt === getCurrentDateEvenAfter12(),
                              );

                              if (!currentBus) return "";

                              const idx = currentBus.trip_ids.findIndex(
                                (id) => id === v.trip?.tripId,
                              );

                              return idx >= 0 ? currentBus.t[idx] : "";
                            })(),
                          )
                            ? "Queensbay Mall"
                            : "Padang Kawad"}
                        </p>
                      )}
                  </div>
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </>
  );
}
