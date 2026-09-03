import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../services/notification/notificationService.js";
import { runNotificationEngine } from "../services/notification/notificationEngine.js";

/**
 * Gets notifications for the authenticated user.
 */
export async function getNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = Number(req.query.limit) || 20;

    // Trigger notification engine check for user in background without blocking
    runNotificationEngine().catch((err) => {
      console.warn("[NotificationEngine] Background check error:", err?.message || err);
    });

    const userId = req.user._id || req.user.id;
    const data = await getUserNotifications(userId, { limit, unreadOnly });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks a single notification read.
 */
export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await markAsRead(id, req.user.id);
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks all user notifications read.
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    await markAllAsRead(req.user.id);
    res.status(200).json({
      success: true,
      message: "All notifications marked as read."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a notification.
 */
export async function dismissNotification(req, res, next) {
  try {
    const { id } = req.params;
    await deleteNotification(id, req.user.id);
    res.status(200).json({
      success: true,
      message: "Notification dismissed."
    });
  } catch (error) {
    next(error);
  }
}
