import { MapContainer, TileLayer } from "react-leaflet";
// import "./App.css";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router";
import { useEffect } from "react";
import { transit_realtime } from "gtfs-realtime-bindings";

function App() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    async function loadData() {
      const res = await fetch(
        "https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-penang"
      );
      const buffer = await res.arrayBuffer();
      const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
      feed.entity.forEach((entity) => {
        if (entity.vehicle) {
          console.log(entity.vehicle.position?.latitude);
        }
      });
    }
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, []);

  console.log(searchParams.get("code"));
  return (
    <>
      <MapContainer
        center={[5.4164, 100.3327]}
        zoom={13.5}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </>
  );
}

export default App;
