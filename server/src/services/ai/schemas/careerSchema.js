import { z } from "zod";

export const copilotSchema = z.object({
  answer: z.string().describe("Direct conversational answer or explanation."),
  keyPoints: z.array(z.string()).default([]).describe("Key takeaways or bullet points."),
  actionItems: z.array(z.string()).default([]).describe("Actionable steps."),
  data: z.any().nullable().default(null).describe("Structured data object if applicable.")
}).passthrough();

export const resumeAnalysisSchema = z.object({
  summary: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.any()).default([]),
  education: z.array(z.any()).default([]),
  recommendations: z.array(z.string()).default([]),
  parserConfidence: z.number().min(0).max(100).default(85)
});

export const atsAnalysisSchema = z.object({
  atsCompatibilityScore: z.number().min(0).max(100).default(75),
  status: z.string().default("VALID"),
  breakdown: z.record(z.any()).default({}),
  issues: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([])
});

export const jobMatchSchema = z.object({
  matchScore: z.number().min(0).max(100).default(70),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([])
});

export const preparationPlanSchema = z.object({
  currentLevel: z.string().default("Intermediate"),
  weakSkills: z.array(z.string()).default([]),
  priorityTopics: z.array(z.string()).default([]),
  dailyTasks: z.array(z.any()).default([]),
  reasoning: z.array(z.string()).default([]),
  nextBestAction: z.string().default("")
});

export const projectKitSchema = z.object({
  kit: z.array(
    z.object({
      question: z.string(),
      category: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"])
    })
  )
});

export const prepPlanSchema = preparationPlanSchema;

export const copilotChatSchema = z.object({
  reply: z.any().optional().transform((val) => {
    if (typeof val === "string") return val;
    if (val && typeof val === "object") {
      return val.reply || val.content || val.text || val.message || val.answer || val.response || JSON.stringify(val);
    }
    return "";
  }),
  suggestedActions: z.any().optional().transform((val) => {
    if (!Array.isArray(val)) return [];
    return val.map((item) => (typeof item === "string" ? item : item?.label || item?.text || item?.title || String(item || ""))).filter(Boolean);
  }),
  keyPoints: z.array(z.string()).optional().default([]),
  actionItems: z.array(z.string()).optional().default([]),
  data: z.any().optional().default(null)
}).passthrough();

export const mentorExplanationSchema = z.object({
  explanation: z.string()
});

export const mentorSummarySchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.string())
});

export const projectRealityCheckSchema = z.object({
  status: z.enum(["Fully Verified", "Partially Verified", "Unverified"]),
  verifiedClaims: z.array(z.string()),
  unverifiedClaims: z.array(z.string()),
  confidenceScore: z.number().min(0).max(100),
  explanation: z.string()
});

export const coverLetterSchema = z.object({
  coverLetter: z.string(),
  wordCount: z.number().optional(),
  highlightsUsed: z.array(z.string()).optional()
});

export const recruiterMessageSchema = z.object({
  message: z.string(),
  type: z.string().optional(),
  subjectLine: z.string().optional()
});
