import { Router } from "express";
import multer from "multer";
import {
  deleteResume,
  diffResumeVersions,
  downloadResume,
  getResume,
  getResumes,
  getResumeVersions,
  restoreResumeVersion,
  uploadResume,
} from "../controllers/resumeController.js";
import {
  saveDraft,
  saveAsVersion,
  analyzeAgainstJob,
  getInlineAiSuggestion
} from "../controllers/resumeStudioController.js";
import { requireAuth } from "../middleware/auth.js";

export const resumeRouter = Router();

// Use memory storage to process PDF before saving/discarding
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Hard limit 10MB to prevent memory exhaustion
});

resumeRouter.use(requireAuth);

resumeRouter.post("/upload", upload.single("resume"), uploadResume);
resumeRouter.get("/", getResumes);
resumeRouter.get("/diff", diffResumeVersions);
resumeRouter.get("/:id", getResume);
resumeRouter.delete("/:id", deleteResume);
resumeRouter.get("/:id/versions", getResumeVersions);
resumeRouter.get("/:id/download", downloadResume);

resumeRouter.post("/:id/restore", restoreResumeVersion);

// Studio Routes
resumeRouter.post("/:id/draft", saveDraft);
resumeRouter.post("/:id/version", saveAsVersion);
resumeRouter.post("/:id/analyze-job", analyzeAgainstJob);
resumeRouter.post("/:id/ai-suggest", getInlineAiSuggestion);
