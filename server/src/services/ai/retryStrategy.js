import { groqChat } from "./groqProvider.js";
import { AppError } from "../../utils/errors.js";

/**
 * Executes a Groq Chat call with a robust retry strategy.
 * 
 * Strategy:
 * 1. Initial attempt.
 * 2. If provider rate-limited (handled inside groqProvider), it retries once there.
 * 3. If output fails validation (JSON or schema), we perform a specific targeted correction attempt.
 *    Instead of blindly re-prompting the entire context, we pass the bad JSON and ask it to fix it.
 */
export async function callWithRetry({ 
  systemPrompt, 
  userPrompt, 
  modelRole, 
  jsonMode = true, 
  maxTokens = 1024,
  validateFn, 
  featureName 
}) {
  // ── Attempt 1: Full Prompt ──────────────────────────────────────────────────
  let rawOutput;
  try {
    let initialMessages = [];
    if (Array.isArray(userPrompt)) {
      initialMessages = [{ role: "system", content: systemPrompt }, ...userPrompt];
    } else {
      initialMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
    }

    rawOutput = await groqChat(initialMessages, { jsonMode, modelRole, maxTokens });
  } catch (err) {
    throw err; // Propagate provider errors immediately
  }

  try {
    return validateFn(rawOutput); // Parses JSON, validates Schema, validates Evidence
  } catch (err) {
    // If it's not a schema or extraction error, throw
    if (err.code !== "VALIDATION_ERROR" && err.code !== "SCHEMA_MISMATCH") {
      throw err;
    }

    // ── Attempt 2: Targeted JSON Correction ─────────────────────────────────────
    console.warn(`[RetryStrategy] ${featureName}: Attempt 1 failed validation (${err.message}) — sending targeted correction.`);
    
    let correctionOutput;
    try {
      let correctionMessages = [];
      if (Array.isArray(userPrompt)) {
        correctionMessages = [
          { role: "system", content: systemPrompt },
          ...userPrompt,
          { role: "assistant", content: rawOutput },
          {
            role: "user",
            content: `Your previous response failed validation: ${err.message}. Please return ONLY a valid JSON object matching the required schema. Do not include markdown fences or explanations.`
          }
        ];
      } else {
        correctionMessages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "assistant", content: rawOutput },
          {
            role: "user",
            content: `Your previous response failed validation: ${err.message}. Please return ONLY a valid JSON object matching the required schema. Do not include markdown fences or explanations.`
          }
        ];
      }

      correctionOutput = await groqChat(correctionMessages, { jsonMode, modelRole });
    } catch (correctionErr) {
      throw correctionErr;
    }

    try {
      return validateFn(correctionOutput);
    } catch (finalErr) {
      console.error(`[RetryStrategy] Final validation failed for ${featureName}:`, finalErr.message);
      throw new AppError(
        `AI returned an invalid response for ${featureName} after correction attempt.`,
        502,
        "AI_INVALID_RESPONSE"
      );
    }
  }
}
