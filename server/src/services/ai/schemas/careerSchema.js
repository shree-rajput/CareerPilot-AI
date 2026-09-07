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

export const copilotSchema = z.object({
  answer: z.string().default("").describe("Direct conversational answer or explanation."),
  keyPoints: safeStringArray,
  actionItems: safeStringArray,
  data: z.any().nullable().default(null).describe("Structured data object if applicable.")
}).passthrough();

export const resumeAnalysisSchema = z.object({
  summary: z.string().default(""),
  strengths: safeStringArray,
  weaknesses: safeStringArray,
  skills: safeStringArray,
  experience: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.any()).default([])),
  education: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.any()).default([])),
  recommendations: safeStringArray,
  parserConfidence: z.number().min(0).max(100).default(85)
});

export const atsAnalysisSchema = z.object({
  atsCompatibilityScore: z.number().min(0).max(100).default(75),
  status: z.string().default("VALID"),
  breakdown: z.record(z.any()).default({}),
  issues: safeStringArray,
  recommendations: safeStringArray,
  evidence: safeStringArray
});

export const jobMatchSchema = z.object({
  matchScore: z.number().min(0).max(100).default(70),
  requiredSkills: safeStringArray,
  preferredSkills: safeStringArray,
  matchedSkills: safeStringArray,
  missingSkills: safeStringArray,
  evidence: safeStringArray,
  recommendations: safeStringArray
});

export const preparationPlanSchema = z.object({
  currentLevel: z.string().default("Intermediate"),
  weakSkills: safeStringArray,
  priorityTopics: safeStringArray,
  dailyTasks: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.any()).default([])),
  reasoning: safeStringArray,
  nextBestAction: z.string().default("")
});

export const projectKitSchema = z.object({
  kit: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(
    z.object({
      question: z.string().default(""),
      category: z.string().default("Technical"),
      difficulty: safeEnum(["easy", "medium", "hard"], "medium")
    })
  ).default([]))
});

export const prepPlanSchema = preparationPlanSchema;

export const copilotChatSchema = z.object({
  reply: z.any().optional().transform((val) => {
    if (typeof val === "string") return val;
    if (val && typeof val === "object") {
      return val.reply || val.content || val.text || val.message || val.answer || val.response || "";
    }
    return "";
  }),
  content: z.any().optional().transform((val) => {
    if (typeof val === "string") return val;
    if (val && typeof val === "object") {
      return val.content || val.reply || val.text || val.message || val.answer || "";
    }
    return "";
  }),
  sections: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.object({
    type: z.string().optional().default("text"),
    title: z.string().optional().default(""),
    content: z.string().optional().default(""),
    language: z.string().optional().default(""),
    items: z.preprocess((v) => (Array.isArray(v) ? v.map((x) => String(x || "")) : []), z.array(z.string()).optional().default([])),
    intent: z.string().optional().default("info"),
  })).optional().default([])),
  suggestedActions: z.any().optional().transform((val) => {
    if (!Array.isArray(val)) return [];
    return val.map((item) => (typeof item === "string" ? item : item?.label || item?.text || item?.title || String(item || ""))).filter(Boolean);
  }),
  keyPoints: safeStringArray,
  actionItems: safeStringArray,
  data: z.any().optional().default(null)
}).passthrough();

export const mentorExplanationSchema = z.object({
  explanation: z.string().default("")
});

export const mentorSummarySchema = z.object({
  summary: z.string().default(""),
  actionItems: safeStringArray
});

export const projectRealityCheckSchema = z.object({
  status: safeEnum(["Fully Verified", "Partially Verified", "Unverified"], "Partially Verified"),
  verifiedClaims: safeStringArray,
  unverifiedClaims: safeStringArray,
  confidenceScore: z.number().min(0).max(100).default(75),
  explanation: z.string().default("")
});

export const coverLetterSchema = z.object({
  coverLetter: z.string().default(""),
  wordCount: z.number().optional().default(250),
  highlightsUsed: safeStringArray
});

export const recruiterMessageSchema = z.object({
  message: z.string().default(""),
  type: z.string().optional().default("outreach"),
  subjectLine: z.string().optional().default("")
});

export const copilotContextPlanSchema = z.object({
  intent: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase().trim() : "general"),
    z.string().default("general")
  ),
  entities: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return [];
      return val.map((e) => {
        if (typeof e === "string") return { type: "general", name: e, description: e };
        if (e && typeof e === "object") {
          return {
            type: String(e.type || e.category || "general"),
            id: e.id ? String(e.id) : undefined,
            name: e.name ? String(e.name) : undefined,
            description: e.description ? String(e.description) : undefined
          };
        }
        return { type: "general", description: String(e || "") };
      });
    },
    z.array(
      z.object({
        type: z.string().default("general"),
        id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional()
      })
    ).default([])
  ),
  sources: safeStringArray
});

