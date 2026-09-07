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
  technologies: safeStringArray,
  architecture: z.string().optional().default(""),
  frontend: z.string().optional().default(""),
  backend: z.string().optional().default(""),
  database: z.string().optional().default(""),
  deployment: z.string().optional().default(""),
  keyResponsibilities: safeStringArray,
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
  canonicalName: z.string().default(""),
  originalMention: z.string().default(""),
  category: safeEnum([
    "language", "framework", "library", "database", "tool", "cloud", 
    "concept", "domain", "soft_skill", "certification", "other"
  ], "other"),
  source: safeEnum([
    "skills_section", "experience", "project", "certification", "education", "summary"
  ], "skills_section"),
  proficiency: safeEnum(["strong", "intermediate", "familiar", "emerging"], "emerging"),
  confidence: z.number().min(0).max(100).default(100),
  evidence: z.string().default("")
});

const safeSkillEntityArray = z.preprocess((val) => {
  if (!Array.isArray(val)) {
    if (typeof val === "string" && val.trim()) {
      return [{ canonicalName: val.trim(), originalMention: val.trim(), category: "other", source: "skills_section", proficiency: "intermediate", confidence: 90, evidence: "Extracted skill" }];
    }
    return [];
  }
  return val.map((item) => {
    if (typeof item === "string") {
      return { canonicalName: item, originalMention: item, category: "other", source: "skills_section", proficiency: "intermediate", confidence: 90, evidence: "Extracted skill" };
    }
    if (item && typeof item === "object") {
      return {
        canonicalName: String(item.canonicalName || item.name || item.skill || ""),
        originalMention: String(item.originalMention || item.name || item.skill || ""),
        category: item.category || "other",
        source: item.source || "skills_section",
        proficiency: item.proficiency || "emerging",
        confidence: typeof item.confidence === "number" ? item.confidence : 100,
        evidence: String(item.evidence || "")
      };
    }
    return { canonicalName: String(item || ""), originalMention: String(item || ""), category: "other", source: "skills_section", proficiency: "emerging", confidence: 100, evidence: "" };
  });
}, z.array(skillEntitySchema).default([]));

export const resumeStructureSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: safeStringArray,
  summary: z.string().default(""),
  skills: safeSkillEntityArray,
  education: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(educationItemSchema).default([])),
  experience: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(experienceItemSchema).default([])),
  projects: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(projectItemSchema).default([])),
  certifications: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(certificationItemSchema).default([])),
  achievements: safeStringArray,
  parserSource: z.string().default("ai")
});

export const resumeAnalysisResultSchema = z.object({
  matchScore: z.number().min(0).max(100).default(70),
  atsScore: z.number().min(0).max(100).default(70),
  keywordCoverage: z.number().min(0).max(100).default(70),
  missingSkills: safeStringArray,
  foundSkills: safeStringArray,
  healthIndicators: z.preprocess((val) => {
    if (val && typeof val === "object") return val;
    return { ats: 70, match: 70, content: 70, clarity: 70, completeness: 70 };
  }, z.object({
    ats: z.number().default(70),
    match: z.number().default(70),
    content: z.number().default(70),
    clarity: z.number().default(70),
    completeness: z.number().default(70)
  }).default({ ats: 70, match: 70, content: 70, clarity: 70, completeness: 70 })),
  aiSuggestions: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(
    z.object({
      section: z.string().default("Experience"),
      sourceText: z.string().default(""),
      suggestedText: z.string().default(""),
      reason: z.string().default(""),
      risk: safeEnum(["low", "medium", "high"], "medium")
    })
  ).default([]))
});

export const inlineSuggestionSchema = z.object({
  suggestion: z.string().default("")
});

export const resumeSuggestionsSchema = z.object({
  suggestions: z.preprocess((val) => Array.isArray(val) ? val : [], z.array(
    z.object({
      id: z.string().optional(),
      category: safeEnum([
        "HIGH_IMPACT",
        "RESUME_WORDING",
        "KEYWORD_OPPORTUNITIES",
        "MISSING_EVIDENCE",
        "PROJECT_EMPHASIS",
        "EXPERIENCE_EMPHASIS"
      ], "RESUME_WORDING"),
      priority: safeEnum(["high", "medium", "low"], "medium"),
      section: z.string().default("Experience"),
      title: z.string().default("Resume Suggestion"),
      evidenceSource: z.string().default("Supported by Candidate Profile"),
      requiresConfirmation: z.boolean().default(false),
      originalText: z.string().default(""),
      suggestedText: z.string().default(""),
      reason: z.string().default("")
    })
  ).default([]))
});



