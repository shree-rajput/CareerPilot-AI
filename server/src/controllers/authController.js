import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";
import { createAccessToken } from "../utils/tokens.js";

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

export const signup = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_IN_USE");
  }

  const passwordHash = await bcrypt.hash(req.body.password, env.bcryptSaltRounds);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash
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
