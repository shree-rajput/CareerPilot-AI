import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(roomId, enabled = true) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!roomId || !enabled) return;

    const socketInstance = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setSocketConnected(true);
      socketInstance.emit("room:join", { roomId });
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
    });

    socketInstance.on("room:participant-joined", ({ socketId }) => {
      console.log("Participant joined:", socketId);
    });

    socketInstance.on("room:participant-left", ({ socketId }) => {
      console.log("Participant left:", socketId);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [roomId, enabled]);

  return { socket, socketConnected };
}
