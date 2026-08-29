import { AppError } from "./errors.js";

/**
 * Helper to create an AppError with a specific status code and message.
 * Useful for Express next(createError(...)) pattern.
 * 
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} [code] - Optional internal error code
 * @returns {AppError} An AppError instance
 */
export function createError(statusCode, message, code = "APP_ERROR") {
  return new AppError(message, statusCode, code);
}
