import { Router } from "express";
import { tailorResume } from "../controllers/tailoringController.js";
import { requireAuth } from "../middleware/auth.js";

export const tailoringRouter = Router();

tailoringRouter.use(requireAuth);

tailoringRouter.post("/", tailorResume);
