import { z } from "zod";

const stringArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") return [val];
  if (val && typeof val === "object") return Object.values(val).map(String);
  return [];
}, z.array(z.string()).default([]));

const codeObject = z.preprocess((val) => {
  if (typeof val === "string") {
    return { javascript: val, python: val, java: val, cpp: val };
  }
  if (val && typeof val === "object") {
    return val;
  }
  return {};
}, z.object({
  javascript: z.string().optional().default(""),
  python: z.string().optional().default(""),
  java: z.string().optional().default(""),
  cpp: z.string().optional().default("")
}).default({}));

export const dynamicQuestionSchema = z.object({
  title: z.string().min(1, "title is required").describe("Clear, descriptive title for the question"),
  openingPrompt: z.string().min(1, "openingPrompt is required").describe("Comprehensive problem statement, background context, and clear requirements"),
  mode: z.enum(["coding", "development", "system_design", "interview"]).default("coding").describe("Practice mode"),
  questionType: z.preprocess((val) => {
    const s = String(val || "").toLowerCase();
    if (["coding", "algorithm", "problem"].includes(s)) return "coding";
    if (["conceptual", "theory"].includes(s)) return "conceptual";
    if (["debugging", "fix"].includes(s)) return "debugging";
    if (["api_design", "api"].includes(s)) return "api_design";
    if (["system_design", "architecture"].includes(s)) return "system_design";
    if (["sql", "database"].includes(s)) return "sql";
    if (["scenario", "practical"].includes(s)) return "scenario";
    if (["tradeoff", "trade-off"].includes(s)) return "tradeoff";
    return "coding";
  }, z.enum([
    "conceptual",
    "coding",
    "debugging",
    "api_design",
    "system_design",
    "sql",
    "scenario",
    "tradeoff"
  ]).default("coding")),
  topic: z.preprocess((val) => String(val || "coding"), z.string().default("coding")),
  subtopic: z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  experienceLevel: z.enum(["fresher", "junior", "mid", "senior"]).default("fresher"),
  concepts: stringArray,
  expectedSkills: stringArray,
  supportedLanguages: z.array(z.string()).default(["javascript", "python", "java", "cpp"]),
  starterCode: codeObject,
  execution: z.object({
    type: z.enum(["function", "stdin"]).default("function"),
    mode: z.enum(["FUNCTION", "STDIN"]).default("FUNCTION"),
    functionName: z.string().default("solution"),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string()
    })).default([]),
    returnType: z.string().default("AUTO")
  }).optional(),
  testCases: z.array(z.object({
    input: z.any(),
    expectedOutput: z.any(),
    explanation: z.string().optional().default("Verification test case"),
    hidden: z.boolean().optional().default(false)
  })).default([]),
  referenceSolution: codeObject,
  constraints: stringArray,
  guidedFollowUps: stringArray,
  evaluationCriteria: stringArray
});
