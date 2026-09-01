import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { createError } from "../utils/error.js";
import { createNotification } from "../services/notification/notificationService.js";

/**
 * Sends a message from candidate to mentor or mentor to candidate.
 */
export async function sendMessage(req, res, next) {
  try {
    const { receiverId, text, sessionId } = req.body;
    if (!receiverId || !text) {
      return next(createError(400, "Receiver ID and message text are required."));
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return next(createError(404, "Recipient user not found."));
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId,
      sessionId: sessionId || null,
      text: text.trim()
    });

    await message.save();

    const sender = await User.findById(req.user.id).select("name email").lean();

    // Trigger notification & email to receiver
    await createNotification({
      userId: receiverId,
      type: "MENTOR_MESSAGE",
      title: `New message from ${sender?.name || "CareerPilot user"}`,
      message: text.length > 80 ? text.slice(0, 80) + "..." : text,
      entityType: "message",
      entityId: message._id.toString(),
      actionUrl: `/mentor/dashboard`
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves conversation thread between current user and another user.
 */
export async function getConversation(req, res, next) {
  try {
    const { otherUserId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id }
      ]
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks messages from other user as read.
 */
export async function markConversationRead(req, res, next) {
  try {
    const { otherUserId } = req.params;
    await Message.updateMany(
      { senderId: otherUserId, receiverId: req.user.id, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "Conversation marked as read."
    });
  } catch (error) {
    next(error);
  }
}
