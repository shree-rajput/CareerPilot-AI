import { Notification } from "../../models/Notification.js";
import { User } from "../../models/User.js";
import { sendEmailNotification } from "../email/emailService.js";

/**
 * Creates an in-app notification and queues email delivery with idempotency protection.
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  entityType = "system",
  entityId = "",
  actionUrl = "",
  scheduledFor = null,
  idempotencyKey = null
}) {
  try {
    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await Notification.findOne({ idempotencyKey });
      if (existing) {
        return existing;
      }
    }

    const notifData = {
      userId,
      type,
      title: title || "CareerPilot Update",
      message,
      entityType,
      entityId,
      actionUrl,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    };

    if (idempotencyKey) {
      notifData.idempotencyKey = idempotencyKey;
    }

    const notification = new Notification(notifData);
    await notification.save();

    // Trigger async email notification
    User.findById(userId)
      .lean()
      .then(async (user) => {
        if (user) {
          const sent = await sendEmailNotification({
            user,
            type,
            title: title || "CareerPilot Notification",
            message,
            actionUrl,
            entityType
          });

          if (sent) {
            await Notification.findByIdAndUpdate(notification._id, {
              emailSent: true,
              emailSentAt: new Date()
            });
          }
        }
      })
      .catch((err) => console.error("[NotificationService] Async email dispatch error:", err.message));

    return notification;
  } catch (error) {
    // Handle duplicate key error gracefully if race condition occurs
    if (error.code === 11000 && idempotencyKey) {
      return await Notification.findOne({ idempotencyKey });
    }
    console.error("[NotificationService] Error creating notification:", error);
    throw error;
  }
}

/**
 * Fetches notifications for a user with unread metadata.
 */
export async function getUserNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  const query = { userId };
  if (unreadOnly) {
    query.read = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId, read: false })
  ]);

  return {
    notifications,
    unreadCount
  };
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
  return notification;
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId) {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return true;
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(notificationId, userId) {
  const res = await Notification.deleteOne({ _id: notificationId, userId });
  return res.deletedCount > 0;
}
