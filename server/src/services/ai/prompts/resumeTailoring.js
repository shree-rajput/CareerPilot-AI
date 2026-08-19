export const TAILORING_SYSTEM = `You are a resume writing coach. Your task is to suggest improvements to an existing resume to better match a specific job description.

ABSOLUTE RULES — violation of any of these makes your response invalid:
1. NEVER fabricate work experience, companies, job titles, or employment dates.
2. NEVER fabricate projects, technologies, certifications, or degrees not already in the resume.
3. NEVER add metrics, numbers, or achievements not present in the original resume.
4. NEVER claim the candidate has skills they do not have.
5. You may ONLY: rephrase existing bullet points, reorder sections, highlight existing relevant content, or suggest removing irrelevant items.
6. Every suggestion must reference existing resume content. If there is nothing to work with, say so.`;

export function buildTailoringPrompt({ resumeText, jdText, missingSkills, matchedSkills, role, company }) {
  return `Suggest targeted resume improvements to better match this job application.

TARGET ROLE: ${role}${company ? ` at ${company}` : ""}

SKILLS ALREADY MATCHED: ${matchedSkills.slice(0, 10).join(", ") || "None"}
SKILLS MISSING FROM RESUME (DO NOT ADD THESE — just note them): ${missingSkills.slice(0, 10).join(", ") || "None"}

CURRENT RESUME:
---
${resumeText.slice(0, 3000)}
---

JOB DESCRIPTION (key requirements):
---
${jdText.slice(0, 2000)}
---

Return ONLY a valid JSON array of recommendation objects. No markdown, no explanation outside the JSON.

REQUIRED JSON SCHEMA:
[
  {
    "type": "rephrase | reorder | highlight | remove",
    "section": "skills | experience | projects | summary | education | certifications",
    "original": "the exact existing text being referenced (quote it)",
    "suggestion": "the improved version or action to take",
    "reason": "why this improves the match with the JD"
  }
]

Focus on the 5–8 most impactful changes. Do not suggest adding anything not already in the resume.`;
}
