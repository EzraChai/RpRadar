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
import Shapes from "@/assets/shapes_flipped.json";
import routes from "@/assets/routes_with_directions.json";
import type { LatLngExpression } from "leaflet";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "./theme-provider";
import { Minus, Plus, Star, X } from "lucide-react";
import { LocateControl } from "leaflet.locatecontrol";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import Directions from "@/../data/trips.json";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMobile } from "./DrawerMobile";
import Schedule from "@/../data/schedule.json";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getCurrentDate,
  getCurrentDateEvenAfter12,
  hasCurrentTimePassed,
  isT310HeadingQueensbay,
  nextBusTime,
} from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import "leaflet/dist/leaflet.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";

function App() {
  const [searchParams] = useSearchParams();
  const route = routes.find((r) => r.route_id === searchParams.get("id"));
  const markerRefs = useRef<{ [key: string]: L.CircleMarker | null }>({});
  const starredRoutes = useStarredRoutes();
  const [direction, setDirection] = useState(0);
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
      const filteredShape = Shapes.features.filter(
        (feature) =>
          feature.properties.shape_id ===
          route?.directions.filter((d) => d.direction_id === direction)[0]
            .shape_id,
      );
      if (filteredShape.length) {
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
  }, [direction, isMobile, route?.directions, searchParams]);

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
            <div className="px-2 h-6 font-semibold flex justify-center items-center text-sm border-2 border-red-500 rounded-lg text-black dark:text-white">
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
                  route?.directions.filter(
                    (d) => d.direction_id === direction,
                  )[0].route_long_name
                }
              </h4>
            </div>

            {route?.directions.length === 2 && (
              <Button
                variant={"outline"}
                className="bg-white w-full"
                onClick={() =>
                  setDirection((prev) => {
                    if (route?.directions.length == 2) {
                      return prev === 1 ? 0 : 1;
                    }
                    return 0;
                  })
                }
              >
                Change Direction
              </Button>
            )}
          </CardTitle>

          <div className="mt-2 ml-2 overflow-y-auto h-full overflow-x-clip ">
            {route?.directions
              .filter((d) => d.direction_id === direction)[0]
              .stops.map((stop, idx) => (
                <div
                  key={idx}
                  className={`${idx === 0 && "mt-2"} flex relative w-full `}
                >
                  {/* Bullet */}
                  <div className="flex w-3 flex-col items-center mr-1">
                    <div className="w-3 h-3 absolute rounded-full bg-blue-600 z-10"></div>
                    {/* Vertical line */}
                    {idx <
                      route?.directions.filter(
                        (d) => d.direction_id === direction,
                      )[0].stops.length -
                        1 && <div className=" h-full w-1 bg-blue-500"></div>}
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
                    {idx === 0 && Schedule && (
                      <Collapsible className="px-6 mb-4">
                        <CollapsibleTrigger asChild>
                          <Card className="hover:cursor-ns-resize w-full p-0 flex bg-transparent justify-center items-center h-12">
                            Next bus will depart at{" "}
                            {nextBusTime(
                              Schedule.find(
                                (s) => s.route_id === route.route_id,
                              )
                                ?.directions.filter(
                                  (d) => d.direction_id === direction,
                                )[0]
                                .dates.find((d) => d.date === getCurrentDate())
                                ?.times.flatMap((t) => t.time) || [],
                            )}
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2">Scheduled</div>
                          <div className="grid grid-cols-6 self-center ">
                            {Schedule.find((s) => s.route_id === route.route_id)
                              ?.directions.filter(
                                (d) => d.direction_id === direction,
                              )[0]
                              .dates.find((d) => d.date === getCurrentDate())
                              ?.times.map((t, idx) => (
                                <div
                                  key={idx}
                                  className={`${
                                    hasCurrentTimePassed(t.time)
                                      ? "dark:text-neutral-500 text-neutral-400"
                                      : "dark:text-white text-black"
                                  } px-2`}
                                >
                                  {t.time.substring(0, 5)}
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
      if (polylineRef.current && positions.length > 0) {
        const bounds = polylineRef.current.getBounds();
        map.fitBounds(bounds); // Adjust the map view to fit the polyline
      }
    }, [map, positions]);

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
                  color: "blue",
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
          pathOptions={{ color: color, weight: 5 }}
          positions={positions}
        />
        {route?.directions.filter((d) => d.direction_id === direction)[0].stops
          .length &&
          positions.length &&
          route.directions
            .filter((d) => d.direction_id === direction)[0]
            .stops.map((stop, idx) => (
              <CircleMarker
                ref={(ref) => {
                  markerRefs.current[stop.stop_id] = ref;
                }}
                key={idx}
                radius={6}
                center={[stop.lat, stop.lon]}
                pathOptions={{
                  color: "blue",
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
          zoomControl={false}
          center={[5.4164, 100.3327]}
          zoom={13.5}
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
          {!isMobile && <AppSidebar />}

          {theme === "dark" || theme === "light" ? (
            <TileLayer
              key={theme}
              attribution={
                '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              }
              url={`https://api.maptiler.com/maps/${
                theme === "dark" ? "streets-v2-dark" : "streets"
              }/{z}/{x}/{y}{r}.png?key=nujdgT3N9QZR55uLychE`}
            />
          ) : (
            <TileLayer
              key={theme}
              attribution={
                '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              }
              url={`https://api.maptiler.com/maps/${
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "streets-v2-dark"
                  : "streets"
              }/{z}/{x}/{y}{r}.png?key=nujdgT3N9QZR55uLychE`}
            />
          )}

          {positions.length !== 0 && <FitBoundsToPolyline color={"blue"} />}
          <VehiclesMarker direction={direction} route={route} />

          <CustomZoomControls />
          {isMobile && (
            <Card className="absolute overflow-hidden p-0 w-10 flex justify-center items-center gap-0 top-[99px] mr-px right-4 z-1000 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
              <ModeToggle />
            </Card>
          )}
          <UserLocation />
          {!isMobile && route && <StopsCard />}
          {!isMobile && route && (
            <Card className="absolute z-500 pointer-events-none top-4 left-1/2 -translate-x-1/2 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-2xl shadow-md text-lg font-semibold">
              <div className="flex justify-between items-center gap-4">
                <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
                  {route?.route_short_name}
                </div>

                <div>
                  <h4 className="font-semibold">
                    {route.directions?.filter(
                      (d) => d.direction_id === direction,
                    )[0]?.route_long_name || ""}
                  </h4>
                </div>
                <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
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
}: {
  direction: number;
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
    { data: transit_realtime.IVehiclePosition }[]
  >([]);

  const [directionsLocation, setDirectionsLocation] = useState<{
    0: { data: transit_realtime.IVehiclePosition }[];
    1: { data?: transit_realtime.IVehiclePosition }[];
  }>({ 0: [], 1: [] });

  useEffect(() => {
    async function loadData() {
      const res = await fetch(
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-penang",
      );
      const buffer = await res.arrayBuffer();
      const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
      const vehicleData: {
        data: transit_realtime.IVehiclePosition;
      }[] = [];
      feed.entity.forEach((entity) => {
        if (entity.vehicle) {
          // console.log(entity.vehicle.trip?.routeId === "CT15");
          vehicleData.push({
            data: entity.vehicle,
          });
        }
      });
      setVehicles([]);
      setVehicles(vehicleData);
    }
    loadData();
    const interval = setInterval(loadData, 15000); // Refresh every 15 seconds
    return () => {
      clearInterval(interval);
      setVehicles([]);
    };
  }, []);

  const busIcon = (bearing: number) =>
    divIcon({
      className: "",
      html: `<div style="transform: rotate(${bearing}deg);transform-origin: center center;">
          <img src="${
            bearing > 180 ? "/bus-drawing-2.png" : "/bus-drawing.png"
          }" alt="RapidPenang bus icon" style="width: 100%; height: 100%; display: block;"/>
           </div>`,
      iconSize: [100, 100],
      iconAnchor: [50, 50],
    });

  useEffect(() => {
    setDirectionsLocation({ 0: [], 1: [] });
    const vehicleForThisRoute = vehicles.filter(
      (v) => v.data.trip?.routeId === route?.route_short_name,
    );

    vehicleForThisRoute.forEach((v) => {
      const directions = Directions.find(
        (d) => d.trip_id.slice(6) === v.data.trip?.tripId?.slice(6),
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
  }, [route?.route_short_name, route?.directions.length, vehicles]);
  return (
    <>
      {directionsLocation[direction as 0 | 1].map((v, idx) => (
        <>
          {v.data && (
            <Marker
              key={v.data.vehicle?.licensePlate || idx}
              position={
                typeof v.data.position?.latitude === "number" &&
                typeof v.data.position?.longitude === "number"
                  ? [v.data.position.latitude, v.data.position.longitude]
                  : [0, 0]
              }
              icon={busIcon(v.data.position?.bearing || 0)}
            >
              <Popup
                maxWidth={500}
                offset={[0, 8]}
                className="pointer-events-none"
                closeButton={false}
              >
                <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
                  <p className="text-lg font-semibold">
                    {v.data.vehicle?.licensePlate}
                  </p>
                  <p className="mt-4">Route: {v.data.trip?.routeId}</p>
                  <p>Speed: {v.data.position?.speed}km/h</p>
                  <p>
                    {"Departure: "}
                    {Schedule.find((s) => s.route_id === route?.route_id)
                      ?.directions.filter(
                        (d) => d.direction_id === direction,
                      )[0]
                      .dates.find((d) => d.date === getCurrentDateEvenAfter12())
                      ?.times.find(
                        (d) =>
                          d.trip_id.slice(6) === v.data?.trip?.tripId.slice(6),
                      )
                      ?.time.substring(0, 5) || ""}
                  </p>
                  {v.data.trip?.routeId === "T310" &&
                    typeof v.data.position?.latitude === "number" &&
                    v.data.position.latitude >= 5.353 && (
                      <p>
                        {"Heading: "}
                        {isT310HeadingQueensbay(
                          Schedule.find((s) => s.route_id === route?.route_id)
                            ?.directions.filter(
                              (d) => d.direction_id === direction,
                            )[0]
                            .dates.find(
                              (d) => d.date === getCurrentDateEvenAfter12(),
                            )
                            ?.times.find(
                              (d) => d.trip_id === v.data?.trip?.tripId,
                            )?.time || "",
                        )
                          ? "Queensbay Mall"
                          : "Padang Kawad"}
                      </p>
                    )}
                </div>
              </Popup>
            </Marker>
          )}
        </>
      ))}
    </>
  );
}
