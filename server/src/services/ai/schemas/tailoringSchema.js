import { z } from "zod";

const tailoringItemSchema = z.object({
  type: z.enum(["rephrase", "reorder", "highlight", "remove"]),
  section: z.enum(["skills", "experience", "projects", "summary", "education", "certifications"]),
  original: z.string().min(1),
  suggestion: z.string().min(1),
  reason: z.string().min(1)
});

export const tailoringSchema = z.array(tailoringItemSchema).min(1);
