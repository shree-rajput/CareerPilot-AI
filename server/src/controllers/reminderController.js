import { ReminderRecord } from "../models/ReminderRecord.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";

/**
 * GET /api/reminders/due
 * Returns delivered or scheduled reminders due for current user.
 */
export const getDueReminders = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const reminders = await ReminderRecord.find({
    userId,
    status: { $in: ["delivered", "scheduled"] },
  })
    .sort({ priority: -1, scheduledAt: -1 })
    .populate("applicationId", "company role status jobUrl");

  return res.json({
    success: true,
    reminders,
  });
});

/**
 * POST /api/reminders/:id/seen
 */
export const markReminderSeen = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const reminder = await ReminderRecord.findOne({ _id: req.params.id, userId });
  if (!reminder) throw new AppError("Reminder not found.", 404, "NOT_FOUND");

  reminder.status = "seen";
  reminder.seenAt = new Date();
  await reminder.save();

  return res.json({ success: true, reminder });
});

/**
 * POST /api/reminders/:id/dismiss
 */
export const dismissReminder = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const reminder = await ReminderRecord.findOne({ _id: req.params.id, userId });
  if (!reminder) throw new AppError("Reminder not found.", 404, "NOT_FOUND");

  reminder.status = "dismissed";
  await reminder.save();

  return res.json({ success: true, reminder });
});

/**
 * POST /api/reminders/:id/snooze
 * Payload: { hours: 24 }
 */
export const snoozeReminder = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const hours = parseInt(req.body.hours) || 24;
  const reminder = await ReminderRecord.findOne({ _id: req.params.id, userId });
  if (!reminder) throw new AppError("Reminder not found.", 404, "NOT_FOUND");

  reminder.status = "snoozed";
  reminder.snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  await reminder.save();

  return res.json({ success: true, reminder });
});

/**
 * POST /api/reminders/:id/action
 */
export const completeReminder = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const reminder = await ReminderRecord.findOne({ _id: req.params.id, userId });
  if (!reminder) throw new AppError("Reminder not found.", 404, "NOT_FOUND");

  reminder.status = "completed";
  await reminder.save();

  return res.json({ success: true, reminder });
});
