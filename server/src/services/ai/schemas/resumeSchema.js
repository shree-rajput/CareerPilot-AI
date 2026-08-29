import { z } from "zod";

const educationItemSchema = z.object({
  institution: z.string().default(""),
  degree: z.string().default(""),
  branch: z.string().default(""),
  startYear: z.string().default(""),
  endYear: z.string().default(""),
  gpa: z.string().default("")
});

const experienceItemSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default("")
});

const projectItemSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  link: z.string().default("")
});

const certificationItemSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default("")
});

export const resumeStructureSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  education: z.array(educationItemSchema).default([]),
  experience: z.array(experienceItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  achievements: z.array(z.string()).default([]),
  parserSource: z.string().default("ai")
});

export const resumeAnalysisResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  keywordCoverage: z.number().min(0).max(100),
  missingSkills: z.array(z.string()),
  foundSkills: z.array(z.string()),
  healthIndicators: z.object({
    ats: z.number(),
    match: z.number(),
    content: z.number(),
    clarity: z.number(),
    completeness: z.number()
  }),
  aiSuggestions: z.array(
    z.object({
      section: z.string(),
      sourceText: z.string(),
      suggestedText: z.string(),
      reason: z.string(),
      risk: z.enum(["low", "medium", "high"])
    })
  )
});

export const inlineSuggestionSchema = z.object({
  suggestion: z.string()
});

