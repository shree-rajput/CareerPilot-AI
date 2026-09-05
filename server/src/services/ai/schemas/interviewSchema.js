import { z } from "zod";

export const dsaSolutionSchema = z.object({
  summary: z.string().default(""),
  approach: z.array(z.string()).default([]),
  algorithm: z.string().default(""),
  correctness: z.string().default("Verified"),
  complexity: z.object({
    time: z.string().default("O(N)"),
    space: z.string().default("O(1)")
  }).default({ time: "O(N)", space: "O(1)" }),
  code: z.string().default(""),
  edgeCases: z.array(z.string()).default([]),
  interviewTip: z.string().default("")
});

export const codeReviewStandardSchema = z.object({
  summary: z.string().default(""),
  bugs: z.array(z.string()).default([]),
  correctnessIssues: z.array(z.string()).default([]),
  performanceIssues: z.array(z.string()).default([]),
  securityIssues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  improvedCode: z.string().default("")
});

export const systemDesignSchema = z.object({
  requirements: z.array(z.string()).default([]),
  architecture: z.array(z.string()).default([]),
  dataFlow: z.array(z.string()).default([]),
  database: z.record(z.any()).default({}),
  scaling: z.array(z.string()).default([]),
  bottlenecks: z.array(z.string()).default([]),
  tradeoffs: z.array(z.string()).default([]),
  missingAreas: z.array(z.string()).default([]),
  score: z.number().min(0).max(100).default(75),
  nextQuestion: z.string().nullable().default(null)
});

export const interviewEvaluationStandardSchema = z.object({
  overallScore: z.number().min(0).max(100).default(75),
  communication: z.record(z.any()).default({}),
  technicalKnowledge: z.record(z.any()).default({}),
  problemSolving: z.record(z.any()).default({}),
  correctness: z.record(z.any()).default({}),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  nextQuestion: z.string().nullable().default(null)
});

export const interviewQuestionSchema = z.object({
  questionText: z.string().min(1, "questionText must not be empty").describe("The interview question to ask."),
  category: z.string().min(1, "category must not be empty").describe("The topic category, e.g., 'React', 'System Design', 'Behavioral'"),
  difficulty: z.enum(["easy", "medium", "hard"]).describe("The difficulty level of the question"),
  expectedConcepts: z.array(z.string()).describe("List of key concepts or keywords expected in a good answer"),
  followUpStrategy: z.string().default("Ask a focused follow-up based on the candidate's depth and specificity."),
  generationSource: z.enum(["ai", "deterministic_fallback"]).default("ai"),
  fallbackReason: z.string().default("")
});

export const interviewChallengeSchema = z.object({
  question: z.string().describe("The actual coding question description and requirements."),
  technology: z.string().describe("The primary technology or framework (e.g. 'React', 'Node.js', or just 'Algorithms')."),
  language: z.string().describe("The primary language expected (e.g. 'javascript', 'python')."),
  difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty level."),
  functionName: z.string().default("solution").describe("The camelCase function name, e.g. 'solution', 'twoSum', 'findMax'."),
  parameters: z.array(z.object({
    name: z.string().describe("Parameter variable name, e.g. 'arr', 'nums', 'target', 's', 'a', 'b'."),
    type: z.string().describe("Canonical language-agnostic type string: 'integer', 'float', 'boolean', 'string', 'integer[]', 'string[]', 'integer[][]', 'string[][]'. NEVER use 'Object' or 'any'.")
  })).describe("List of parameter definitions with exact canonical types."),
  returnType: z.string().describe("Canonical return type string: 'integer', 'float', 'boolean', 'string', 'integer[]', 'string[]', 'integer[][]', 'string[][]'."),
  starterCode: z.union([z.record(z.string()), z.string()]).optional().default({}),
  requirements: z.array(z.string()).describe("List of functional requirements."),
  constraints: z.array(z.string()).describe("List of technical constraints (e.g., O(n) time complexity)."),
  evaluationCriteria: z.array(z.string()).describe("What to look for when reviewing the code."),
  testCases: z.array(z.object({
    input: z.any().describe("The input arguments, formatted so they can be parsed or evaluated."),
    expectedOutput: z.any().describe("The expected return value or output."),
    explanation: z.string().describe("Why this test case is here."),
    hidden: z.boolean().describe("True if this test case should be hidden from the user before submission.")
  })).describe("A list of test cases to validate the solution.")
});

