import { getCanonicalCareerState } from "./careerStateService.js";

/**
 * Explainable Job Matching Engine.
 * Evaluates candidate career state against a job description.
 * Separates Hard (Must-Have) vs Soft (Nice-To-Have) requirements.
 * Calculates deterministic match scores and provides evidence backing.
 * 
 * @param {string} userId - Mongo ObjectId of user
 * @param {Object} jobDetails - Job details object (company, role, jobDescription, extractedJd)
 * @returns {Promise<Object>} Explainable Job Match Result
 */
export async function calculateExplainableJobMatch(userId, jobDetails) {
  const careerState = await getCanonicalCareerState(userId);
  const { jobDescription = "", extractedJd } = jobDetails;

  const requiredSkills = extractedJd?.requiredSkills || [];
  const preferredSkills = extractedJd?.preferredSkills || [];
  const tools = extractedJd?.tools || [];

  // Combine user skills across profile, resume, and verified skills
  const userSkillSet = new Set((careerState.skills.allNames || []).map(s => s.toLowerCase()));
  const projectTechSet = new Set();
  (careerState.projects.items || []).forEach(p => {
    (p.technologies || []).forEach(t => projectTechSet.add(t.toLowerCase()));
  });

  // 1. Evaluate Hard Requirements (Required Skills)
  const hardMatched = [];
  const hardMissing = [];
  const hardEvidence = [];

  for (const skill of requiredSkills) {
    const sLower = String(skill).toLowerCase();
    const hasSkill = userSkillSet.has(sLower);
    const hasProjectEvidence = projectTechSet.has(sLower);

    if (hasSkill || hasProjectEvidence) {
      hardMatched.push(skill);
      const evText = hasProjectEvidence
        ? `Verified evidence in portfolio project`
        : `Present in profile skill baseline`;
      hardEvidence.push({ skill, status: "MATCHED", evidence: evText });
    } else {
      hardMissing.push(skill);
      hardEvidence.push({ skill, status: "MISSING", evidence: "No verified evidence found in profile or projects" });
    }
  }

  // 2. Evaluate Soft Requirements (Preferred Skills / Tools)
  const softMatched = [];
  const softMissing = [];

  for (const skill of [...preferredSkills, ...tools]) {
    const sLower = String(skill).toLowerCase();
    if (userSkillSet.has(sLower) || projectTechSet.has(sLower)) {
      softMatched.push(skill);
    } else {
      softMissing.push(skill);
    }
  }

  // 3. Deterministic Match Scoring Calculation
  // Hard Requirements: 70% weight, Soft Requirements: 30% weight
  const hardRatio = requiredSkills.length > 0 ? (hardMatched.length / requiredSkills.length) : 1;
  const softRatio = (preferredSkills.length + tools.length) > 0 ? (softMatched.length / (preferredSkills.length + tools.length)) : 1;

  const overallScore = Math.round((hardRatio * 70) + (softRatio * 30));

  // Recommendation logic based strictly on hard requirements
  let recommendation = "APPLY";
  let recommendationReason = "Strong alignment with core hard requirements.";

  if (hardRatio < 0.5) {
    recommendation = "PREPARE_BEFORE_APPLYING";
    recommendationReason = `Critical hard requirement gaps (${hardMissing.join(", ")}). Close skill gaps before applying.`;
  } else if (hardRatio < 0.8) {
    recommendation = "APPLY_WITH_RESERVATION";
    recommendationReason = `Good partial match. Highlight supporting projects during application.`;
  }

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    hardRequirements: {
      total: requiredSkills.length,
      matchedCount: hardMatched.length,
      missingCount: hardMissing.length,
      matched: hardMatched,
      missing: hardMissing,
      matchRatio: Math.round(hardRatio * 100)
    },
    softRequirements: {
      total: preferredSkills.length + tools.length,
      matchedCount: softMatched.length,
      missingCount: softMissing.length,
      matched: softMatched,
      missing: softMissing,
      matchRatio: Math.round(softRatio * 100)
    },
    evidence: hardEvidence,
    recommendation,
    recommendationReason,
    timestamp: new Date().toISOString()
  };
}
