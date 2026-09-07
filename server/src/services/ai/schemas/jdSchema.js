import { z } from "zod";

const safeStringArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val.map((x) => String(x ?? "")).filter(Boolean);
  if (typeof val === "string") return val.trim() ? [val.trim()] : [];
  if (val && typeof val === "object") return Object.values(val).map((x) => String(x ?? "")).filter(Boolean);
  return [];
}, z.array(z.string()).default([]));

export const jdStructureSchema = z.object({
  requiredSkills: safeStringArray,
  preferredSkills: safeStringArray,
  tools: safeStringArray,
  experienceLevel: z.string().default(""),
  educationRequirement: z.string().default(""),
  responsibilities: safeStringArray,
  softSkills: safeStringArray,
  keywords: safeStringArray
});

