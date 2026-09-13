/**
 * CareerPilot Notification Socket
 *
 * Manages user-specific Socket.IO rooms for real-time notification delivery.
 *
 * Design decisions:
 * - Each authenticated user joins a private room: "user:{userId}"
 * - JWT auth is verified in the Socket.IO middleware (not trusted from client data)
 * - A singleton `emitNotificationToUser()` is exported and called by notificationService
 *   after every DB save — this is the ONE canonical socket emit path
 * - Handles multiple browser tabs (multiple sockets per user join the same room)
 * - Handles reconnects: client re-joins on 'connect' automatically
 * - StrictMode safe: cleanup runs on disconnect, not unmount (server-side)
 */

import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/User.js";

// Singleton reference to the namespace instance
let _nsp = null;

/**
 * Registers authentication middleware and user-room join logic on the Socket.IO server.
 * Uses a dedicated '/notifications' namespace to avoid breaking other unauthenticated sockets.
 */
export function registerNotificationSocket(io) {
  _nsp = io.of("/notifications");

  // ── Authentication Middleware ──────────────────────────────────────────────
  // Runs before every socket connection in this namespace.
  _nsp.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("AUTH_REQUIRED: No token provided"));
      }

      const payload = verifyAccessToken(token);
      if (!payload?.sub) {
        return next(new Error("INVALID_TOKEN: Invalid token payload"));
      }

      // Verify user still exists in DB
      const user = await User.findById(payload.sub).select("_id name email").lean();
      if (!user) {
        return next(new Error("USER_NOT_FOUND: User no longer exists"));
      }

      // Attach verified identity to the socket
      socket.data.userId = user._id.toString();
      socket.data.userName = user.name;
      socket.data.userEmail = user.email;

      return next();
    } catch (err) {
      // Distinguish token expiry from other errors for better client-side handling
      const message = err.name === "TokenExpiredError"
        ? "TOKEN_EXPIRED: Session expired, please log in again"
        : "INVALID_TOKEN: Authentication failed";
      return next(new Error(message));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  _nsp.on("connection", (socket) => {
    const userId = socket.data.userId;

    if (!userId) {
      // Should never happen after middleware, but guard anyway
      socket.disconnect(true);
      return;
    }

    // Join the user-specific private room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    console.log(
      `[NotificationSocket] User ${userId} connected (socket: ${socket.id}, room: ${userRoom})`
    );

    // Acknowledge connection with user identity (useful for client-side validation)
    socket.emit("notification:connected", {
      userId,
      message: "Notification channel connected"
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(
        `[NotificationSocket] User ${userId} disconnected (socket: ${socket.id}, reason: ${reason})`
      );
      // No cleanup needed — Socket.IO automatically removes the socket from all rooms
    });

    // ── Mark Notification Seen (optional real-time ack) ──────────────────────
    // Allows client to confirm receipt without an HTTP round-trip
    socket.on("notification:ack", ({ notificationId }) => {
      if (!notificationId) return;
      // No server action needed here — read state is managed via REST API
      // This is a no-op hook for future delivery tracking
    });

    // ── Auth Error Forwarding ────────────────────────────────────────────────
    socket.on("error", (err) => {
      console.error(`[NotificationSocket] Socket error for user ${userId}:`, err.message);
    });
  });

  console.log("[NotificationSocket] Notification socket infrastructure registered.");
}

/**
 * Emits a notification event to all active sockets for a given user.
 * Called by notificationService immediately after saving to MongoDB.
 *
 * @param {string} userId - MongoDB ObjectId string for the target user
 * @param {object} notification - The saved Mongoose notification document (or lean object)
 */
export function emitNotificationToUser(userId, notification) {
  if (!_nsp) {
    // Socket not initialized yet
    return;
  }

  if (!userId || !notification) {
    return;
  }

  const userRoom = `user:${userId.toString()}`;

  // Serialize to plain object to avoid circular reference issues with Mongoose docs
  const payload = {
    _id: notification._id?.toString() || notification.id?.toString(),
    userId: notification.userId?.toString(),
    type: notification.type,
    priority: notification.priority || "MEDIUM",
    title: notification.title || "CareerPilot Update",
    message: notification.message,
    source: notification.source || {},
    action: notification.action || {},
    actionUrl: notification.actionUrl || notification.action?.route || "",
    entityType: notification.entityType || "",
    entityId: notification.entityId || "",
    metadata: notification.metadata || {},
    read: notification.read ?? false,
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  _nsp.to(userRoom).emit("notification:new", payload);
}
