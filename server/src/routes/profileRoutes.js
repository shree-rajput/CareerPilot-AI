import { Router } from "express";
import {
  updateProfile,
  getReadiness,
  getActions,
  dismissUserAction,
  snoozeUserAction
} from "../controllers/profileController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { profileUpdateSchema } from "../validators/authValidators.js";

export const profileRouter = Router();

// Protect all profile endpoints
profileRouter.use(requireAuth);

profileRouter.patch("/", validate(profileUpdateSchema), updateProfile);
profileRouter.get("/readiness", getReadiness);
profileRouter.get("/actions", getActions);
profileRouter.post("/actions/:actionId/dismiss", dismissUserAction);
profileRouter.post("/actions/:actionId/snooze", snoozeUserAction);

