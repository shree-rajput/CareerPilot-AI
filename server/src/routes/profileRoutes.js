import { Router } from "express";
import { updateProfile } from "../controllers/profileController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { profileUpdateSchema } from "../validators/authValidators.js";

export const profileRouter = Router();

profileRouter.patch("/", requireAuth, validate(profileUpdateSchema), updateProfile);
