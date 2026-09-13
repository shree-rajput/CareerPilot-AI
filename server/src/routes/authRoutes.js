import { Router } from "express";
import {
  login,
  logout,
  getMe,
  signup,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  generateExtensionCode,
  exchangeExtensionCode
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  signupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../validators/authValidators.js";

import { authLimiter } from "../middleware/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, getMe);

// Verification & Password Recovery Endpoints
authRouter.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
authRouter.post("/resend-verification", authLimiter, validate(resendVerificationSchema), resendVerification);
authRouter.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);

// Extension Authorization Flow (No manual JWT copying required)
authRouter.post("/extension-code", requireAuth, generateExtensionCode);
authRouter.post("/extension-token", exchangeExtensionCode);
