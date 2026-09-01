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
  targetRoles: z.array(
    z.object({
      title: z.string().trim().min(1).max(80),
      techStack: z.array(z.string().trim()).default([]),
      isPrimary: z.boolean().default(false)
    })
  ).max(50).default([]).optional(),
  targetCompanies: nonEmptyStringArray.optional(),
  preferredLocations: nonEmptyStringArray.optional(),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "any"]).optional(),
  salaryExpectation: z.string().trim().max(100).optional(),
  placementDeadline: z.string().nullable().optional().transform(val => val ? new Date(val) : undefined),
  experienceLevel: z.enum(["student", "fresher", "intern", "junior"]).optional(),
  technicalSkills: nonEmptyStringArray.optional(),
  primaryTechStack: nonEmptyStringArray.optional(),
  interviewPreferences: z
    .object({
      defaultDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
      defaultInterviewType: z.enum(["technical", "hr", "project", "mixed"]).optional(),
      durationMinutes: z.number().optional(),
      techVsBehavioralRatio: z.enum(["technical_heavy", "balanced", "behavioral_heavy"]).optional(),
      preferredQuestionCategories: z.array(z.string()).optional(),
      adaptiveQuestioning: z.boolean().optional(),
      followUpQuestions: z.boolean().optional(),
      strictnessOfEvaluation: z.enum(["gentle", "standard", "strict"]).optional(),
      feedbackDepth: z.enum(["concise", "standard", "detailed"]).optional()
    })
    .optional(),
  aiPreferences: z
    .object({
      responseStyle: z.enum(["concise", "detailed"]).optional(),
      coachingStyle: z.enum(["encouraging", "rigorous", "socratic", "direct"]).optional(),
      hintBehavior: z.enum(["always", "on_request", "never"]).optional(),
      personalizedRecommendations: z.boolean().optional()
    })
    .optional(),
  preparationPreferences: z
    .object({
      dailyTargetMinutes: z.number().min(10).max(300).optional(),
      preferredLearningAreas: z.array(z.string()).optional(),
      difficultyPreference: z.enum(["easy", "medium", "hard", "adaptive"]).optional(),
      priorityTopics: z.array(z.string()).optional()
    })
    .optional(),
  notificationPreferences: z
    .object({
      applicationReminders: z.boolean().optional(),
      interviewReminders: z.boolean().optional(),
      preparationReminders: z.boolean().optional(),
      weeklySummaries: z.boolean().optional(),
      alerts: z.boolean().optional()
    })
    .optional()
});
