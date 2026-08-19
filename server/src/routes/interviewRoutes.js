import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createSession,
  getNextQuestion,
  submitAnswer,
  completeSession,
  getSessionReport,
  listSessions
} from "../controllers/interviewController.js";

export const router = express.Router();

router.use(authenticate);

router.post("/", createSession);
router.get("/", listSessions);
router.get("/:sessionId/report", getSessionReport);
router.post("/:sessionId/question", getNextQuestion);
router.post("/question/:questionId/answer", submitAnswer);
router.post("/:sessionId/complete", completeSession);
