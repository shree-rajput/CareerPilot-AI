import { Router } from "express";
import multer from "multer";
import {
  deleteResume,
  diffResumeVersions,
  downloadResume,
  viewResume,
  getResume,
  getResumes,
  getResumeVersions,
  restoreResumeVersion,
  uploadResume,
  runParseabilityCheck,
  exportPdf,
  exportDocx,
  getVersionTree,
  getResumeSuggestions,
} from "../controllers/resumeController.js";
import {
  saveDraft,
  saveAsVersion,
  analyzeAgainstJob,
  getInlineAiSuggestion,
  improveBullet,
} from "../controllers/resumeStudioController.js";
import { saveTailoredVersion } from "../controllers/tailoringController.js";
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
resumeRouter.get("/:id/version-tree", getVersionTree);
resumeRouter.get("/:id/download", downloadResume);

resumeRouter.post("/:id/restore", restoreResumeVersion);
resumeRouter.get("/:id/view", viewResume);

// Parseability & Export Routes
resumeRouter.post("/:id/parseability-check", runParseabilityCheck);
resumeRouter.get("/:id/export/pdf", exportPdf);
resumeRouter.get("/:id/export/docx", exportDocx);
resumeRouter.post("/:id/suggestions", getResumeSuggestions);

// Studio & Tailoring Routes
resumeRouter.post("/:id/draft", saveDraft);
resumeRouter.post("/:id/version", saveAsVersion);
resumeRouter.post("/:id/tailor", (req, res, next) => {
  req.body.resumeId = req.params.id;
  return saveTailoredVersion(req, res, next);
});
resumeRouter.post("/:id/analyze-job", analyzeAgainstJob);
resumeRouter.post("/:id/ai-suggest", getInlineAiSuggestion);
resumeRouter.post("/:id/improve-bullet", improveBullet);



