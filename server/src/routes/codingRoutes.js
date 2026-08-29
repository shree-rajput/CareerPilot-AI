import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getPracticeQuestions,
  getPracticeQuestionById,
  submitPracticeCode,
  getPracticeSubmissions
} from "../controllers/codingController.js";

const router = express.Router();

// Apply auth protection to all routes
router.use(requireAuth);

router.get("/questions", getPracticeQuestions);
router.get("/questions/:id", getPracticeQuestionById);
router.post("/questions/:id/submit", submitPracticeCode);
router.get("/submissions", getPracticeSubmissions);

export default router;
