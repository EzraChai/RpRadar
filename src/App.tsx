import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import { useState } from "react";
// import "./App.css";
import "leaflet/dist/leaflet.css";
import SelectRoute from "./SelectRoute";

function App() {
  const [route, setRoute] = useState(null);

  return (
    <>
      {!route ? (
        <div className="">
          <SelectRoute setRoute={setRoute} />
        </div>
      ) : (
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
      )}
    </>
  );
}

export default App;
