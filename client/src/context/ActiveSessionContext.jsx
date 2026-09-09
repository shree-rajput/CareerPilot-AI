import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "./useAuth";
import { getLiveKitToken } from "../api/peerInterview";
import { io } from "socket.io-client";
import { LiveKitRoom } from "@livekit/components-react";

const ActiveSessionContext = createContext(null);

export function ActiveSessionProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const [activeSession, setActiveSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Realtime Global State
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [peerPresence, setPeerPresence] = useState([]);
  const socketRef = useRef(null);

  const clearRealtimeConnections = useCallback(() => {
    setLiveKitToken(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setConnectionStatus("disconnected");
    setPeerPresence([]);
  }, []);

  const refreshActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setIsCheckingSession(false);
      clearRealtimeConnections();
      return null;
    }

    try {
      const res = await api.get("/sessions/active");
      const data = res.data?.data || res.data;
      if (data?.active && data?.session) {
        setActiveSession(data.session);
        
        // If it's a tech discussion, ensure we have realtime connections established globally
        if ((data.session.type === "tech_discussion" || data.session.type === "peer_interview") && data.session.roomId) {
          
          // 1. LiveKit Token
          if (!liveKitToken) {
            try {
               const lkData = await getLiveKitToken(data.session.roomId);
               setLiveKitToken(lkData.token);
            } catch (err) {
               console.warn("LiveKit global token fetch failed:", err);
            }
          }

          // 2. Socket.IO
          if (!socketRef.current) {
            setConnectionStatus("connecting");
            const socketInstance = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
              withCredentials: true,
              reconnection: true,
            });
            socketRef.current = socketInstance;
            setSocket(socketInstance);

            socketInstance.on("connect", () => {
              setConnectionStatus("joined");
              socketInstance.emit("room:join", {
                roomId: data.session.roomId,
                userName: user.name || "Peer Developer",
                userId: user._id,
                hasCamera: true,
                hasMic: true,
                activity: "idle"
              });
            });

            socketInstance.on("presence:sync", (msg) => {
              if (Array.isArray(msg?.participants)) setPeerPresence(msg.participants);
            });
            socketInstance.on("room:presence-update", (msg) => {
              if (Array.isArray(msg?.participants)) setPeerPresence(msg.participants);
            });
            socketInstance.on("disconnect", () => setConnectionStatus("disconnected"));
          }
        }
        return data.session;
      } else {
        setActiveSession(null);
        clearRealtimeConnections();
        return null;
      }
    } catch (err) {
      console.warn("[ActiveSessionContext] Error checking active session:", err?.message);
      setActiveSession(null);
      clearRealtimeConnections();
      return null;
    } finally {
      setIsCheckingSession(false);
    }
  }, [user, liveKitToken, clearRealtimeConnections]);

  const clearActiveSession = useCallback(() => {
    setActiveSession(null);
    clearRealtimeConnections();
  }, [clearRealtimeConnections]);

  // Sync active session status when user logs in or route changes
  useEffect(() => {
    refreshActiveSession();
  }, [user, location.pathname, refreshActiveSession]);

  const value = {
    activeSession,
    isCheckingSession,
    refreshActiveSession,
    clearActiveSession,
    setActiveSession,
    // Realtime exports
    socket,
    connectionStatus,
    peerPresence,
    liveKitToken
  };

  const appContent = (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );

  return liveKitToken ? (
    <LiveKitRoom
      token={liveKitToken}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      connect={true}
      className="flex flex-col h-full w-full"
    >
      {appContent}
    </LiveKitRoom>
  ) : (
    appContent
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error("useActiveSession must be used within an ActiveSessionProvider");
  }
  return context;
}
