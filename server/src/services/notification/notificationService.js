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
  priority = "MEDIUM",
  source = {},
  action = {},
  metadata = {},
  entityType = "system", // Legacy
  entityId = "", // Legacy
  actionUrl = "", // Legacy
  scheduledFor = null,
  idempotencyKey = null,
  dedupeKey = null
}) {
  try {
    const finalDedupeKey = dedupeKey || idempotencyKey;

    // Check idempotency if key provided
    if (finalDedupeKey) {
      const existing = await Notification.findOne({
        $or: [
          { dedupeKey: finalDedupeKey },
          { idempotencyKey: finalDedupeKey }
        ]
      });
      if (existing) {
        return existing;
      }
    }

    const notifData = {
      userId,
      type,
      priority,
      title: title || "CareerPilot Update",
      message,
      source: {
        entityType: source.entityType || entityType,
        entityId: source.entityId || entityId,
        eventType: source.eventType || ""
      },
      action: {
        route: action.route || actionUrl,
        label: action.label || "View Details"
      },
      metadata,
      entityType: source.entityType || entityType,
      entityId: source.entityId || entityId,
      actionUrl: action.route || actionUrl,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      dedupeKey: finalDedupeKey,
      idempotencyKey: finalDedupeKey
    };

    const notification = new Notification(notifData);
    await notification.save();

    // Multi-Channel Dispatcher (Browser, Email, Future WhatsApp)
    dispatchMultiChannelNotification(notification, notifData).catch((err) =>
      console.error("[NotificationService] Multi-channel dispatch error:", err.message)
    );

    return notification;
  } catch (error) {
    // Handle duplicate key error gracefully if race condition occurs
    if (error.code === 11000 && (dedupeKey || idempotencyKey)) {
      const existing = await Notification.findOne({
        $or: [
          { dedupeKey: dedupeKey || idempotencyKey },
          { idempotencyKey: dedupeKey || idempotencyKey }
        ]
      });
      if (existing) return existing;
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

/**
 * Multi-Channel Notification Dispatcher Architecture
 * Decouples channel-specific delivery logic (Browser, Email, Future WhatsApp) from application event producers.
 */
export async function dispatchMultiChannelNotification(notification, notifData) {
  const user = await User.findById(notification.userId).lean();
  if (!user) return;

  // Channel 1: Email Channel
  if (user.notificationPreferences?.emailEnabled !== false) {
    const sent = await sendEmailNotification({
      user,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notifData.action?.route || notification.actionUrl,
      entityType: notifData.source?.entityType || notification.entityType
    }).catch(() => false);

    if (sent) {
      await Notification.findByIdAndUpdate(notification._id, {
        emailSent: true,
        emailSentAt: new Date()
      });
    } else {
      await Notification.findByIdAndUpdate(notification._id, {
        emailFailedAt: new Date()
      });
    }
  }

  // Channel 2: WhatsApp Channel (Future Channel Adapter Hook)
  if (user.notificationPreferences?.whatsAppEnabled) {
    // Extensible WhatsApp channel dispatcher interface stub
  }
}
