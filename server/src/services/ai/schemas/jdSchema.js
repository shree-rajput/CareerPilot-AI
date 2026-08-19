import { z } from "zod";

export const jdStructureSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  experienceLevel: z.string().default(""),
  educationRequirement: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([])
});
