/**
 * Central AI service layer.
 *
 * All business logic calls go through here — never directly to groqProvider.
 * Every response is: LLM → jsonExtractor → Zod schema → DB
 *
 * Retry strategy: attempt once → if JSON invalid, retry once → graceful error.
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
 * Retries once if the first attempt yields invalid JSON.
 */
async function callWithValidation({ systemPrompt, userPrompt, zodSchema, featureName }) {
  async function attempt() {
    const raw = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    const parsed = extractJson(raw);
    if (!parsed) return null;
    const result = zodSchema.safeParse(parsed);
    return result.success ? result.data : null;
  }

  let result = await attempt();

  if (!result) {
    // One retry
    result = await attempt();
  }

  if (!result) {
    throw new AppError(
      `AI returned an invalid response for ${featureName}. Please try again.`,
      502,
      "AI_INVALID_RESPONSE"
    );
  }

  return result;
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
 * @param {object} params
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
