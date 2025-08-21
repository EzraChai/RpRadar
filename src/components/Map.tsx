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
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { transit_realtime } from "gtfs-realtime-bindings";
import Shapes from "@/assets/shapes.json";
import routes from "@/assets/routes_with_directions.json";
import type { LatLngExpression } from "leaflet";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "./theme-provider";
import { Star } from "lucide-react";
import { useStarredRoutes } from "@/hooks/use-starred-routes";
import Directions from "@/../data/trips.json";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMobile } from "./DrawerMobile";

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
    if (searchParams.get("id")) {
      const filteredShape = Shapes.features.filter(
        (feature) =>
          feature.properties.shape_id ===
          route?.directions.filter((d) => d.direction_id === direction)[0]
            .shape_id
      );
      if (filteredShape.length) {
        setPositions(
          filteredShape[0].geometry
            .coordinates as unknown as LatLngExpression[][]
        );
      }
    } else {
      if (isMobile) {
        setPositions([]);
      }
    }
  }, [direction, route?.directions]);

  function CustomZoomControls() {
    const map = useMap();

    const zoomIn = () => map.zoomIn();
    const zoomOut = () => map.zoomOut();

    return (
      <Card className="absolute overflow-hidden p-0 gap-0 top-4 right-4 z-[1000] border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
        <Button className="rounded-none" variant={"ghost"} onClick={zoomIn}>
          +
        </Button>
        <Button className="rounded-none" variant={"ghost"} onClick={zoomOut}>
          -
        </Button>{" "}
      </Card>
    );
  }

  function StopsCard() {
    const map = useMap();
    if (route)
      return (
        <Card
          onMouseEnter={() => {
            map.scrollWheelZoom.disable();
            map.dragging.disable();
          }}
          onMouseLeave={() => {
            map.scrollWheelZoom.enable();
            map.dragging.enable();
          }}
          className="absolute z-[1000] py-0 overflow-hidden gap-0 max-w-1/5 scroll-smooth bottom-8 backdrop-blur-lg border-white dark:border-neutral-500 bg-white/50 dark:bg-white/10 right-4  shadow-md h-1/2 "
        >
          <CardTitle className="space-y-2 px-6 py-6">
            <h2 className="font-bold flex justify-between items-center gap-2">
              <div className="text-md flex justify-center items-center font-bold border-2 w-12 h-6 py-1 px-2 border-red-500 rounded-xl">
                {route?.route_short_name}
              </div>
              <div>
                <h4 className="font-semibold text-balance text-base">
                  {
                    route?.directions.filter(
                      (d) => d.direction_id === direction
                    )[0].route_long_name
                  }
                </h4>
              </div>
              <Star
                fill={
                  starredRoutes.starred.includes(route.route_id || "")
                    ? "oklch(79.5% 0.184 86.047)"
                    : "none"
                }
                onClick={() => starredRoutes.toggle(route.route_id || "")}
                className={`w-4 h-4 ${
                  starredRoutes.starred.includes(route.route_id || "") &&
                  "text-yellow-500 "
                }`}
              />
            </h2>
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

          <div className="ml-2 overflow-y-auto h-full overflow-x-clip ">
            {route?.directions
              .filter((d) => d.direction_id === direction)[0]
              .stops.map((stop, idx) => (
                <div
                  key={idx}
                  className={`${idx === 0 && "mt-2"} flex lative w-full `}
                >
                  {/* Bullet */}
                  <div className="flex flex-col items-center mr-1">
                    <div className="w-3 h-3 rounded-full bg-blue-600 z-10"></div>
                    {/* Vertical line */}
                    {idx <
                      route?.directions.filter(
                        (d) => d.direction_id === direction
                      )[0].stops.length -
                        1 && <div className=" h-6 w-1 bg-blue-500"></div>}
                  </div>
                  {/* Stop Name */}
                  <Button
                    variant={"ghost"}
                    onClick={() => {
                      const marker = markerRefs.current[stop.stop_id];
                      if (marker) {
                        if (!marker.isPopupOpen()) {
                          marker.openPopup();
                        }
                        map.flyTo([stop.lat, stop.lon], 16, { animate: true });
                      }
                    }}
                    className="cursor-pointer text-sm font-medium rounded-none mx-1 -mt-3 justify-start w-full text-left whitespace-normal break-words"
                  >
                    {stop.stop_name}
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      );
    return null;
  }

  function FitBoundsToPolyline({ color }: { color: string }) {
    const map = useMap();
    const polylineRef = useRef<LeafletPolyline | null>(null);

    useEffect(() => {
      if (polylineRef.current && positions.length > 0) {
        const bounds = polylineRef.current.getBounds();
        map.fitBounds(bounds); // Adjust the map view to fit the polyline
      }
    }, [map]);

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
                  className=" pointer-events-none"
                  maxWidth={500}
                  offset={[0, 10]}
                  closeButton={false}
                >
                  <div className="border border-white dark:border-neutral-500  bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
                    {stop.stop_name}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
      </>
    );
  }

  return (
    <>
      <div className=" w-full max-h-dvh">
        <MapContainer
          id="map"
          zoomControl={false}
          center={[5.4164, 100.3327]}
          zoom={13.5}
          scrollWheelZoom={true}
          className="w-full h-dvh "
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

          {theme === "dark" ? (
            <TileLayer
              key={theme}
              attribution={
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              }
              url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`}
            />
          ) : theme == "light" ? (
            <TileLayer
              key={theme}
              attribution={
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              }
              url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`}
            />
          ) : (
            <TileLayer
              key={theme}
              attribution={
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              }
              url={`https://{s}.basemaps.cartocdn.com/${
                window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark_all"
                  : "rastertiles/voyager"
              }/{z}/{x}/{y}{r}.png`}
            />
          )}

          {positions.length && <FitBoundsToPolyline color={"blue"} />}

          <VehiclesMarker direction={direction} route={route} />

          <CustomZoomControls />
          {!isMobile && route && <StopsCard />}
          {!isMobile && route && (
            <Card className="absolute z-[1000] pointer-events-none top-4 left-1/2 -translate-x-1/2 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-2xl shadow-md text-lg font-semibold">
              <div className="flex justify-between items-center gap-4">
                <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
                  {route?.route_short_name}
                </div>

                <div>
                  <h4 className="font-semibold">
                    {
                      route.directions.filter(
                        (d) => d.direction_id === direction
                      )[0].route_long_name
                    }
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

  useEffect(() => {
    async function loadData() {
      const res = await fetch(
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-penang"
      );
      const buffer = await res.arrayBuffer();
      const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
      const vehicleData: {
        data: transit_realtime.IVehiclePosition;
      }[] = [];
      feed.entity.forEach((entity) => {
        if (entity.vehicle) {
          vehicleData.push({
            data: entity.vehicle,
          });
        }
      });
      setVehicles(vehicleData);
    }
    loadData();
    const interval = setInterval(loadData, 20_000);
    return () => {
      clearInterval(interval);
      setVehicles([]);
    };
  }, []);

  if (!vehicles) {
    return null;
  }

  const busIcon = (bearing: number) =>
    divIcon({
      className: "",
      html: `<div style="transform: rotate(${bearing}deg);">
          <img src="/bus.png" alt="bus icon" style="width: 100%; height: 100%;"/>
           </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 45],
    });

  const vehicleForThisRoute = vehicles.filter(
    (v) => v.data.trip?.routeId === route?.route_short_name
  );
  const directionsLocation: {
    0: { data: transit_realtime.IVehiclePosition }[];
    1: { data: transit_realtime.IVehiclePosition }[];
  } = {
    0: [],
    1: [],
  };

  vehicleForThisRoute.forEach((v) => {
    const directions = Directions.find(
      (d) => d.trip_id === v.data.trip?.tripId
    );
    if (
      v.data.trip?.routeId === "CAT" ||
      v.data.trip?.routeId === "T310" ||
      v.data.trip?.routeId === "103" ||
      v.data.trip?.routeId === "201"
    ) {
      directionsLocation[0].push(v);
    } else if (directions !== undefined) {
      const dirNum = Number(directions.direction_id);
      if (dirNum === 0 || dirNum === 1) {
        directionsLocation[dirNum].push(v);
      }
    }
  });

  return (
    <>
      {directionsLocation[direction as 0 | 1].map((v, idx) => (
        <Marker
          key={v.data.vehicle?.id || idx}
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
            offset={[0, 0]}
            className=" pointer-events-none"
            closeButton={false}
          >
            <div className="border border-white dark:border-neutral-500 bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
              <p className="text-lg font-semibold">
                {v.data.vehicle?.licensePlate}
              </p>
              <p className="mt-4">Route: {v.data.trip?.routeId}</p>
              <p>Speed: {v.data.position?.speed}km/h</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
