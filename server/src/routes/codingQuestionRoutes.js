import express from "express";
import { getCodingQuestion } from "../controllers/codingQuestionController.js";

const router = express.Router();

router.get("/:sessionId/coding-question", getCodingQuestion);

export default router;
