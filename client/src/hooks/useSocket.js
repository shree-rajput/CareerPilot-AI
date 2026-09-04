import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(roomId, enabled = true, userInfo = {}) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [socketConnected, setSocketConnected] = useState(false);
  const [peerPresence, setPeerPresence] = useState([]);

  useEffect(() => {
    if (!roomId || !enabled) {
      setConnectionStatus("disconnected");
      setSocketConnected(false);
      return;
    }

    setConnectionStatus("connecting");

    const socketInstance = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setSocketConnected(true);
      setConnectionStatus("joining");

      socketInstance.emit("room:join", {
        roomId,
        userName: userInfo.name || "Peer Developer",
        userId: userInfo.id,
        hasCamera: userInfo.hasCamera ?? true,
        hasMic: userInfo.hasMic ?? true,
        activity: userInfo.activity || "idle"
      });
    });

    socketInstance.on("room:joined", (data) => {
      console.log("Room joined acknowledged:", data);
      setConnectionStatus("joined");
      if (Array.isArray(data.participants)) {
        setPeerPresence(data.participants);
      }
    });

    socketInstance.on("presence:sync", (data) => {
      if (Array.isArray(data?.participants)) {
        setPeerPresence(data.participants);
      }
    });

    socketInstance.on("room:error", (err) => {
      console.error("Room error socket event:", err);
      if (err?.message) {
        setConnectionStatus("failed");
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setSocketConnected(false);
      if (reason === "io server disconnect") {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus("reconnecting");
      }
    });

    socketInstance.io.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnect attempt #${attempt}...`);
      setConnectionStatus("reconnecting");
    });

    socketInstance.io.on("reconnect_failed", () => {
      console.error("Socket reconnect failed");
      setConnectionStatus("failed");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      if (connectionStatus === "connecting") {
        setConnectionStatus("reconnecting");
      }
    });

    socketInstance.on("room:presence-update", (data) => {
      if (Array.isArray(data?.participants)) {
        setPeerPresence(data.participants);
      }
    });

    return () => {
      console.log("Cleaning up socket connection for room:", roomId);
      socketInstance.off();
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setSocketConnected(false);
      setConnectionStatus("disconnected");
    };
  }, [roomId, enabled, userInfo.id, userInfo.name]);

  return {
    socket,
    socketConnected,
    connectionStatus,
    peerPresence,
  };
}
