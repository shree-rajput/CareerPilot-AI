import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";
import { createAccessToken } from "../utils/tokens.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail
} from "../services/email/emailService.js";

// Single-use short-lived authorization codes map (TTL: 5 minutes)
const extensionAuthCodes = new Map();

// Periodic cleanup of expired codes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of extensionAuthCodes.entries()) {
    if (data.expiresAt < now) {
      extensionAuthCodes.delete(code);
    }
  }
}, 60 * 1000);

function sendAuthResponse(res, user, statusCode = 200) {
  const accessToken = createAccessToken(user);

  return res.status(statusCode).json({
    accessToken,
    user: user.toSafeObject()
  });
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export const signup = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_IN_USE");
  }

  const passwordHash = await bcrypt.hash(req.body.password, env.bcryptSaltRounds);
  
  // Generate verification token (raw token sent to email, SHA-256 hash stored in DB)
  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const emailVerificationTokenHash = hashToken(rawVerificationToken);
  const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash,
    isEmailVerified: false,
    emailVerificationTokenHash,
    emailVerificationExpiresAt
  });

  // Async dispatch email without blocking signup HTTP response
  sendVerificationEmail({ user, token: rawVerificationToken }).catch((err) => {
    console.error("[Signup Email Error]:", err.message);
  });

  return sendAuthResponse(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  return sendAuthResponse(res, user);
});

export const logout = asyncHandler(async (_req, res) => {
  return res.status(200).json({ message: "Logged out" });
});

export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: req.user.toSafeObject() });
});

/**
 * Verifies email address using raw token from email URL
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError("Verification token is required", 400, "MISSING_TOKEN");
  }

  const hashed = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: hashed,
    emailVerificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError("Verification token is invalid or has expired", 400, "INVALID_VERIFICATION_TOKEN");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Email verified successfully! You now have full platform access.",
    user: user.toSafeObject()
  });
});

/**
 * Resends verification email to an unverified user
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Return generic success to prevent account enumeration
    return res.status(200).json({
      success: true,
      message: "If an unverified account exists for this email, a verification link has been sent."
    });
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: "Your email address is already verified."
    });
  }

  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(rawVerificationToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  sendVerificationEmail({ user, token: rawVerificationToken }).catch((err) => {
    console.error("[Resend Verification Email Error]:", err.message);
  });

  return res.status(200).json({
    success: true,
    message: "If an unverified account exists for this email, a verification link has been sent."
  });
});

/**
 * Forgot password request - generates token and sends reset link
 * Always returns generic success response to prevent email enumeration
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const genericResponse = {
    success: true,
    message: "If an account exists for this email, a password reset link has been sent."
  };

  if (!email) return res.status(200).json(genericResponse);

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const rawResetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = hashToken(rawResetToken);
  user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour TTL
  await user.save();

  sendPasswordResetEmail({ user, token: rawResetToken }).catch((err) => {
    console.error("[Forgot Password Email Error]:", err.message);
  });

  return res.status(200).json(genericResponse);
});

/**
 * Resets password using valid reset token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError("Token and new password are required", 400, "MISSING_FIELDS");
  }

  const hashed = hashToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: hashed,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError("Password reset token is invalid or has expired", 400, "INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  user.passwordHash = passwordHash;
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  // Invalidate any active extension codes for security
  for (const [code, data] of extensionAuthCodes.entries()) {
    if (data.userId === user._id.toString()) {
      extensionAuthCodes.delete(code);
    }
  }

  sendPasswordResetConfirmationEmail({ user }).catch((err) => {
    console.error("[Reset Confirmation Email Error]:", err.message);
  });

  return res.status(200).json({
    success: true,
    message: "Password reset successful! You can now log in with your new password."
  });
});

/**
 * Generate a short-lived (5 min), single-use authorization code for Chrome Extension
 */
export const generateExtensionCode = asyncHandler(async (req, res) => {
  const code = `ext_code_${crypto.randomBytes(24).toString("hex")}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;

  extensionAuthCodes.set(code, {
    userId: req.user._id.toString(),
    expiresAt
  });

  return res.status(200).json({
    code,
    expiresAt,
    user: req.user.toSafeObject()
  });
});

/**
 * Exchange a single-use authorization code for an extension access token
 */
export const exchangeExtensionCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    throw new AppError("Authorization code is required", 400, "MISSING_CODE");
  }

  const authData = extensionAuthCodes.get(code);

  if (!authData) {
    throw new AppError("Invalid or expired authorization code", 401, "INVALID_CODE");
  }

  if (authData.expiresAt < Date.now()) {
    extensionAuthCodes.delete(code);
    throw new AppError("Authorization code has expired", 401, "EXPIRED_CODE");
  }

  // Single-use: delete immediately upon first exchange
  extensionAuthCodes.delete(code);

  const user = await User.findById(authData.userId);

  if (!user) {
    throw new AppError("User account not found", 404, "USER_NOT_FOUND");
  }

  return sendAuthResponse(res, user);
});
