import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getDashboardStats,
  getAssignedStudents,
  getStudentDetail,
  getStudentApplications,
  getStudentInterviews,
  createFeedback,
  getStudentFeedback,
  getAllFeedback
} from "../controllers/mentorPortalController.js";

export const mentorPortalRouter = Router();

// Strict security layer for Mentor Portal endpoints
mentorPortalRouter.use(requireAuth);
mentorPortalRouter.use(requireRole("mentor", "admin")); // Only mentors and admins can access this area

// Dashboard & Stats
mentorPortalRouter.get("/dashboard", getDashboardStats);

// Assigned Students
mentorPortalRouter.get("/students", getAssignedStudents);
mentorPortalRouter.get("/students/:studentId", getStudentDetail);
mentorPortalRouter.get("/students/:studentId/applications", getStudentApplications);
mentorPortalRouter.get("/students/:studentId/interviews", getStudentInterviews);

// Feedback Loop
mentorPortalRouter.get("/feedback", getAllFeedback);
mentorPortalRouter.get("/students/:studentId/feedback", getStudentFeedback);
mentorPortalRouter.post("/students/:studentId/feedback", createFeedback);
