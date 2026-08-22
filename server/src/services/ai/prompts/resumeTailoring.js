// export const TAILORING_SYSTEM = `You are a resume writing coach. Your task is to suggest improvements to an existing resume to better match a specific job description.

// ABSOLUTE RULES — violation of any of these makes your response invalid:
// 1. NEVER fabricate work experience, companies, job titles, or employment dates.
// 2. NEVER fabricate projects, technologies, certifications, or degrees not already in the resume.
// 3. NEVER add metrics, numbers, or achievements not present in the original resume.
// 4. NEVER claim the candidate has skills they do not have.
// 5. You may ONLY: rephrase existing bullet points, reorder sections, highlight existing relevant content, or suggest removing irrelevant items.
// 6. Every suggestion must reference existing resume content. If there is nothing to work with, say so.`;

// export function buildTailoringPrompt({ resumeText, jdText, missingSkills, matchedSkills, role, company }) {
//   return `Suggest targeted resume improvements to better match this job application.

// TARGET ROLE: ${role}${company ? ` at ${company}` : ""}

// SKILLS ALREADY MATCHED: ${matchedSkills.slice(0, 10).join(", ") || "None"}
// SKILLS MISSING FROM RESUME (DO NOT ADD THESE — just note them): ${missingSkills.slice(0, 10).join(", ") || "None"}

// CURRENT RESUME:
// ---
// ${resumeText.slice(0, 3000)}
// ---

// JOB DESCRIPTION (key requirements):
// ---
// ${jdText.slice(0, 2000)}
// ---

// Return ONLY a valid JSON array of recommendation objects. No markdown, no explanation outside the JSON.

// REQUIRED JSON SCHEMA:
// [
//   {
//     "type": "rephrase | reorder | highlight | remove",
//     "section": "skills | experience | projects | summary | education | certifications",
//     "original": "the exact existing text being referenced (quote it)",
//     "suggestion": "the improved version or action to take",
//     "reason": "why this improves the match with the JD"
//   }
// ]

// Focus on the 5–8 most impactful changes. Do not suggest adding anything not already in the resume.`;
// }
export const TAILORING_SYSTEM = `
You are an expert resume writing coach.

Your job is to improve an EXISTING resume so it better matches a specific job description.

ABSOLUTE RULES:

1. NEVER invent work experience, companies, job titles, dates, projects, technologies, certifications, degrees, responsibilities, metrics, or achievements.

2. NEVER add a missing skill to the resume.

3. NEVER create a new achievement or number.

4. You may ONLY:
   - rephrase existing resume content
   - highlight relevant existing content
   - recommend reordering existing content
   - recommend removing irrelevant existing content

5. Every recommendation MUST be supported by the provided resume evidence.

6. The "original" field MUST contain text that actually exists in the provided resume.

7. For "rephrase", the "suggestion" may improve wording but MUST preserve the original meaning and facts.

8. Missing skills must NOT be added. They may only be mentioned as a gap in the reason.

9. The semantic matching engine has already calculated similarity scores and classifications.
   DO NOT calculate or change match scores.

10. If there is insufficient evidence for a recommendation, do not create that recommendation.

Return ONLY valid JSON matching the provided schema.
No markdown.
No explanation outside JSON.
`;

export function buildTailoringPrompt({
  resumeText = "",
  jdText = "",
  missingSkills = [],
  matchedSkills = [],
  partialSkills = [],
  evidence = [],
  tailoringAnalysis = {},
  role = "",
  company = "",
}) {
  const evidenceText = evidence
    .slice(0, 15)
    .map(
      (item, index) => `
EVIDENCE ${index + 1}
Requirement: ${item.requirement || "N/A"}
Classification: ${item.classification || "N/A"}
Similarity Score: ${item.similarityScore ?? 0}
Resume Section: ${item.resumeSection || "N/A"}
Resume Evidence: ${item.resumeEvidence || "N/A"}
`,
    )
    .join("\n");

  return `
Suggest targeted improvements to the existing resume for this job.

TARGET ROLE:
${role || "Not specified"}${company ? ` at ${company}` : ""}

MATCHED SKILLS:
${matchedSkills.slice(0, 15).join(", ") || "None"}

PARTIALLY MATCHED SKILLS:
${partialSkills.slice(0, 15).join(", ") || "None"}

MISSING SKILLS:
${missingSkills.slice(0, 15).join(", ") || "None"}

IMPORTANT:
Missing skills must NOT be added to the resume.

DETERMINISTIC MATCH EVIDENCE:
${evidenceText || "No evidence available."}

TAILORING ANALYSIS:
${JSON.stringify(tailoringAnalysis, null, 2)}

CURRENT RESUME:
---
${resumeText.slice(0, 6000)}
---

JOB DESCRIPTION:
---
${jdText.slice(0, 4000)}
---

TASK:

Generate the 5–8 most useful resume improvements.

Prioritize:
1. Strong existing experience that should be highlighted.
2. Partial matches that can be expressed more clearly.
3. Existing bullets that can be rephrased using JD terminology WITHOUT adding new facts.
4. Irrelevant existing content that could be moved lower or removed.
5. Existing skills that are relevant but not prominent.

DO NOT:
- add missing skills
- invent experience
- invent metrics
- invent technologies
- invent achievements
- create new projects
- change dates
- change companies
- change job titles
- claim unsupported experience

For every recommendation, the "original" field must refer to actual existing resume content.

Return ONLY a JSON array:

[
  {
    "type": "rephrase | reorder | highlight | remove",
    "section": "skills | experience | projects | summary | education | certifications",
    "original": "exact existing resume text being referenced",
    "suggestion": "improved wording or specific action",
    "reason": "why this improves alignment with the JD"
  }
]
`;
}
