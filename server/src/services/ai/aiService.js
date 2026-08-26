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
import { generateQuestionPrompt, evaluateAnswerPrompt, generateInterviewPlanPrompt, generateCopilotPrompt, analyzeCodePrompt } from "./prompts/interviewPrompts.js";
import { interviewQuestionSchema, interviewEvaluationSchema, interviewPlanSchema, copilotSuggestionSchema, codeReviewSchema } from "./schemas/interviewSchema.js";
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
async function callWithValidation({ systemPrompt, userPrompt, zodSchema, featureName, jsonMode = true }) {
  // ── Attempt 1: full prompt ──────────────────────────────────────────────────
  let rawOutput;
  try {
    rawOutput = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], { jsonMode });
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
    ], { jsonMode });
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

function chooseInterviewTopic(params = {}) {
  const stack = Array.isArray(params.technologyStack) ? params.technologyStack.filter(Boolean) : [];
  if (params.interviewType === "hr") return "Behavioral";
  if (params.interviewType === "project") return "Projects";
  if (params.interviewType === "mixed" && params.previousQuestions?.length) return "Behavioral";
  return stack[params.previousQuestions?.length % Math.max(stack.length, 1)] || params.targetRole || "Software Engineering";
}

export function buildFallbackInterviewQuestion(params = {}, reason = "AI service unavailable") {
  const topic = chooseInterviewTopic(params);
  const difficulty = ["easy", "medium", "hard"].includes(params.difficulty) ? params.difficulty : "medium";

  const questionText =
    topic === "Behavioral"
      ? `Tell me about a time you solved a difficult problem while working toward a ${params.targetRole || "target role"}. What was your action and result?`
      : topic === "Projects"
        ? "Pick one project from your resume and explain the architecture, your contribution, one major challenge, and how you solved it."
        : `Explain one important ${topic} concept you have used in your work or projects, including how it works and what trade-offs you considered.`;

  return {
    questionText,
    category: topic,
    difficulty,
    expectedConcepts:
      topic === "Behavioral"
        ? ["situation", "task", "action", "result", "specific evidence"]
        : topic === "Projects"
          ? ["architecture", "personal contribution", "challenge", "solution", "result"]
          : [topic, "implementation details", "trade-offs", "example"],
    followUpStrategy: "Ask why/how follow-ups based on the candidate's specificity and depth.",
    generationSource: "deterministic_fallback",
    fallbackReason: reason
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildFallbackInterviewEvaluation(params = {}, reason = "AI service unavailable") {
  const transcript = String(params.transcript || "").trim();
  const words = transcript ? transcript.split(/\s+/).length : 0;
  const expectedConcepts = params.expectedConcepts || [];
  const lowerTranscript = transcript.toLowerCase();
  const conceptHits = expectedConcepts.filter((concept) =>
    lowerTranscript.includes(String(concept).toLowerCase())
  ).length;
  const conceptScore = expectedConcepts.length
    ? (conceptHits / expectedConcepts.length) * 100
    : Math.min(80, words * 2);
  const relevance = words > 12 ? Math.max(45, conceptScore) : 25;
  const completeness = Math.min(85, Math.max(20, words * 1.5 + conceptHits * 12));
  const clarityPenalty = (params.metrics?.fillerWords || 0) * 4 + (params.metrics?.longPauses || 0) * 5;
  const clarity = clampScore(Math.min(82, 45 + Math.min(words, 60) * 0.5) - clarityPenalty);
  const structure = clampScore(transcript.match(/\b(first|second|because|for example|finally|result)\b/i) ? clarity + 8 : clarity - 8);
  const communication = clampScore(75 - clarityPenalty);

  return {
    technicalAccuracy: clampScore(conceptScore),
    relevance: clampScore(relevance),
    completeness: clampScore(completeness),
    clarity,
    structure,
    communication,
    feedback: {
      strengths: words > 20
        ? ["You provided enough content for a basic evaluation."]
        : ["You attempted the question and created a starting point for improvement."],
      weaknesses: [
        "AI evaluation was unavailable, so this is a conservative rules-based review.",
        expectedConcepts.length && conceptHits < expectedConcepts.length
          ? `Your answer did not clearly mention: ${expectedConcepts.filter((concept) => !lowerTranscript.includes(String(concept).toLowerCase())).slice(0, 4).join(", ")}.`
          : "Add more concrete implementation details and examples."
      ].filter(Boolean)
    },
    idealAnswer: {
      text: `A stronger answer should directly define the concept, explain how it works, give a concrete example from your actual experience, discuss trade-offs, and close with the result or learning.`,
      explanation: "This structure is useful because it stays specific, evidence-based, and easy for an interviewer to follow."
    },
    analysisSource: "deterministic_fallback",
    fallbackReason: reason
  };
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
  ], { jsonMode: false });
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
  try {
    return await callWithValidation({
      systemPrompt: "You are an expert technical interviewer conducting a mock interview. Return only valid JSON.",
      userPrompt: generateQuestionPrompt(params),
      zodSchema: interviewQuestionSchema,
      featureName: "interview question generation",
      jsonMode: true
    });
  } catch (error) {
    console.error("[AI] Interview question fallback:", error.message);
    return buildFallbackInterviewQuestion(params, error.code || error.message);
  }
}

/**
 * Evaluates a candidate's answer based on transcript.
 * @param {object} params
 */
export async function evaluateInterviewAnswer(params) {
  try {
    return await callWithValidation({
      systemPrompt: "You are an expert technical interviewer evaluating a candidate's answer. Return only valid JSON.",
      userPrompt: evaluateAnswerPrompt(params),
      zodSchema: interviewEvaluationSchema,
      featureName: "interview answer evaluation",
      jsonMode: true
    });
  } catch (error) {
    console.error("[AI] Interview evaluation fallback:", error.message);
  }
}

export async function generateInterviewPlan(params) {
  try {
    return await callWithValidation({
      systemPrompt: "You are an expert technical interviewer planning a structured interview. Return only valid JSON.",
      userPrompt: generateInterviewPlanPrompt(params),
      zodSchema: interviewPlanSchema,
      featureName: "interview plan generation",
      jsonMode: true
    });
  } catch (error) {
    console.error("[AI] Interview plan fallback:", error.message);
    // Simple fallback plan
    return {
      plan: [
        { questionText: "Introduce yourself and your experience.", category: "Introduction", difficulty: "easy", expectedConcepts: [] },
        { questionText: "Explain a technical challenge you faced.", category: "Behavioral", difficulty: "medium", expectedConcepts: [] }
      ]
    };
  }
}

export async function generateCopilotSuggestion(params) {
  return await callWithValidation({
    systemPrompt: "You are an AI Copilot assisting a human interviewer. Return only valid JSON.",
    userPrompt: generateCopilotPrompt(params),
    zodSchema: copilotSuggestionSchema,
    featureName: "copilot suggestion",
    jsonMode: true
  });
}

export async function analyzeCodeSubmission(params) {
  return await callWithValidation({
    systemPrompt: "You are an expert code reviewer. Return only valid JSON.",
    userPrompt: analyzeCodePrompt(params),
    zodSchema: codeReviewSchema,
    featureName: "code review",
    jsonMode: true
  });
}

