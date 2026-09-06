import { Application } from "../../models/Application.js";
import { getCanonicalCareerState } from "./careerStateService.js";

/**
 * Analyzes application pipeline outcomes to identify evidence-grounded rejection patterns.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Pattern insights
 */
export async function analyzeApplicationPatterns(userId) {
  const [applications, careerState] = await Promise.all([
    Application.find({ userId }).sort({ createdAt: -1 }).lean(),
    getCanonicalCareerState(userId)
  ]);

  if (!applications || applications.length === 0) {
    return {
      hasPattern: false,
      message: "No application history recorded yet.",
      patterns: []
    };
  }

  const rejected = applications.filter(a => a.status === "rejected");
  const patternList = [];

  // Pattern 1: Early-stage rejections (Resume / ATS mismatch)
  const earlyRejections = rejected.filter(a => (a.statusHistory || []).length <= 2);
  if (earlyRejections.length >= 2) {
    patternList.push({
      type: "EARLY_STAGE_REJECTION",
      confidence: "HIGH",
      title: "Frequent Screening Rejections",
      observation: `${earlyRejections.length} applications were rejected at the initial screening stage.`,
      contributingFactor: careerState.resume.atsScore < 75
        ? `Current resume ATS score is ${careerState.resume.atsScore}%, which may cause automated ATS filtering.`
        : "Resume keyword alignment with target job descriptions could be strengthened.",
      recommendation: "Use the Resume Studio to tailor bullet keywords for target job postings before submitting.",
      affectedCompanies: earlyRejections.map(a => a.company)
    });
  }

  // Pattern 2: Missing Skill Correlation Across Rejections
  const skillRejectionCounts = new Map();
  for (const app of rejected) {
    const reqSkills = app.extractedJd?.requiredSkills || [];
    for (const s of reqSkills) {
      const sLower = String(s).toLowerCase();
      skillRejectionCounts.set(sLower, (skillRejectionCounts.get(sLower) || 0) + 1);
    }
  }

  for (const [skill, count] of skillRejectionCounts.entries()) {
    if (count >= 2) {
      const userSkill = (careerState.skills.allNames || []).map(s => s.toLowerCase());
      const hasVerified = userSkill.includes(skill);

      if (!hasVerified) {
        patternList.push({
          type: "MISSING_SKILL_CORRELATION",
          confidence: "HIGH",
          title: `Recurring Gap: ${skill.toUpperCase()}`,
          observation: `You have had ${count} rejections from roles requiring ${skill}.`,
          contributingFactor: `Your profile lacks verified evidence or portfolio projects demonstrating ${skill}.`,
          recommendation: `Complete a practice module or add a portfolio project featuring ${skill}.`,
          skillName: skill
        });
      }
    }
  }

  return {
    hasPattern: patternList.length > 0,
    totalApplications: applications.length,
    totalRejections: rejected.length,
    patterns: patternList
  };
}
