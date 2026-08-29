import { executeAiTask } from "./orchestrator.js";


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
    relevance: words > 12 ? "Medium" : "Low",
    correctness: conceptScore > 50 ? "Medium" : "Low",
    depth: words > 30 ? "Medium" : "Low",
    specificity: conceptHits > 0 ? "Medium" : "Low",
    structure: structure > 50 ? "Medium" : "Low",
    evidenceCollected: [
      `Candidate spoke ${words} words.`,
      `Candidate hit ${conceptHits} out of ${expectedConcepts.length} expected concepts.`
    ],
    strengths: words > 20
      ? ["You provided enough content for a basic evaluation."]
      : ["You attempted the question and created a starting point for improvement."],
    weaknesses: [
      "AI evaluation was unavailable, so this is a conservative rules-based review.",
      expectedConcepts.length && conceptHits < expectedConcepts.length
        ? `Your answer did not clearly mention: ${expectedConcepts.filter((concept) => !lowerTranscript.includes(String(concept).toLowerCase())).slice(0, 4).join(", ")}.`
        : "Add more concrete implementation details and examples."
    ].filter(Boolean),
    missingConcepts: expectedConcepts.filter((concept) => !lowerTranscript.includes(String(concept).toLowerCase())),
    confidence: "LOW",
    idealAnswer: {
      text: `A stronger answer should directly define the concept, explain how it works, give a concrete example from your actual experience, discuss trade-offs, and close with the result or learning.`,
      explanation: "This structure is useful because it stays specific, evidence-based, and easy for an interviewer to follow."
    },
    analysisSource: "deterministic_fallback",
    fallbackReason: reason
  };
}

export async function structureResume(rawText) {
  return executeAiTask("STRUCTURE_RESUME", { rawText });
}

export async function extractJobDescription(jdText) {
  return executeAiTask("EXTRACT_JD", { jdText });
}

export async function generateInterviewQuestion(params) {
  try {
    return await executeAiTask("GENERATE_INTERVIEW_QUESTION", params);
  } catch (error) {
    console.error("[AI] Interview question fallback:", error.message);
    return buildFallbackInterviewQuestion(params, error.code || error.message);
  }
}

export async function evaluateInterviewAnswer(params) {
  try {
    return await executeAiTask("EVALUATE_INTERVIEW", params);
  } catch (error) {
    console.error("[AI] Interview evaluation fallback:", error.message);
    return buildFallbackInterviewEvaluation(params, error.code || error.message);
  }
}

export async function explainMatchResult(matchData) {
  return executeAiTask("EXPLAIN_MATCH_RESULT", matchData);
}

export async function generateTailoringRecommendations(params) {
  return executeAiTask("GENERATE_TAILORING", params);
}

export async function generateInterviewPlan(params) {
  try {
    return await executeAiTask("GENERATE_INTERVIEW_PLAN", params);
  } catch (error) {
    console.error("[AI] Interview plan fallback:", error.message);
    return {
      plan: [
        { questionText: "Introduce yourself and your experience.", category: "Introduction", difficulty: "easy", expectedConcepts: [] },
        { questionText: "Explain a technical challenge you faced.", category: "Behavioral", difficulty: "medium", expectedConcepts: [] }
      ]
    };
  }
}

export async function generateCopilotSuggestion(params) {
  return executeAiTask("GENERATE_COPILOT", params);
}

export async function analyzeCodeSubmission(params) {
  return executeAiTask("ANALYZE_CODE", params);
}

export async function extractCandidateContext(params) {
  return executeAiTask("EXTRACT_CANDIDATE_CONTEXT", params);
}

export async function adaptiveNextAction(params) {
  return executeAiTask("ADAPTIVE_NEXT_ACTION", params);
}

export async function generateCoachingReport(params) {
  return executeAiTask("GENERATE_COACHING_REPORT", params);
}

