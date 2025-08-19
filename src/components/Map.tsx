import {
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  GeoJSON,
} from "react-leaflet";
import { Polyline as LeafletPolyline, circleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
// import { transit_realtime } from "gtfs-realtime-bindings";
import Shapes from "@/assets/shapes.json";
import routes from "@/assets/routes_with_directions.json";
import type { LatLngExpression } from "leaflet";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

function App() {
  const { id } = useParams();
  const route = routes.find((r) => r.route_id === id);
  const stops = useFindStops(id);
  const [direction, setDirection] = useState(0);
  const [positions, setPositions] = useState<LatLngExpression[][]>([]);

  useEffect(() => {
    const filteredShape = Shapes.features.filter(
      (feature) =>
        feature.properties.shape_id === route?.directions[direction].shape_id
    );
    if (filteredShape.length) {
      console.log(filteredShape);
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
      <Card className="absolute p-0 gap-0 top-4 left-4 z-[1000] border-white dark:border-neutral-500 backdrop-blur-lg bg-white/50 dark:bg-white/10 rounded-2xl shadow-md text-lg font-semibold">
        <Button variant={"ghost"} onClick={zoomIn}>
          +
        </Button>
        <Button variant={"ghost"} onClick={zoomOut}>
          -
        </Button>
      </Card>
    );
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
      <Polyline
        ref={polylineRef}
        pathOptions={{ color: color }}
        positions={positions}
      ></Polyline>
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
          zoomControl={false}
          center={[5.4164, 100.3327]}
          zoom={13.5}
          scrollWheelZoom={true}
          className="w-full h-screen"
        >
          <TileLayer
            attribution={
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            }
            url={`https://{s}.basemaps.cartocdn.com/${
              window.document.documentElement.classList.contains("dark")
                ? "dark_all"
                : "rastertiles/voyager"
            }/{z}/{x}/{y}{r}.png`}
          />
          {positions.length && <FitBoundsToPolyline color={"blue"} />}
          {stops && (
            <GeoJSON
              data={stops}
              pointToLayer={(feature, latlng) =>
                circleMarker(latlng, {
                  radius: 6,
                  fillColor: "#2196F3",
                  color: "#fff",
                  weight: 1,
                  opacity: 1,
                  fillOpacity: 0.9,
                })
              }
              onEachFeature={(feature, layer) => {
                const { stop_name, stop_code } = feature.properties;
                layer.bindPopup(`<b>${stop_name}</b><br/>Code: ${stop_code}`);
              }}
            />
          )}
          <CustomZoomControls />
        </MapContainer>
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
        <Card className="absolute z-[1000] w-1/6 scroll-smooth bottom-4 backdrop-blur-lg border-white dark:border-neutral-500 bg-white/50 dark:bg-white/10 left-4 p-4 shadow-md h-1/2 overflow-y-auto">
          <div className=""></div>
          <h2 className="font-bold mb-2">Stops</h2>
          {route?.directions.length === 2 && (
            <Button
              variant={"outline"}
              className="bg-white"
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
          <ul className="overflow-y-scroll">
            {route?.directions[direction].stops.map((stop, idx) => (
              <div key={stop.stop_id} className="flex items-start relative ">
                {/* Bullet */}
                <div className="flex flex-col items-center mr-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600 z-10"></div>
                  {/* Vertical line */}
                  {idx < route?.directions[direction].stops.length - 1 && (
                    <div className=" h-6 w-1 bg-blue-500"></div>
                  )}
                </div>

                {/* Stop Name */}
                <span className="text-sm font-medium -mt-1">
                  {stop.stop_name}
                </span>
              </div>
            ))}
            {/* {stops.map((stop, idx) => (
              <li key={idx} className="mb-1">
                {stop.name}
              </li>
            ))} */}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default App;

function useFindStops(id: string | undefined) {
  const [routesData, setRoutesData] = useState();

  useEffect(() => {
    if (!id) {
      return;
    }

    try {
      fetch(`/geojson_routes/route_${id}_stops.geojson`)
        .then((res) => res.json())
        .then(setRoutesData);
    } catch {
      /* empty */
    }
  }, [id]);
  return routesData;
}
