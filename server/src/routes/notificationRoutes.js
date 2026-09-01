import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification
} from "../controllers/notificationController.js";

const router = Router();
router.use(requireAuth);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", dismissNotification);

export default router;
