import { z } from "zod";

const safeStringArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val.map((x) => String(x ?? "")).filter(Boolean);
  if (typeof val === "string") return val.trim() ? [val.trim()] : [];
  if (val && typeof val === "object") return Object.values(val).map((x) => String(x ?? "")).filter(Boolean);
  return [];
}, z.array(z.string()).default([]));

function safeEnum(values, defaultValue) {
  const normalized = values.map((v) => String(v).toLowerCase());
  return z.preprocess((val) => {
    if (!val) return defaultValue;
    const s = String(val).trim().toLowerCase();
    const idx = normalized.indexOf(s);
    if (idx !== -1) return values[idx];
    return defaultValue;
  }, z.enum(values).default(defaultValue));
}

export const dsaSolutionSchema = z.object({
  summary: z.string().default(""),
  approach: safeStringArray,
  algorithm: z.string().default(""),
  correctness: z.string().default("Verified"),
  complexity: z.preprocess((val) => (val && typeof val === "object" ? val : {}), z.object({
    time: z.string().default("O(N)"),
    space: z.string().default("O(1)")
  }).default({ time: "O(N)", space: "O(1)" })),
  code: z.string().default(""),
  edgeCases: safeStringArray,
  interviewTip: z.string().default("")
});

export const codeReviewStandardSchema = z.object({
  summary: z.string().default(""),
  bugs: safeStringArray,
  correctnessIssues: safeStringArray,
  performanceIssues: safeStringArray,
  securityIssues: safeStringArray,
  suggestions: safeStringArray,
  improvedCode: z.string().default("")
});

export const systemDesignSchema = z.object({
  requirements: safeStringArray,
  architecture: safeStringArray,
  dataFlow: safeStringArray,
  database: z.record(z.any()).default({}),
  scaling: safeStringArray,
  bottlenecks: safeStringArray,
  tradeoffs: safeStringArray,
  missingAreas: safeStringArray,
  score: z.number().min(0).max(100).default(75),
  nextQuestion: z.string().nullable().default(null)
});

export const interviewEvaluationStandardSchema = z.object({
  overallScore: z.number().min(0).max(100).default(75),
  communication: z.record(z.any()).default({}),
  technicalKnowledge: z.record(z.any()).default({}),
  problemSolving: z.record(z.any()).default({}),
  correctness: z.record(z.any()).default({}),
  strengths: safeStringArray,
  weaknesses: safeStringArray,
  improvements: safeStringArray,
  nextQuestion: z.string().nullable().default(null)
});

export const interviewQuestionSchema = z.preprocess((rawObj) => {
  if (!rawObj || typeof rawObj !== "object") return rawObj;
  const obj = { ...rawObj };
  if (!obj.questionText || typeof obj.questionText !== "string" || !obj.questionText.trim()) {
    obj.questionText = obj.question || obj.text || obj.prompt || obj.description || obj.questionText || "";
  }
  return obj;
}, z.object({
  questionText: z.string().default("Describe a challenging technical problem you solved.").describe("The interview question to ask."),
  category: z.string().default("Technical Core").describe("The topic category, e.g., 'React', 'System Design', 'Behavioral'"),
  difficulty: safeEnum(["easy", "medium", "hard"], "medium"),
  expectedConcepts: safeStringArray,
  followUpStrategy: z.string().default("Ask a focused follow-up based on the candidate's depth and specificity."),
  generationSource: safeEnum(["ai", "deterministic_fallback"], "ai"),
  fallbackReason: z.string().default("")
}));

export const interviewChallengeSchema = z.object({
  question: z.string().default("Solve the problem."),
  technology: z.string().default("Algorithms"),
  language: z.string().default("javascript"),
  difficulty: safeEnum(["easy", "medium", "hard"], "medium"),
  functionName: z.string().default("solution"),
  parameters: z.preprocess((val) => {
    if (!Array.isArray(val)) return [];
    return val.map((p) => {
      if (typeof p === "string") return { name: p, type: "string" };
      if (p && typeof p === "object") return { name: String(p.name || "param"), type: String(p.type || "string") };
      return { name: "param", type: "string" };
    });
  }, z.array(z.object({
    name: z.string().default("param"),
    type: z.string().default("string")
  })).default([])),
  returnType: z.string().default("string"),
  starterCode: z.union([z.record(z.string()), z.string()]).optional().default({}),
  requirements: safeStringArray,
  constraints: safeStringArray,
  evaluationCriteria: safeStringArray,
  testCases: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.object({
    input: z.any().default(null),
    expectedOutput: z.any().default(null),
    explanation: z.string().default("Test case"),
    hidden: z.boolean().default(false)
  })).default([]))
});

export const interviewPlanSchema = z.object({
  plan: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.object({
    section: z.string().default("Core Evaluation"),
    skill: z.string().default("Problem Solving"),
    difficulty: safeEnum(["easy", "medium", "hard"], "medium"),
    objective: z.string().default("Assess candidate capability"),
    evaluationCriteria: safeStringArray
  })).default([]))
});

export const candidateContextSchema = z.object({
  summary: z.string().default("Candidate profile summary."),
  relevantSkills: safeStringArray,
  potentialGaps: safeStringArray
});

