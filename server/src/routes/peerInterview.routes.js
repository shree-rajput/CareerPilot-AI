import express from "express";
import {
  createRoomController,
  joinRoomController,
  getLiveKitTokenController,
  getAINudgeController,
  executeContextActionController,
  endSessionController,
  getReportController
} from "../controllers/techDiscussion.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Forward peer interview routes to Tech Discussion handlers
router.post("/", requireAuth, createRoomController);
router.post("/:roomId/join", requireAuth, joinRoomController);
router.post("/:roomId/livekit-token", requireAuth, getLiveKitTokenController);
router.post("/:roomId/copilot", requireAuth, getAINudgeController);
router.post("/:roomId/code-review", requireAuth, executeContextActionController);
router.post("/:roomId/end", requireAuth, endSessionController);
router.get("/:roomId/report", requireAuth, getReportController);

export default router;
