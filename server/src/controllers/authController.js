import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/errors.js";
import { createAccessToken } from "../utils/tokens.js";

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