export const adaptiveActionSchema = z.object({
  action: safeEnum(["FOLLOW_UP", "MOVE_FORWARD", "INCREASE_DIFFICULTY", "CLARIFY", "WRAP_UP"], "FOLLOW_UP"),
  reason: z.string().default("Logical progression"),
  nextQuestionText: z.string().default("Can you elaborate on your solution?"),
  expectedConcepts: safeStringArray
});

export const evidenceEvaluationSchema = z.object({
  answerStatus: safeEnum([
    "CORRECT_ANSWER",
    "PARTIAL_ANSWER",
    "INCORRECT_ANSWER",
    "NO_ANSWER",
    "IRRELEVANT_ANSWER",
    "TRANSCRIPTION_FAILURE"
  ], "CORRECT_ANSWER"),
  evidence: z.preprocess((val) => (val && typeof val === "object" ? val : {}), z.object({
    demonstratedConcepts: safeStringArray,
    missingConcepts: safeStringArray,
    incorrectClaims: safeStringArray,
    reasoningSignals: safeStringArray,
    practicalSignals: safeStringArray,
    communicationSignals: z.preprocess((val) => (val && typeof val === "object" ? val : {}), z.object({
      clarity: z.string().default("Answer point is clear"),
      structure: z.string().default("Logical sequence"),
      relevance: z.string().default("Stays on topic"),
      conciseness: z.string().default("Concise and direct"),
      explanationQuality: z.string().default("Explains reasoning effectively")
    }).default({})),
    uncertaintyExpressed: z.boolean().default(false),
    isCorruptedTranscription: z.boolean().default(false)
  }).default({})),
  evidenceCollected: safeStringArray,
  strengths: safeStringArray,
  weaknesses: safeStringArray,
  missingConcepts: safeStringArray,
  confidence: safeEnum(["HIGH", "MEDIUM", "LOW"], "MEDIUM"),
  idealAnswer: z.preprocess((val) => (val && typeof val === "object" ? val : {}), z.object({
    text: z.string().default(""),
    explanation: z.string().default("")
  }).default({ text: "", explanation: "" })),
  analysisSource: safeEnum(["ai", "deterministic_fallback", "deterministic_non_answer", "deterministic_transcription_failure"], "ai"),
  fallbackReason: z.string().default("")
});

export const coachingReportSchema = z.object({
  overallAssessment: z.string().default("Solid overall performance."),
  whatYouDidWell: safeStringArray,
  whatWentWrong: safeStringArray,
  whyItWentWrong: z.string().default("Focus on deepening fundamental understanding."),
  howToImprove: safeStringArray,
  practicePlan: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.object({
    day: z.number().default(1),
    focus: z.string().default("Core Practice"),
    action: z.string().default("Complete practice exercises")
  })).default([]))
});

export const copilotSuggestionSchema = z.object({
  suggestedFollowUp: z.string().default("How would you scale this approach?"),
  reason: z.string().default("Evaluate architectural depth."),
  difficulty: z.string().default("medium")
});

export const codeReviewSchema = z.object({
  summary: z.string().default(""),
  bugs: safeStringArray,
  correctnessIssues: safeStringArray,
  performanceIssues: safeStringArray,
  securityIssues: safeStringArray,
  suggestions: safeStringArray,
  improvedCode: z.string().default(""),
  metrics: z.preprocess((val) => (val && typeof val === "object" ? val : {}), z.object({
    correctness: z.number().min(0).max(100).default(80),
    efficiency: z.number().min(0).max(100).default(80),
    codeQuality: z.number().min(0).max(100).default(80),
    edgeCases: z.number().min(0).max(100).default(80)
  }).optional()),
  timeComplexity: z.string().optional().default("O(N)"),
  spaceComplexity: z.string().optional().default("O(1)")
});

export const interviewerReactionSchema = z.object({
  reaction: z.string().default("That makes sense."),
  tone: safeEnum(["affirming", "neutral", "probing", "redirecting"], "neutral")
});

export const codingFollowUpSchema = z.object({
  comment: z.string().default("Nice solution."),
  followUpQuestion: z.string().default("Can you optimize the space complexity further?")
});

export const techDiscussionEvaluationSchema = z.object({
  correctElements: safeStringArray,
  missingDetails: safeStringArray,
  technicalCorrections: safeStringArray,
  timeComplexity: z.string().default("N/A"),
  spaceComplexity: z.string().default("N/A"),
  communicationFeedback: z.string().default(""),
  readinessScore: z.number().min(0).max(100).default(75),
  nextTargetedQuestion: z.string().default("")
});

export const techDiscussionNudgeSchema = z.object({
  level: z.number().min(1).max(4).default(1),
  nudgeText: z.string().default("Consider edge cases."),
  keyTakeaway: z.string().default("Check constraints."),
  nextTargetedQuestion: z.string().default("")
});

export const techDiscussionContextActionSchema = z.object({
  actionType: z.string().default("Analysis"),
  title: z.string().default("Technical Overview"),
  response: z.string().default("Feedback summary."),
  stage: safeEnum(["Approach", "Complexity", "Implementation", "Test Cases", "Evaluation", "Requirements", "Architecture", "Data Flow", "Trade-offs", "Bottlenecks"], "Approach"),
  nextTargetedQuestion: z.string().default("")
});

