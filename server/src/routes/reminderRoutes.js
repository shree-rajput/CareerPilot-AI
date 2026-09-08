import { Router } from "express";
import {
  getDueReminders,
  markReminderSeen,
  dismissReminder,
  snoozeReminder,
  completeReminder,
} from "../controllers/reminderController.js";
import { requireAuth } from "../middleware/auth.js";

export const reminderRouter = Router();

reminderRouter.use(requireAuth);

reminderRouter.get("/due", getDueReminders);
reminderRouter.post("/:id/seen", markReminderSeen);
reminderRouter.post("/:id/dismiss", dismissReminder);
reminderRouter.post("/:id/snooze", snoozeReminder);
reminderRouter.post("/:id/action", completeReminder);
