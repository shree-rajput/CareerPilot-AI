import { Router } from "express";
import {
  createApplication,
  deleteApplication,
  getApplication,
  getApplications,
  updateApplication
} from "../controllers/applicationController.js";
import { requireAuth } from "../middleware/auth.js";

export const applicationRouter = Router();

applicationRouter.use(requireAuth);

applicationRouter.post("/", createApplication);
applicationRouter.get("/", getApplications);
applicationRouter.get("/:id", getApplication);
applicationRouter.patch("/:id", updateApplication);
applicationRouter.delete("/:id", deleteApplication);
