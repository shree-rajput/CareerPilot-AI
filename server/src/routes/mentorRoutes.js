import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  onboardMentor,
  getApprovedMentors,
  matchMentors,
  requestMentorSession,
  respondToMentorSession,
  completeMentorSession,
  rateMentorSession,
  getSessions
} from "../controllers/mentorController.js";

const router = Router();

// Secure all endpoints with authentication middleware
router.use(requireAuth);

router.post("/onboard", onboardMentor);
router.get("/", getApprovedMentors);
router.get("/match", matchMentors);
router.post("/sessions", requestMentorSession);
router.get("/sessions", getSessions);
router.patch("/sessions/:sessionId/respond", respondToMentorSession);
router.post("/sessions/:sessionId/complete", completeMentorSession);
router.post("/sessions/:sessionId/rate", rateMentorSession);

export const mentorRouter = router;
export default router;
