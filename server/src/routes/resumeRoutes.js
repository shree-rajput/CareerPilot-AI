import { Router } from "express";
import multer from "multer";
import {
  deleteResume,
  diffResumeVersions,
  getResume,
  getResumes,
  getResumeVersions,
  restoreResumeVersion,
  uploadResume,
} from "../controllers/resumeController.js";
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

resumeRouter.post("/:id/restore", restoreResumeVersion);
