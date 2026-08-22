export const RESUME_STRUCTURE_SYSTEM = `You are a precise resume parser. Your job is to extract structured information from a raw resume text and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

IMPORTANT RULES:
- Extract only what is explicitly present in the resume. Do NOT invent, infer, or add anything.
- If a section is absent from the resume, return an empty array [] or empty string "".
- Dates should be preserved exactly as written (e.g. "May 2023", "2022–2023", "Present").
- Skills must be individual items, not sentences.
- Every field must be present in the output even if empty.`;

export function buildResumeStructurePrompt(rawText) {
  return `Parse the following resume into the JSON schema below. Return ONLY valid JSON.

REQUIRED JSON SCHEMA:
{
  "name": "string — candidate name only if explicitly present, empty string if absent",
  "email": "string — email only if explicitly present, empty string if absent",
  "phone": "string — phone only if explicitly present, empty string if absent",
  "location": "string — location only if explicitly present, empty string if absent",
  "links": ["array of explicit links from the resume"],
  "summary": "string — professional summary or objective, empty string if absent",
  "skills": ["array of individual skill strings"],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "branch": "string",
      "startYear": "string",
      "endYear": "string",
      "gpa": "string — optional, empty if absent"
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string — responsibilities and achievements combined"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["array of tech strings"],
      "link": "string — optional, empty if absent"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "achievements": ["array of achievement strings"],
  "parserSource": "ai"
}

RESUME TEXT:
---
${rawText}
---

Return ONLY the JSON object. No markdown. No explanation.`;
}
