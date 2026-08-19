import { z } from "zod";

const nonEmptyStringArray = z.array(z.string().trim().min(1).max(80)).max(50).default([]);

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).toLowerCase(),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(120).toLowerCase(),
  password: z.string().min(1).max(128)
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(25).optional(),
  education: z
    .object({
      institution: z.string().trim().max(120).optional(),
      degree: z.string().trim().max(120).optional(),
      branch: z.string().trim().max(120).optional(),
      graduationYear: z.number().int().min(1950).max(2100).optional()
    })
    .optional(),
  targetRoles: nonEmptyStringArray.optional(),
  preferredLocations: nonEmptyStringArray.optional(),
  experienceLevel: z.enum(["student", "fresher", "intern", "junior"]).optional(),
  technicalSkills: nonEmptyStringArray.optional(),
  primaryTechStack: nonEmptyStringArray.optional(),
  interviewPreferences: z
    .object({
      defaultDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
      defaultInterviewType: z.enum(["technical", "hr", "project", "mixed"]).optional()
    })
    .optional()
});
