export const RESUME_STRUCTURE_SYSTEM = `You are a precise resume parser and technical entity extractor. Your job is to extract structured information from a raw resume text and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

IMPORTANT RULES:
- Extract only what is explicitly present in the resume. Do NOT invent, infer, or add anything.
- If a section is absent from the resume, return an empty array [] or empty string "".
- Dates should be preserved exactly as written (e.g. "May 2023", "2022–2023", "Present").
- For Skills: DO NOT extract section headers (e.g., "Skills", "Frameworks", "Languages", "Tools") as skills.
- Normalize skill names: "ReactJS" or "React framework" -> "React". "NodeJS" -> "Node.js".
- Do not use naive token extraction. Understand the context.
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
  "skills": [
    {
      "canonicalName": "string — normalized, universally accepted name (e.g. 'React', 'MongoDB')",
      "originalMention": "string — exact text snippet where it was found in the resume",
      "category": "string — strictly one of: language, framework, library, database, tool, cloud, concept, domain, soft_skill, certification, other"
    }
  ],
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
      "technologies": ["array of tech strings used in this project"],
      "architecture": "string — architecture concepts (e.g. Microservices, REST API)",
      "frontend": "string — frontend technologies if explicitly mentioned",
      "backend": "string — backend technologies if explicitly mentioned",
      "database": "string — databases if explicitly mentioned",
      "deployment": "string — cloud/deployment if explicitly mentioned",
      "keyResponsibilities": ["array of strings — key tasks or achievements"],
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
  "domain": "string — inferred domain (e.g. Frontend Development, Full Stack Development, Data Science), based on evidence",
  "targetRoles": ["array of string — 1 to 3 likely target roles based on the resume"],
  "parserSource": "ai"
}

RESUME TEXT:
---
${rawText}
---

Return ONLY the JSON object. No markdown. No explanation.`;
}
