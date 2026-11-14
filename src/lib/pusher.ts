import Pusher from "pusher-js";

export const pusher = new Pusher("822d7c7ba5788a2509272e195c8c5e53226ec4cd", {
  wsHost: "rbgw-wss.rapidbus-it.com",
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enableStats: false,
  enabledTransports: ["ws"],
  cluster: "ap1",
});

export type AvlVehicle = {
  dt_received: string;
  dt_gps: string;
  latitude: number;
  longitude: number;
  dir: string; // "01" or "02"
  speed: number;
  angle: number;
  route: string;
  bus_no: string;
  trip_no: string;
  captain_id: string;
  trip_rev_kind: string;
  engine_status: string;
  accessibility: number;
  busstop_id: string | null;
  is_inside_endstop: string | null;
  is_inside_shape: string | null;
  source: string;
  region: string;
};

export type AvlRouteResponse = {
  route: string;
  count: number;
  filters_applied: string[];
  vehicles: AvlVehicle[];
};

export const AVL_API = "https://rbgw-wss.rapidbus-it.com/api/avl/route";
