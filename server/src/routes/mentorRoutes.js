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
  onboardMentor,
  getCapabilityChallengeController,
  submitCapabilityAssessmentController,
  getMentorReputationController,
  saveSessionNotesController,
  proposeRescheduleSessionController,
  submitMentorAppealController
} from "../controllers/mentorController.js";

const router = Router();

// Secure all endpoints with authentication middleware
router.use(requireAuth);

// Mentor application & onboarding
router.post("/apply", applyToBecomeMentor);
router.post("/onboard", onboardMentor);

// Capability Assessment
router.get("/assessment/challenge", getCapabilityChallengeController);
router.post("/assessment/submit", submitCapabilityAssessmentController);

// Reputation & Trust Progression
router.get("/me/reputation", getMentorReputationController);

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
router.post("/sessions/:sessionId/reschedule", proposeRescheduleSessionController);
router.post("/sessions/:sessionId/notes", requireRole("mentor", "admin"), saveSessionNotesController);

// Real-time Zoom-like WebRTC room & chat
router.post("/sessions/:sessionId/livekit-token", getLiveKitTokenController);
router.get("/sessions/:sessionId/messages", getMentorshipMessages);

// Completion, ratings & safety reports
router.post("/sessions/:sessionId/complete", requireRole("mentor", "admin"), completeMentorshipSession);
router.post("/sessions/:sessionId/rate", rateMentorshipSession);
router.post("/report", reportMentor);

// Appeals
router.post("/appeals", submitMentorAppealController);

export const mentorRouter = router;
export default router;