export const interviewPlanSchema = z.object({
  plan: z.array(z.object({
    section: z.string().describe("E.g., Introduction, Resume Deep Dive, Technical Core, System Design"),
    skill: z.string().describe("The specific skill being evaluated, e.g., React, Scalability, Leadership"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Target difficulty for this section"),
    objective: z.string().describe("What the interviewer should try to discover in this section"),
    evaluationCriteria: z.array(z.string()).describe("List of criteria to look for in the candidate's answers")
  }))
});

export const candidateContextSchema = z.object({
  summary: z.string().describe("A brief 2-3 sentence summary of the candidate's background relative to the target role."),
  relevantSkills: z.array(z.string()).describe("Skills from the candidate's resume that match the job description."),
  potentialGaps: z.array(z.string()).describe("Missing skills or areas of concern to probe during the interview.")
});

export const adaptiveActionSchema = z.object({
  action: z.enum(["FOLLOW_UP", "MOVE_FORWARD", "INCREASE_DIFFICULTY", "CLARIFY", "WRAP_UP"]).describe("The next logical step for the interviewer."),
  reason: z.string().describe("Internal reasoning for taking this action based on the candidate's last answer."),
  nextQuestionText: z.string().describe("The actual text of the next question or follow-up to ask."),
  expectedConcepts: z.array(z.string()).describe("Concepts expected in the answer to this next question.")
});

export const evidenceEvaluationSchema = z.object({
  answerStatus: z.enum([
    "CORRECT_ANSWER",
    "PARTIAL_ANSWER",
    "INCORRECT_ANSWER",
    "NO_ANSWER",
    "IRRELEVANT_ANSWER",
    "TRANSCRIPTION_FAILURE"
  ]).default("CORRECT_ANSWER"),
  evidence: z.object({
    demonstratedConcepts: z.array(z.string()).default([]),
    missingConcepts: z.array(z.string()).default([]),
    incorrectClaims: z.array(z.string()).default([]),
    reasoningSignals: z.array(z.string()).default([]),
    practicalSignals: z.array(z.string()).default([]),
    communicationSignals: z.object({
      clarity: z.string().default("Answer point is clear"),
      structure: z.string().default("Logical sequence"),
      relevance: z.string().default("Stays on topic"),
      conciseness: z.string().default("Concise and direct"),
      explanationQuality: z.string().default("Explains reasoning effectively")
    }).default({}),
    uncertaintyExpressed: z.boolean().default(false),
    isCorruptedTranscription: z.boolean().default(false)
  }).default({}),
  evidenceCollected: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missingConcepts: z.array(z.string()).default([]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  idealAnswer: z.object({
    text: z.string().default(""),
    explanation: z.string().default("")
  }).default({ text: "", explanation: "" }),
  analysisSource: z.enum(["ai", "deterministic_fallback", "deterministic_non_answer", "deterministic_transcription_failure"]).default("ai"),
  fallbackReason: z.string().default("")
});

export const coachingReportSchema = z.object({
  overallAssessment: z.string().describe("A professional, high-level summary of the candidate's interview performance."),
  whatYouDidWell: z.array(z.string()).describe("Specific, evidence-based strengths observed across the entire interview."),
  whatWentWrong: z.array(z.string()).describe("Specific areas where the candidate struggled, with examples."),
  whyItWentWrong: z.string().describe("A root-cause analysis of the weaknesses (e.g., 'You lack practical experience with scaling')."),
  howToImprove: z.array(z.string()).describe("Actionable steps to fix the weaknesses."),
  practicePlan: z.array(z.object({
    day: z.number().describe("Day number (1-7)"),
    focus: z.string().describe("The topic to focus on for this day"),
    action: z.string().describe("A specific task or exercise to complete")
  })).describe("A 7-day personalized practice plan.")
});

export const copilotSuggestionSchema = z.object({
  suggestedFollowUp: z.string().describe("A suggested follow-up question for the interviewer to ask"),
  reason: z.string().describe("Why this question is useful right now"),
  difficulty: z.string().describe("The difficulty of this follow-up")
});

export const codeReviewSchema = z.object({
  summary: z.string().default(""),
  bugs: z.array(z.string()).default([]),
  correctnessIssues: z.array(z.string()).default([]),
  performanceIssues: z.array(z.string()).default([]),
  securityIssues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  improvedCode: z.string().default(""),
  metrics: z.object({
    correctness: z.number().min(0).max(100).default(80),
    efficiency: z.number().min(0).max(100).default(80),
    codeQuality: z.number().min(0).max(100).default(80),
    edgeCases: z.number().min(0).max(100).default(80)
  }).optional(),
  timeComplexity: z.string().optional().default("O(N)"),
  spaceComplexity: z.string().optional().default("O(1)")
});

export const interviewerReactionSchema = z.object({
  reaction: z.string().min(1).describe("Short 1-3 sentence natural interviewer reaction to the candidate's last answer."),
  tone: z.enum(["affirming", "neutral", "probing", "redirecting"]).describe("The emotional tone of the reaction.")
});

export const codingFollowUpSchema = z.object({
  comment: z.string().min(1).describe("2-3 sentence natural code review comment from the interviewer."),
  followUpQuestion: z.string().min(1).describe("A specific verbal question about the code submitted, probing deeper understanding.")
});

export const techDiscussionEvaluationSchema = z.object({
  correctElements: z.array(z.string()).describe("List of correct technical points or patterns identified."),
  missingDetails: z.array(z.string()).describe("Important technical details or edge cases missed by candidate."),
  technicalCorrections: z.array(z.string()).describe("Direct technical corrections for errors or anti-patterns."),
  timeComplexity: z.string().default("N/A").describe("Analyzed Big-O time complexity."),
  spaceComplexity: z.string().default("N/A").describe("Analyzed Big-O space complexity."),
  communicationFeedback: z.string().default("").describe("Feedback on technical communication and clarity."),
  readinessScore: z.number().min(0).max(100).default(75).describe("Overall technical readiness score out of 100."),
  nextTargetedQuestion: z.string().default("").describe("ONE targeted question to advance to the next technical stage.")
});

export const techDiscussionNudgeSchema = z.object({
  level: z.number().min(1).max(4).default(1).describe("The hint level (1-4)."),
  nudgeText: z.string().min(1).describe("The targeted hint or socratic question."),
  keyTakeaway: z.string().min(1).describe("1 line key technical takeaway."),
  nextTargetedQuestion: z.string().default("").describe("ONE targeted follow-up question for the candidate.")
});

export const techDiscussionContextActionSchema = z.object({
  actionType: z.string().min(1).describe("The action type executed."),
  title: z.string().min(1).describe("Short title for the analysis output."),
  response: z.string().min(1).describe("Structured feedback or analysis in clean markdown."),
  stage: z.enum(["Approach", "Complexity", "Implementation", "Test Cases", "Evaluation", "Requirements", "Architecture", "Data Flow", "Trade-offs", "Bottlenecks"]).optional(),
  nextTargetedQuestion: z.string().default("").describe("ONE single targeted follow-up question.")
});
