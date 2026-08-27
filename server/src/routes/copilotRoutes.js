import express from "express";
import * as copilotController from "../controllers/copilotController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/ask", copilotController.askCopilot);

export default router;
