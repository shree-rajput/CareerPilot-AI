/**
 * Central AI service layer.
 *
 * All business logic calls go through here — never directly to groqProvider.
 * Every response is: LLM → jsonExtractor → Zod schema → DB
 *
 * Retry strategy:
 *   Attempt 1: full prompt → extract JSON → Zod validate
 *   Attempt 2 (only if attempt 1 returns invalid JSON/fails Zod):
 *     Send a JSON-correction follow-up using the raw output from attempt 1.
 *     This uses fewer tokens and targets the actual failure, rather than
 *     blindly repeating the same prompt (which wastes a Groq API call).
 *   If both fail → throw AI_INVALID_RESPONSE (502).
 */

import { groqChat } from "./groqProvider.js";
import { extractJson } from "./jsonExtractor.js";
import { buildJdExtractionPrompt, JD_EXTRACTION_SYSTEM } from "./prompts/jdExtraction.js";
import { buildMatchExplanationPrompt, MATCH_EXPLANATION_SYSTEM } from "./prompts/matchExplanation.js";
import { buildResumeStructurePrompt, RESUME_STRUCTURE_SYSTEM } from "./prompts/resumeStructure.js";
import { buildTailoringPrompt, TAILORING_SYSTEM } from "./prompts/resumeTailoring.js";
import { jdStructureSchema } from "./schemas/jdSchema.js";
import { resumeStructureSchema } from "./schemas/resumeSchema.js";
import { tailoringSchema } from "./schemas/tailoringSchema.js";
import { generateQuestionPrompt, evaluateAnswerPrompt } from "./prompts/interviewPrompts.js";
import { interviewQuestionSchema, interviewEvaluationSchema } from "./schemas/interviewSchema.js";
import { AppError } from "../../utils/errors.js";

/**
 * Internal helper: call AI, extract JSON, validate with Zod.
 *
 * On attempt 1 failure (bad JSON or Zod mismatch):
 *   Send a JSON-correction request using the bad output so the model can fix
 *   only what is wrong — avoids a full duplicate Groq API call.
 *
 * On Groq provider 429:
 *   groqProvider already retries once with backoff.
 *   If still 429, re-throw — do NOT silently retry again here.
 */
async function callWithValidation({ systemPrompt, userPrompt, zodSchema, featureName }) {
  // ── Attempt 1: full prompt ──────────────────────────────────────────────────
  let rawOutput;
  try {
    rawOutput = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
  } catch (err) {
    // Groq-level error (429, 503, etc.) — propagate immediately, do not retry here
    // groqProvider already handles its own one-retry for 429.
    throw err;
  }

  const parsed1 = extractJson(rawOutput);
  if (parsed1) {
    const result1 = zodSchema.safeParse(parsed1);
    if (result1.success) return result1.data;
  }

  // ── Attempt 2: JSON correction (not a blind repeat) ─────────────────────────
  // We tell the model exactly what came back and ask it to fix just the JSON.
  // This is cheaper (shorter prompt) and more targeted than repeating the full prompt.
  console.warn(`[AI] ${featureName}: Attempt 1 returned invalid JSON — sending correction request`);

  let rawOutput2;
  try {
    rawOutput2 = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
      { role: "assistant", content: rawOutput },
      {
        role: "user",
        content:
          "Your previous response could not be parsed as valid JSON. " +
          "Please respond ONLY with a valid JSON object that matches the required schema. " +
          "Do not include any markdown fences, explanations, or extra text — " +
          "only the raw JSON object."
      }
    ]);
  } catch (err) {
    // If the correction call itself fails (e.g. a new 429), propagate it
    throw err;
  }

  const parsed2 = extractJson(rawOutput2);
  if (parsed2) {
    const result2 = zodSchema.safeParse(parsed2);
    if (result2.success) return result2.data;
  }

  // Both attempts failed — surface a clear error
  throw new AppError(
    `AI returned an invalid response for ${featureName}. Please try again.`,
    502,
    "AI_INVALID_RESPONSE"
  );
}

/**
 * Structure raw resume text into a validated JSON object.
 * @param {string} rawText
 * @returns {Promise<ResumeStructure>}
 */
export async function structureResume(rawText) {
  return callWithValidation({
    systemPrompt: RESUME_STRUCTURE_SYSTEM,
    userPrompt: buildResumeStructurePrompt(rawText),
    zodSchema: resumeStructureSchema,
    featureName: "resume structuring"
  });
}

/**
 * Extract structured requirements from a job description.
 * @param {string} jdText
 * @returns {Promise<JdStructure>}
 */
export async function extractJobDescription(jdText) {
  return callWithValidation({
    systemPrompt: JD_EXTRACTION_SYSTEM,
    userPrompt: buildJdExtractionPrompt(jdText),
    zodSchema: jdStructureSchema,
    featureName: "JD extraction"
  });
}

/**
 * Generate human-readable explanation for a match result.
 * AI writes the explanation only — it does NOT determine the score.
 * @param {object} matchData
 * @returns {Promise<string>} plain text explanation
 */
export async function explainMatchResult(matchData) {
  const text = await groqChat([
    { role: "system", content: MATCH_EXPLANATION_SYSTEM },
    { role: "user", content: buildMatchExplanationPrompt(matchData) }
  ]);
  return text.trim();
}

/**
 * Generate resume tailoring recommendations.
 * @param {object} params
 * @returns {Promise<TailoringRecommendation[]>}
 */
export async function generateTailoringRecommendations(params) {
  return callWithValidation({
    systemPrompt: TAILORING_SYSTEM,
    userPrompt: buildTailoringPrompt(params),
    zodSchema: tailoringSchema,
    featureName: "resume tailoring"
  });
}

/**
 * Generates an adaptive interview question.
 * @param {object} params - { targetRole, technologyStack, interviewType, difficulty,
 *                            jobDescription, previousQuestions, questionNumber, totalQuestions }
 */
export async function generateInterviewQuestion(params) {
  return callWithValidation({
    systemPrompt: "You are an expert technical interviewer conducting a mock interview.",
    userPrompt: generateQuestionPrompt(params),
    zodSchema: interviewQuestionSchema,
    featureName: "interview question generation"
  });
}

/**
 * Evaluates a candidate's answer based on transcript.
 * @param {object} params
 */
export async function evaluateInterviewAnswer(params) {
  return callWithValidation({
    systemPrompt: "You are an expert technical interviewer evaluating a candidate's answer.",
    userPrompt: evaluateAnswerPrompt(params),
    zodSchema: interviewEvaluationSchema,
    featureName: "interview answer evaluation"
  });
}
