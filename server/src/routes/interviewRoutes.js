import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createSession,
  getNextQuestion,
  submitAnswer,
  completeSession,
  getSessionReport,
  listSessions,
  transcribeAudio
} from "../controllers/interviewController.js";
import multer from "multer";

const upload = multer({ dest: 'uploads/' });

export const router = express.Router();

router.use(requireAuth);

router.post("/", createSession);
router.get("/", listSessions);
router.get("/:sessionId/report", getSessionReport);
router.post("/:sessionId/question", getNextQuestion);
router.post("/question/:questionId/answer", submitAnswer);
router.post("/:sessionId/complete", completeSession);
router.post("/transcribe", upload.single("audio"), transcribeAudio);
