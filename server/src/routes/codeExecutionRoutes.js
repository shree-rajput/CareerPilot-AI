import express from "express";
import { executeRoomCodeController } from "../controllers/codeExecutionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/:sessionId/execute", requireAuth, executeRoomCodeController);
router.post("/:sessionId/code/run", requireAuth, executeRoomCodeController);

export default router;
