import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Something went wrong";
  let code = error.code || "SERVER_ERROR";
  let field = error.field || undefined;
  let details = error.details || undefined;

  // Handle AI Provider & AI Validation Errors safely without leaking stack traces/API keys to user
  const isAiError = 
    code?.startsWith("AI_") || 
    message.includes("AxiosError") || 
    message.includes("groq") || 
    message.includes("Groq") ||
    message.includes("JSON") ||
    message.includes("Schema validation");

  if (isAiError && statusCode >= 500) {
    console.error("[AI Error Handler]", error.stack || error);
    message = "We couldn't complete the AI analysis right now. Your existing data is safe. Please try again.";
    code = "AI_SERVICE_TEMPORARILY_UNAVAILABLE";
  }

  // Handle Zod Validation Errors
  if (error.name === "ZodError") {
    statusCode = 400;
    message = "Validation Error";
    code = "VALIDATION_ERROR";
    details = error.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
    if (details.length > 0) field = details[0].path;
  }
  
  // Handle Mongoose Validation Errors
  if (error.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    details = Object.values(error.errors).map(e => ({ path: e.path, message: e.message }));
    const firstDetail = details.length > 0 ? `${details[0].path}: ${details[0].message}` : "";
    message = firstDetail ? `Database Validation Error (${firstDetail})` : "Database Validation Error";
    if (details.length > 0) field = details[0].path;
    console.error("[errorHandler] Mongoose ValidationError details:", details);
  }
  
  if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID or value for ${error.path}`;
    code = "INVALID_OBJECT_ID";
    field = error.path;
  }

  if (statusCode >= 500 && !isAiError) {
    console.error("[Server Error]", error);
  }

  // Standardized response compatible with legacy and structured clients
  res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
    error: {
      code,
      message,
      field,
      details
    },
    stack: env.nodeEnv === "development" && !isAiError ? error.stack : undefined
  });
}
