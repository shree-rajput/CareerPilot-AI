import { Router } from "express";
import { tailorResume, saveTailoredVersion } from "../controllers/tailoringController.js";
import { requireAuth } from "../middleware/auth.js";

export const tailoringRouter = Router();

tailoringRouter.use(requireAuth);

tailoringRouter.post("/", tailorResume);
tailoringRouter.post("/save-version", saveTailoredVersion);

