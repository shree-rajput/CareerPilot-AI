export const JD_EXTRACTION_SYSTEM = `You are a precise job description analyst. Extract structured requirements from a job description and return ONLY a valid JSON object. No markdown, no explanation.

RULES:
- Extract only what is explicitly stated. Do not infer or guess.
- Separate required skills from preferred/nice-to-have skills.
- Tools are specific software/platforms (e.g. Jira, AWS, Docker) — list separately.
- Keywords are important terms/phrases that appear multiple times or seem emphasized.
- If a section is absent, return an empty array.`;

export function buildJdExtractionPrompt(jdText) {
  return `Extract structured requirements from the following job description. Return ONLY valid JSON.

REQUIRED JSON SCHEMA:
{
  "requiredSkills": ["array — must-have technical skills explicitly stated"],
  "preferredSkills": ["array — nice-to-have or bonus skills"],
  "tools": ["array — specific tools, platforms, cloud services mentioned"],
  "experienceLevel": "string — e.g. '0–1 years', 'Fresher', '2–4 years', etc.",
  "educationRequirement": "string — e.g. 'B.Tech in CS or related field'",
  "responsibilities": ["array — main job responsibilities as bullet strings"],
  "softSkills": ["array — communication, leadership, etc."],
  "keywords": ["array — important repeated or emphasized terms"]
}

JOB DESCRIPTION:
---
${jdText}
---

Return ONLY the JSON object.`;
}


// export function build