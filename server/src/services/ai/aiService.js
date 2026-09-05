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

  const demonstratedConcepts = expectedConcepts.filter((concept) =>
    lowerTranscript.includes(String(concept).toLowerCase())
  );
  const missingConcepts = expectedConcepts.filter((concept) =>
    !lowerTranscript.includes(String(concept).toLowerCase())
  );

  const isNoAnswer = /don't know|no idea|not sure|blank|don't have/i.test(transcript) || words < 3;

  const answerStatus = isNoAnswer
    ? "NO_ANSWER"
    : (demonstratedConcepts.length === expectedConcepts.length && expectedConcepts.length > 0)
    ? "CORRECT_ANSWER"
    : (demonstratedConcepts.length > 0)
    ? "PARTIAL_ANSWER"
    : "INCORRECT_ANSWER";

  const conceptHits = demonstratedConcepts.length;

  return {
    relevance: words > 12 ? "Medium" : "Low",
    correctness: conceptHits > 0 ? "Medium" : "Low",
    depth: words > 30 ? "Medium" : "Low",
    specificity: conceptHits > 0 ? "Medium" : "Low",
    structure: words > 15 ? "Medium" : "Low",
    answerStatus,
    evaluationStatus: "partial",
    evidence: {
      demonstratedConcepts,
      missingConcepts,
      incorrectClaims: [],
      reasoningSignals: [],
      practicalSignals: [],
      communicationSignals: {
        clarity: words > 10 ? "Understandable structure" : "Brevity noted",
        structure: words > 15 ? "Followed sequence" : "Direct response",
        relevance: words > 5 ? "On topic" : "Brief",
        conciseness: "Direct answer provided",
        explanationQuality: "Deterministic review based on transcript"
      },
      uncertaintyExpressed: isNoAnswer,
      isCorruptedTranscription: false
    },
    evidenceCollected: [
      `Candidate response contained ${words} words.`,
      `Demonstrated concepts: ${demonstratedConcepts.join(", ") || "None"}.`
    ],
    strengths: demonstratedConcepts.length > 0
      ? demonstratedConcepts.map(c => `Correctly identified concept: ${c}`)
      : (words > 10 ? ["Response was direct and on topic"] : []),
    weaknesses: missingConcepts.length > 0
      ? missingConcepts.map(m => `Missed expected concept: ${m}`)
      : (isNoAnswer ? ["Candidate gave no-answer response"] : []),
    missingConcepts,
    confidence: "MEDIUM",
    idealAnswer: {
      text: expectedConcepts.length > 0
        ? `A complete answer should address: ${expectedConcepts.join(", ")}.`
        : "Explain the core mechanics and trade-offs clearly.",
      explanation: "Basis: Deterministic rubric evaluation from transcript. Deep AI evaluation was unavailable."
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
    console.error("Failed to generate interview question:", error.stack || error);
    try {
      import('fs').then(fs => fs.writeFileSync('last_ai_error.log', error.stack || error.message));
    } catch (e) {}
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

export async function generateInterviewChallenge(params) {
  try {
    return await executeAiTask("GENERATE_INTERVIEW_CHALLENGE", params);
  } catch (error) {
    console.error("[AI] Interview challenge generation fallback:", error.message);
    throw new Error("Failed to generate coding challenge");
  }
}

export async function evaluateCodingChallenge(params) {
  return executeAiTask("ANALYZE_CODE", params);
}

/**
 * Generates a personalized opening greeting string using authenticated user profile.
 */
export function generatePersonalizedGreeting(user = {}, targetRole = null) {
  const resolvedRole = targetRole || user?.targetRoles?.find(r => r.isPrimary)?.title || user?.targetRoles?.[0]?.title || "Software Engineer";
  let name = "";
  if (typeof user?.firstName === "string" && user.firstName.trim()) {
    name = user.firstName.trim();
  } else if (typeof user?.name === "string" && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/);
    if (parts[0] && parts[0] !== "[object" && parts[0] !== "undefined" && parts[0] !== "null") {
      name = parts[0];
    }
  }

  if (name && name !== "undefined" && name !== "null" && name !== "[object Object]") {
    return `Hello ${name}! 👋 Welcome to your technical interview. I'll be asking you a few questions based on your profile and experience as a ${resolvedRole}. Take your time, think aloud when useful, and feel free to explain your approach. Ready to begin?`;
  }

  return `Hello! Welcome to your technical interview. I'll be asking you a few questions based on your profile and experience as a ${resolvedRole}. Take your time, think aloud when useful, and feel free to explain your approach. Ready to begin?`;
}

/**
 * Generates a short conversational reaction from the interviewer to the candidate's previous answer.
 * This powers the "human-like" layer: acknowledgement + natural transition into the next question.
 */
export async function generateInterviewerReaction(params) {
  try {
    return await executeAiTask("GENERATE_INTERVIEWER_REACTION", params);
  } catch (error) {
    console.error("[AI] Interviewer reaction fallback:", error.message);
    const evalObj = params.evaluation || {};
    const { correctness, depth, answerStatus } = evalObj;

    if (answerStatus === "NO_ANSWER" || params.transcript === "No idea" || params.transcript === "I don't know") {
      return { reaction: "That's okay. Not knowing a specific detail is completely normal in an interview. Let's move to the next area.", tone: "supportive" };
    }
    if (correctness === 'High' && depth === 'High') {
      return { reaction: "Good explanation. You identified the core mechanics clearly.", tone: "affirming" };
    } else if (correctness === 'Low') {
      return { reaction: "I see your approach. There's an important trade-off to consider here.", tone: "probing" };
    } else {
      return { reaction: "Okay. Let's build on that concept.", tone: "neutral" };
    }
  }
}

/**
 * After code submission, generates a conversational follow-up comment from the interviewer.
 * References specific aspects of the submitted code and transitions back to verbal Q&A.
 */
export async function generateCodingFollowUp(params) {
  try {
    return await executeAiTask("GENERATE_CODING_FOLLOWUP", params);
  } catch (error) {
    console.error("[AI] Coding follow-up fallback:", error.message);
    const passed = params.passedTests || 0;
    const total = params.totalTests || 0;
    if (passed === total && total > 0) {
      return {
        comment: "Your solution passed all test cases. I noticed you used a particular approach — what would happen if the input size scaled significantly?",
        followUpQuestion: "If this function had to handle millions of inputs, how would you optimize it?"
      };
    }
    return {
      comment: `Your solution passed ${passed} of ${total} test cases. Let's talk about the approach you took.`,
      followUpQuestion: "Can you walk me through your reasoning for the algorithm you chose?"
    };
  }
}
