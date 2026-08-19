export const MATCH_EXPLANATION_SYSTEM = `You are a career advisor. Given structured match data between a resume and job description, write a clear, honest, evidence-based explanation of why the candidate scored what they scored. Be specific and actionable. Do not invent information not present in the data.`;

export function buildMatchExplanationPrompt({ overallScore, matchedSkills, partialSkills, missingSkills, role, company }) {
  return `A candidate's resume was matched against a ${role} position${company ? ` at ${company}` : ""}.

MATCH RESULT:
- Overall Score: ${overallScore}/100

Strong Matches (semantically similar to JD requirements):
${matchedSkills.length > 0 ? matchedSkills.map(s => `  • ${s}`).join("\n") : "  None"}

Partial Matches (some overlap but not complete):
${partialSkills.length > 0 ? partialSkills.map(s => `  • ${s}`).join("\n") : "  None"}

Missing (not found in resume):
${missingSkills.length > 0 ? missingSkills.map(s => `  • ${s}`).join("\n") : "  None"}

Write a 3–5 sentence explanation of:
1. Why the candidate received this score
2. Their main strengths relative to this role
3. The most critical gaps they should address

Be direct and specific. Do not use filler phrases like "Overall, the candidate...". Return plain text only — no JSON, no markdown headers.`;
}
