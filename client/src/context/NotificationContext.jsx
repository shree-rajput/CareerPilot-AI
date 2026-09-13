import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";
import { http } from "../api/http";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  // Real-time toast state (distinct from the list)
  const [toastNotification, setToastNotification] = useState(null);

  // Initial fetch from REST API
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await http.get("/notifications?limit=50");
      if (data && data.data) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("[NotificationContext] Failed to fetch notifications:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect to the dedicated notifications namespace
    const socketInstance = io(`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}/notifications`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on("connect", () => {
      console.log("[NotificationContext] Connected to real-time notifications");
      // Fetch fresh state on (re)connect to ensure we missed nothing while disconnected
      fetchNotifications();
    });

    socketInstance.on("notification:new", (notification) => {
      // Add to list, increment count
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Trigger the toast popup
      setToastNotification(notification);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("[NotificationContext] Connection error:", err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user, fetchNotifications]);

  const markAsRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await http.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error("[NotificationContext] Failed to mark as read:", error);
      // Rollback on failure (simplified)
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await http.patch("/notifications/read-all");
    } catch (error) {
      console.error("[NotificationContext] Failed to mark all as read:", error);
      fetchNotifications();
    }
  };

  const clearToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        toastNotification,
        clearToast
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
