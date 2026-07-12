import { io } from "socket.io-client";

export const socket = io("wss://rapidbus-socketio-avl.prasarana.com.my", {
  transports: ["websocket"],
});
