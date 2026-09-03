import { z } from "zod";

export const projectKitSchema = z.object({
  kit: z.array(
    z.object({
      question: z.string(),
      category: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"])
    })
  )
});

export const prepPlanSchema = z.object({
  actionItems: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
      estimatedTimeMinutes: z.number().int(),
      source: z.string()
    })
  )
});

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
  })
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

