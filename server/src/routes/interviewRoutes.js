import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createSession,
  getNextQuestion,
  submitAnswer,
  completeSession,
  getSessionReport,
  listSessions,
  transcribeAudio,
  submitCodingAnswer,
  runCode,
  getHistory,
  getReplay
} from "../controllers/interviewController.js";
import multer from "multer";

const upload = multer({ dest: 'uploads/' });

export const router = express.Router();

router.use(requireAuth);

router.post("/", createSession);
router.get("/", listSessions);
router.get("/history", getHistory);
router.get("/:sessionId/report", getSessionReport);
router.get("/:sessionId/replay", getReplay);
router.get("/replay/:sessionId", getReplay);
router.post("/:sessionId/question", getNextQuestion);
router.post("/question/:questionId/answer", submitAnswer);
router.post("/question/:questionId/run", runCode);
router.post("/question/:questionId/coding-answer", submitCodingAnswer);
router.post("/:sessionId/complete", completeSession);
router.post("/transcribe", upload.single("audio"), transcribeAudio);

