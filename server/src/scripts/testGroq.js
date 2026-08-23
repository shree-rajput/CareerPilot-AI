/**
 * End-to-end Groq AI smoke test.
 * Run: node --env-file=.env src/scripts/testGroq.js
 */

import dotenv from "dotenv";
dotenv.config();

// Sanitize model — same logic as env.js
function sanitizeModel(raw, fallback) {
  if (!raw || typeof raw !== "string") return fallback;
  const clean = raw.split(/[\s|]+/)[0].trim();
  return clean || fallback;
}

const apiKey = process.env.GROQ_API_KEY;
const model = sanitizeModel(process.env.GROQ_MODEL, "groq/compound");

console.log("=== Groq Smoke Test ===");
console.log("Groq configured:", Boolean(apiKey));
console.log("Groq model:", model);

if (!apiKey) {
  console.error("ERROR: GROQ_API_KEY is not set.");
  process.exit(1);
}

// Test 1: minimal chat completion
console.log("\n--- Test 1: Basic chat completion ---");
const body1 = JSON.stringify({
  model,
  messages: [{ role: "user", content: "Reply with just the word OK" }],
  max_tokens: 10,
  temperature: 0,
});

const r1 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: body1,
});

if (!r1.ok) {
  const err = await r1.text();
  console.error(`FAIL [${r1.status}]:`, err);
  process.exit(1);
}

const d1 = await r1.json();
console.log("Reply:", d1.choices[0].message.content.trim());
console.log("PASS: basic chat works.");

// Test 2: JSON extraction (mirrors aiService callWithValidation)
console.log("\n--- Test 2: Structured JSON extraction ---");
const jdText = `
Senior Full Stack Engineer
Required: React, Node.js, PostgreSQL, AWS
Nice to have: TypeScript, Redis
Experience: 3-5 years
Education: Bachelor's in CS or related field
Responsibilities: Build scalable APIs, mentor junior developers, lead architecture decisions.
`;

const systemPrompt = `You are a precise job description analyst. Extract structured requirements from a job description and return ONLY a valid JSON object. No markdown, no explanation.`;
const userPrompt = `Extract structured requirements from the following job description. Return ONLY valid JSON.

REQUIRED JSON SCHEMA:
{
  "requiredSkills": ["must-have technical skills"],
  "preferredSkills": ["nice-to-have skills"],
  "tools": ["specific tools, platforms"],
  "experienceLevel": "string",
  "educationRequirement": "string",
  "responsibilities": ["main responsibilities"],
  "softSkills": ["soft skills"],
  "keywords": ["important terms"]
}

JOB DESCRIPTION:
---
${jdText}
---

Return ONLY the JSON object.`;

const body2 = JSON.stringify({
  model,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: 1024,
  temperature: 0.3,
});

const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: body2,
});

if (!r2.ok) {
  const err = await r2.text();
  console.error(`FAIL [${r2.status}]:`, err);
  process.exit(1);
}

const d2 = await r2.json();
const rawContent = d2.choices[0].message.content.trim();
console.log("Raw response (first 300 chars):", rawContent.slice(0, 300));

// Try to parse
try {
  const match = rawContent.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match?.[0] || rawContent);
  console.log("requiredSkills:", parsed.requiredSkills);
  console.log("experienceLevel:", parsed.experienceLevel);
  console.log("PASS: JD extraction works.");
} catch (e) {
  console.error("FAIL: JSON parsing failed:", e.message);
  process.exit(1);
}

console.log("\n=== All tests passed. Groq integration is working. ===");
