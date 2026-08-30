import { Router } from "express";
import {
  createApplication,
  captureExternalApplication,
  deleteApplication,
  getApplication,
  getApplicationIntelligenceSummary,
  getApplications,
  updateApplication,
  generateCoverLetter,
  generateRecruiterMessage,
  getApplicationReadiness
} from "../controllers/applicationController.js";
import { requireAuth } from "../middleware/auth.js";

export const applicationRouter = Router();

applicationRouter.use(requireAuth);

applicationRouter.post("/", createApplication);
applicationRouter.post("/external", captureExternalApplication);
applicationRouter.get("/", getApplications);
applicationRouter.get("/:id/intelligence", getApplicationIntelligenceSummary);
applicationRouter.get("/:id/readiness", getApplicationReadiness);
applicationRouter.get("/:id", getApplication);
applicationRouter.patch("/:id", updateApplication);
applicationRouter.delete("/:id", deleteApplication);

// AI generation endpoints
applicationRouter.post("/:id/cover-letter", generateCoverLetter);
applicationRouter.post("/:id/recruiter-message", generateRecruiterMessage);
