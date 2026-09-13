import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "./useAuth";

const ActiveSessionContext = createContext(null);

export function ActiveSessionProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const [activeSession, setActiveSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setIsCheckingSession(false);
      return null;
    }

    try {
      const res = await api.get("/sessions/active");
      const data = res.data?.data || res.data;
      if (data?.active && data?.session) {
        setActiveSession(data.session);
        return data.session;
      } else {
        setActiveSession(null);
        return null;
      }
    } catch (err) {
      console.warn("[ActiveSessionContext] Error checking active session:", err?.message);
      setActiveSession(null);
      return null;
    } finally {
      setIsCheckingSession(false);
    }
  }, [user]);

  const clearActiveSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  // Sync active session status when user logs in or route changes
  useEffect(() => {
    refreshActiveSession();
  }, [user, location.pathname, refreshActiveSession]);

  const value = {
    activeSession,
    isCheckingSession,
    refreshActiveSession,
    clearActiveSession,
    setActiveSession
  };

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error("useActiveSession must be used within an ActiveSessionProvider");
  }
  return context;
}
