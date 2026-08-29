import { z } from "zod";

export const interviewQuestionSchema = z.object({
  questionText: z.string().min(1, "questionText must not be empty").describe("The interview question to ask."),
  category: z.string().min(1, "category must not be empty").describe("The topic category, e.g., 'React', 'System Design', 'Behavioral'"),
  difficulty: z.enum(["easy", "medium", "hard"]).describe("The difficulty level of the question"),
  expectedConcepts: z.array(z.string()).describe("List of key concepts or keywords expected in a good answer"),
  followUpStrategy: z.string().default("Ask a focused follow-up based on the candidate's depth and specificity."),
  generationSource: z.enum(["ai", "deterministic_fallback"]).default("ai"),
  fallbackReason: z.string().default("")
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
  relevance: z.enum(["High", "Medium", "Low"]).describe("How well did the answer address the specific question asked?"),
  correctness: z.enum(["High", "Medium", "Low"]).describe("Was the technical or factual information correct?"),
  depth: z.enum(["High", "Medium", "Low"]).describe("Did the candidate go into sufficient detail, or stay surface-level?"),
  specificity: z.enum(["High", "Medium", "Low"]).describe("Did they use concrete examples and metrics?"),
  structure: z.enum(["High", "Medium", "Low"]).describe("Was the answer logically structured (e.g., STAR method)?"),
  evidenceCollected: z.array(z.string()).describe("Specific strong points or phrases the candidate said that prove competence."),
  strengths: z.array(z.string()).describe("What the candidate did well in this answer."),
  weaknesses: z.array(z.string()).describe("Areas where the answer was weak or lacking."),
  missingConcepts: z.array(z.string()).describe("Important concepts the candidate failed to mention."),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Your confidence in this assessment based on the available transcript."),
  idealAnswer: z.object({
    text: z.string().describe("A well-structured, strong example answer to this question."),
    explanation: z.string().describe("Why this ideal answer is strong.")
  }),
  analysisSource: z.enum(["ai", "deterministic_fallback"]).default("ai"),
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
  metrics: z.object({
    correctness: z.number().min(0).max(100).describe("Score out of 100 for correctness"),
    efficiency: z.number().min(0).max(100).describe("Score out of 100 for algorithmic efficiency"),
    codeQuality: z.number().min(0).max(100).describe("Score out of 100 for readability and practices"),
    edgeCases: z.number().min(0).max(100).describe("Score out of 100 for handling edge cases")
  }),
  timeComplexity: z.string().describe("Big O time complexity"),
  spaceComplexity: z.string().describe("Big O space complexity"),
  strengths: z.array(z.string()).describe("Strengths of the code"),
  potentialIssues: z.array(z.string()).describe("Bugs or missing edge cases"),
  optimizationOpportunities: z.array(z.string()).describe("Ways to improve")
});
