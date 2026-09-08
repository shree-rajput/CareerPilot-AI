import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getPendingMentors,
  reviewMentorApplication,
  updateMentorVerification,
  suspendMentor,
  getMentorReports,
  resolveMentorReport,
  triggerDailyReminders,
  triggerAutoStaleCheck,
  getAdminMentorOverview,
  getAdminExceptionQueue,
  resolveMentorAppeal,
  restrictMentorController,
  getAdminAuditLogs
} from "../controllers/adminController.js";

const router = Router();

// Protect all admin endpoints with auth & admin role middleware
router.use(requireAuth);
router.use(requireRole("admin"));

// Platform Overview & Exception Queue
router.get("/mentors/overview", getAdminMentorOverview);
router.get("/mentors/exceptions", getAdminExceptionQueue);
router.get("/mentors/audit-logs", getAdminAuditLogs);

// Moderation Actions
router.get("/mentors/pending", getPendingMentors);
router.post("/mentors/applications/:applicationId/review", reviewMentorApplication);
router.patch("/mentors/:mentorId/verify", updateMentorVerification);
router.post("/mentors/:mentorId/restrict", restrictMentorController);
router.post("/mentors/:mentorId/suspend", suspendMentor);

// Appeals & Reports
router.get("/mentors/reports", getMentorReports);
router.patch("/mentors/reports/:reportId", resolveMentorReport);
router.post("/mentors/appeals/:appealId/resolve", resolveMentorAppeal);

// Manual Cron Triggers for Development & Testing
router.post("/cron/trigger-reminders", triggerDailyReminders);
router.post("/cron/trigger-stale-check", triggerAutoStaleCheck);

export default router;
