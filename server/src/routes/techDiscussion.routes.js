import express from "express";
import {
  createRoomController,
  joinRoomController,
  getLiveKitTokenController,
  getAIRecommendationController,
  getAINudgeController,
  executeContextActionController,
  endSessionController,
  getReportController
} from "../controllers/techDiscussion.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, createRoomController);
router.get("/ai-recommendation", requireAuth, getAIRecommendationController);
router.post("/:roomId/join", requireAuth, joinRoomController);
router.post("/:roomId/livekit-token", requireAuth, getLiveKitTokenController);
router.post("/:roomId/nudge", requireAuth, getAINudgeController);
router.post("/:roomId/action", requireAuth, executeContextActionController);
router.post("/:roomId/end", requireAuth, endSessionController);
router.get("/:roomId/report", requireAuth, getReportController);

export default router;
