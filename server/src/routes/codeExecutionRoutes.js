import express from "express";
import { runCode } from "../controllers/codeExecutionController.js";

const router = express.Router();

router.post("/:sessionId/code/run", runCode);

export default router;
