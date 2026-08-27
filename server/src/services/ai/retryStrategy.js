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
export async function callWithRetry({ systemPrompt, userPrompt, modelRole, jsonMode = true, validateFn, featureName }) {
  // ── Attempt 1: Full Prompt ──────────────────────────────────────────────────
  let rawOutput;
  try {
    rawOutput = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], { jsonMode, modelRole }); // Pass modelRole down to groqProvider (we'll update groqProvider soon)
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
      correctionOutput = await groqChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        { role: "assistant", content: rawOutput },
        {
          role: "user",
          content: `Your previous response failed validation: ${err.message}. Please return ONLY a valid JSON object matching the required schema. Do not include markdown fences or explanations.`
        }
      ], { jsonMode, modelRole });
    } catch (correctionErr) {
      throw correctionErr;
    }

    try {
      return validateFn(correctionOutput);
    } catch {
      throw new AppError(
        `AI returned an invalid response for ${featureName} after correction attempt.`,
        502,
        "AI_INVALID_RESPONSE"
      );
    }
  }
}
