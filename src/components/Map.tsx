import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import { Polyline as LeafletPolyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router";
import { useEffect, useRef } from "react";
// import { transit_realtime } from "gtfs-realtime-bindings";
import Shapes from "@/assets/shapes.json";
import type { LatLngExpression } from "leaflet";

function App() {
  const [searchParams] = useSearchParams();

  const filteredShape = Shapes.features.filter(
    (feature) => feature.properties.shape_id === searchParams.get("shape_id")
  );
  const positions = filteredShape[0].geometry
    .coordinates as unknown as LatLngExpression[][];

  function FitBoundsToPolyline({
    positions,
  }: {
    positions: LatLngExpression[][];
  }) {
    const map = useMap();
    const polylineRef = useRef<LeafletPolyline>(null);

    useEffect(() => {
      if (polylineRef.current) {
        console.log("running");
        const bounds = polylineRef.current.getBounds();
        map.fitBounds(bounds); // Adjust the map view to fit the polyline
      }
    }, [map]);

    return (
      <Polyline
        ref={polylineRef}
        pathOptions={{ color: "blue" }}
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
      <MapContainer
        center={[5.4164, 100.3327]}
        zoom={13.5}
        scrollWheelZoom={true}
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
        <FitBoundsToPolyline positions={positions} />
      </MapContainer>
    </>
  );
}

export default App;
