import { Router } from "express";
import { login, logout, getMe, signup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, signupSchema } from "../validators/authValidators.js";

export const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, getMe);
