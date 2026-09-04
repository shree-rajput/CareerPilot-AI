import express from "express";
import {
  createRoomController,
  joinRoomController,
  getLiveKitTokenController,
  getAIRecommendationController,
  getAINudgeController,
  executeContextActionController,
  endSessionController,
  getReportController,
  getNextQuestionController,
  getLanguagesController
} from "../controllers/techDiscussion.controller.js";
import { requireAuth } from "../middleware/auth.js";

import { executeRoomCodeController } from "../controllers/codeExecutionController.js";

const router = express.Router();

router.get("/languages", getLanguagesController);
router.post("/", requireAuth, createRoomController);
router.get("/ai-recommendation", requireAuth, getAIRecommendationController);
router.post("/:roomId/join", requireAuth, joinRoomController);
router.post("/:roomId/livekit-token", requireAuth, getLiveKitTokenController);
router.post("/:roomId/execute", requireAuth, executeRoomCodeController);
router.post("/:roomId/nudge", requireAuth, getAINudgeController);
router.post("/:roomId/action", requireAuth, executeContextActionController);
router.post("/:roomId/next-question", requireAuth, getNextQuestionController);
router.post("/:roomId/end", requireAuth, endSessionController);
router.get("/:roomId/report", requireAuth, getReportController);

export default router;
