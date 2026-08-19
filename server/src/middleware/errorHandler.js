import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.message || "Something went wrong",
    code: error.code || "SERVER_ERROR",
    stack: env.nodeEnv === "development" ? error.stack : undefined
  });
}
