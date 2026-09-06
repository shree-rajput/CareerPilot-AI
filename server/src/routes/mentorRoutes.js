import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  applyToBecomeMentor,
  discoverMentors,
  getMentorProfileById,
  getMentorSlots,
  configureMentorAvailability,
  getMentorAvailability,
  requestMentorshipSession,
  respondToMentorshipRequest,
  getLiveKitTokenController,
  completeMentorshipSession,
  rateMentorshipSession,
  getSessions,
  reportMentor,
  getMentorshipMessages,
  onboardMentor
} from "../controllers/mentorController.js";

const router = Router();

// Secure all endpoints with authentication middleware
router.use(requireAuth);

// Mentor application & onboarding
router.post("/apply", applyToBecomeMentor);
router.post("/onboard", onboardMentor);

// Mentor discovery & public profile
router.get("/discover", discoverMentors);
router.get("/profile/:id", getMentorProfileById);
router.get("/slots/:mentorId", getMentorSlots);

// Mentor availability management (Mentor role)
router.get("/availability", getMentorAvailability);
router.get("/availability/:mentorId", getMentorAvailability);
router.post("/availability", requireRole("mentor", "admin"), configureMentorAvailability);

// Session booking & management
router.post("/sessions", requestMentorshipSession);
router.get("/sessions", getSessions);
router.patch("/sessions/:sessionId/respond", respondToMentorshipRequest);

// Real-time Zoom-like WebRTC room & chat
router.post("/sessions/:sessionId/livekit-token", getLiveKitTokenController);
router.get("/sessions/:sessionId/messages", getMentorshipMessages);

// Completion, ratings & safety reports
router.post("/sessions/:sessionId/complete", requireRole("mentor", "admin"), completeMentorshipSession);
router.post("/sessions/:sessionId/rate", rateMentorshipSession);
router.post("/report", reportMentor);

export const mentorRouter = router;
export default router;
