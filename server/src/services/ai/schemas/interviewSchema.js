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

export const interviewEvaluationSchema = z.object({
  technicalAccuracy: z.number().min(0).max(100).describe("Score out of 100 for technical correctness"),
  relevance: z.number().min(0).max(100).describe("Score out of 100 for staying on topic"),
  completeness: z.number().min(0).max(100).describe("Score out of 100 for addressing all parts of the question"),
  clarity: z.number().min(0).max(100).describe("Score out of 100 for how easy the answer was to understand"),
  structure: z.number().min(0).max(100).describe("Score out of 100 for logical flow (e.g., STAR method)"),
  communication: z.number().min(0).max(100).describe("Score out of 100 based on transcript flow and conciseness"),
  feedback: z.object({
    strengths: z.array(z.string()).describe("What the candidate did well in this answer"),
    weaknesses: z.array(z.string()).describe("Areas where the answer was weak or lacking")
  }),
  idealAnswer: z.object({
    text: z.string().describe("A well-structured, strong example answer to this question"),
    explanation: z.string().describe("Why this ideal answer is strong (structure, concepts included, etc.)")
  }),
  analysisSource: z.enum(["ai", "deterministic_fallback"]).default("ai"),
  fallbackReason: z.string().default("")
});
