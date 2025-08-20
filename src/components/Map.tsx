import {
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  CircleMarker,
  Popup,
} from "react-leaflet";
import { Polyline as LeafletPolyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
// import { transit_realtime } from "gtfs-realtime-bindings";
import Shapes from "@/assets/shapes.json";
import routes from "@/assets/routes_with_directions.json";
import type { LatLngExpression } from "leaflet";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "./theme-provider";
import { Star } from "lucide-react";
import { useStarredRoutes } from "@/hooks/use-starred-routes";

function App() {
  const [searchParams] = useSearchParams();
  const route = routes.find((r) => r.route_id === searchParams.get("id"));
  const markerRefs = useRef<{ [key: string]: L.CircleMarker | null }>({});
  const starredRoutes = useStarredRoutes();

  const [direction, setDirection] = useState(0);
  const [positions, setPositions] = useState<LatLngExpression[][]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const filteredShape = Shapes.features.filter(
      (feature) =>
        feature.properties.shape_id === route?.directions[direction].shape_id
    );
    if (filteredShape.length) {
      setPositions(
        filteredShape[0].geometry.coordinates as unknown as LatLngExpression[][]
      );
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
                  {route?.directions[direction].route_long_name}
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
            {route?.directions[direction].stops.map((stop, idx) => (
              <div
                key={idx}
                className={`${idx === 0 && "mt-2"} flex lative w-full `}
              >
                {/* Bullet */}
                <div className="flex flex-col items-center mr-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600 z-10"></div>
                  {/* Vertical line */}
                  {idx < route?.directions[direction].stops.length - 1 && (
                    <div className=" h-6 w-1 bg-blue-500"></div>
                  )}
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
    const polylineRef = useRef<LeafletPolyline>(null);

    useEffect(() => {
      if (polylineRef.current) {
        const bounds = polylineRef.current.getBounds();
        map.fitBounds(bounds); // Adjust the map view to fit the polyline
      }
    }, [map]);

    return (
      <>
        <Polyline
          ref={polylineRef}
          pathOptions={{ color: color }}
          positions={positions}
        />
        {route?.directions[direction].stops.length &&
          positions.length &&
          route.directions[direction].stops.map((stop) => (
            <CircleMarker
              ref={(ref) => {
                markerRefs.current[stop.stop_id] = ref;
              }}
              key={stop.stop_id}
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
              <Popup maxWidth={500} offset={[0, 10]} closeButton={false}>
                <div className="border border-white dark:border-neutral-500  bg-white/50 dark:bg-white/20 backdrop-blur-lg dark:text-white text-black font-medium rounded-lg px-2 py-2 text-md text-left">
                  {stop.stop_name}
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </>
    );
  }

  // useEffect(() => {
  //   async function loadData() {
  //     const res = await fetch(
  //       "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-penang"
  //     );
  //     const buffer = await res.arrayBuffer();
  //     const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  //     feed.entity.forEach((entity) => {
  //       if (entity.vehicle) {
  //         console.log(entity.vehicle.position?.latitude);
  //       }
  //     });
  //   }
  //   loadData();
  //   const interval = setInterval(loadData, 30_000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <>
      <div className="relative w-full h-screen">
        <MapContainer
          id="map"
          zoomControl={false}
          center={[5.4164, 100.3327]}
          zoom={13.5}
          scrollWheelZoom={true}
          className="w-full h-screen "
        >
          <AppSidebar />

          {theme === "dark" ? (
            <TileLayer
              key={theme}
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

          <CustomZoomControls />
          {route && <StopsCard />}
          {route && (
            <Card className="absolute z-[1000] pointer-events-none top-4 left-1/2 -translate-x-1/2 border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 px-2 py-2 rounded-2xl shadow-md text-lg font-semibold">
              <div className="flex justify-between items-center gap-4">
                <div className="text-2xl font-bold border-2 p-2 border-red-500 rounded-xl">
                  {route?.route_short_name}
                </div>

                <div>
                  <h4 className="font-semibold">
                    {route?.directions[direction].route_long_name}
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
