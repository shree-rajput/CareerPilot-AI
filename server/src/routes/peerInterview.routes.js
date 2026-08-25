import express from "express";
import {
  createPeerInterviewRoom,
  joinPeerInterviewRoom,
  createPeerInterviewToken,
} from "../controllers/peerInterview.controller.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

router.post("/", requireAuth, createPeerInterviewRoom);
router.post("/:roomId/join", requireAuth, joinPeerInterviewRoom);
router.post("/:roomId/livekit-token", requireAuth, createPeerInterviewToken);
export default router;
