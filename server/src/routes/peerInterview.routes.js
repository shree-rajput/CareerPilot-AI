import express from "express";
import {
  createPeerInterviewRoom,
  joinPeerInterviewRoom,
  createPeerInterviewToken,
  getCopilotSuggestion,
  submitCodeReview,
  endInterview,
  getPeerInterviewReport
} from "../controllers/peerInterview.controller.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

router.post("/", requireAuth, createPeerInterviewRoom);
router.post("/:roomId/join", requireAuth, joinPeerInterviewRoom);
router.post("/:roomId/livekit-token", requireAuth, createPeerInterviewToken);
router.post("/:roomId/copilot", requireAuth, getCopilotSuggestion);
router.post("/:roomId/code-review", requireAuth, submitCodeReview);
router.post("/:roomId/end", requireAuth, endInterview);
router.get("/:roomId/report", requireAuth, getPeerInterviewReport);

export default router;
