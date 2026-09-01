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
  architecture: z.string().optional().default(""),
  frontend: z.string().optional().default(""),
  backend: z.string().optional().default(""),
  database: z.string().optional().default(""),
  deployment: z.string().optional().default(""),
  keyResponsibilities: z.array(z.string()).optional().default([]),
  link: z.string().default(""),
  problemSolved: z.string().default(""),
  technicalComplexity: z.string().default(""),
  userImpact: z.string().default(""),
  role: z.string().default(""),
  confidence: z.number().min(0).max(100).default(100)
});

const certificationItemSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default("")
});

const skillEntitySchema = z.object({
  canonicalName: z.string().describe("The normalized, universally accepted name of the skill (e.g., 'React' instead of 'ReactJS' or 'react framework')"),
  originalMention: z.string().describe("The exact string found in the resume"),
  category: z.enum([
    "language", "framework", "library", "database", "tool", "cloud", 
    "concept", "domain", "soft_skill", "certification", "other"
  ]).default("other").describe("The broad category of the skill/technology"),
  // Source provenance: where this skill was found in the resume
  source: z.enum([
    "skills_section", "experience", "project", "certification", "education", "summary"
  ]).optional().default("skills_section").describe("Where this skill was explicitly mentioned in the resume"),
  proficiency: z.enum(["strong", "intermediate", "familiar", "emerging"]).default("emerging").describe("Inferred strength of the skill based on resume evidence"),
  confidence: z.number().min(0).max(100).default(100),
  evidence: z.string().default("").describe("Why this proficiency was assigned (e.g. 'Used in 3 projects')")
});

export const resumeStructureSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().default(""),
  skills: z.array(skillEntitySchema).default([]),
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

