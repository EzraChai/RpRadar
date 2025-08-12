import { MapContainer, TileLayer } from "react-leaflet";
// import "./App.css";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router";

function App() {
  let [searchParams] = useSearchParams();

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
