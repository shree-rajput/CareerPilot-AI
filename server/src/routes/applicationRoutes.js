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
  getApplicationReadiness,
  confirmStatusSuggestion,
  bulkUpdateStatus,
} from "../controllers/applicationController.js";
import { runAutoStaleCheck } from "../services/staleScheduler.js";
import { requireAuth } from "../middleware/auth.js";

export const applicationRouter = Router();

applicationRouter.use(requireAuth);

applicationRouter.post("/", createApplication);
applicationRouter.post("/external", captureExternalApplication);
applicationRouter.get("/", getApplications);

// Automation & Suggestions
applicationRouter.post("/confirm-suggestion", confirmStatusSuggestion);
applicationRouter.post("/bulk-status", bulkUpdateStatus);
applicationRouter.post("/trigger-auto-stale", async (req, res) => {
  const result = await runAutoStaleCheck();
  return res.json({ message: "Auto-stale check executed successfully.", result });
});

applicationRouter.get("/:id/intelligence", getApplicationIntelligenceSummary);
applicationRouter.get("/:id/readiness", getApplicationReadiness);
applicationRouter.get("/:id", getApplication);
applicationRouter.patch("/:id", updateApplication);
applicationRouter.delete("/:id", deleteApplication);

// AI generation endpoints
applicationRouter.post("/:id/cover-letter", generateCoverLetter);
applicationRouter.post("/:id/recruiter-message", generateRecruiterMessage);

