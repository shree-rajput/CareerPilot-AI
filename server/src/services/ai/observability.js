import { env } from "../../config/env.js";

/**
 * AI Observability module.
 * Safely logs AI operations without exposing PII or API keys.
 */
export const aiLogger = {
  logOperation: ({ task, modelRole, latencyMs, success, retryCount, validationResult, tokens }) => {
    const logData = {
      timestamp: new Date().toISOString(),
      task,
      modelRole,
      latencyMs,
      success,
      retryCount,
      validationResult,
      tokens: tokens || "unknown"
    };
    
    // Ensure we don't log during tests unless failed
    if (env.nodeEnv !== "test" || !success) {
      console.log(`[AI Observability] ${JSON.stringify(logData)}`);
    }
  },

  logError: ({ task, error, category }) => {
    console.error(`[AI Error] Task: ${task} | Category: ${category} | Msg: ${error.message}`);
  }
};
