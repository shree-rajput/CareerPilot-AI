/**
 * Semantic Match Engine — the core pipeline.
 *
 * Architecture:
 *   Resume structured data
 *     → Extract text per category (skills, projects, experience, etc.)
 *     → Embed each item locally
 *
 *   JD extracted requirements
 *     → Extract requirements per category
 *     → Embed each requirement locally
 *
 *     → Cosine similarity for every (resume item, requirement) pair
 *     → Best match per requirement
 *     → Classify: strong / partial / missing
 *     → Average per category
 *
 *   Scoring engine (weights) → overallScore 0–100
 *
 * The LLM is NOT involved in scoring. It only writes the explanation afterwards.
 */

import { cosineSimilarity } from "./cosineSimilarity.js";
import { embedTexts } from "./embeddingService.js";
import { calculateScore, classifySimilarity } from "./scoringEngine.js";

/**
 * Extract a flat text representation per scoring category from resume structured data.
 * @param {object} structuredData - Validated resumeStructureSchema output
 * @returns {object} { technicalSkills: string[], projects: string[], experience: string[], education: string[] }
 */
function extractResumeSegments(structuredData) {
  const sd = structuredData || {};

  return {
    technicalSkills: sd.skills || [],
    projects: (sd.projects || []).map(
      (p) => `${p.name}: ${p.description} Technologies: ${(p.technologies || []).join(", ")}`
    ),
    experience: (sd.experience || []).map(
      (e) => `${e.role} at ${e.company}: ${e.description}`
    ),
    education: (sd.education || []).map(
      (e) => `${e.degree} in ${e.branch} from ${e.institution}`
    ),
    // Summary + achievements as context for responsibilities matching
    responsibilities: [
      sd.summary || "",
      ...(sd.achievements || []),
      ...(sd.experience || []).map((e) => e.description)
    ].filter(Boolean)
  };
}

/**
 * Extract requirement lists per category from JD extracted data.
 */
function extractJdRequirements(extractedJd) {
  const jd = extractedJd || {};

  return {
    technicalSkills: jd.requiredSkills || [],
    projects: jd.responsibilities || [], // Projects are evaluated against responsibilities
    experience: jd.requiredSkills || [], // Experience section evaluated against required skills
    education: jd.educationRequirement ? [jd.educationRequirement] : [],
    responsibilities: jd.responsibilities || [],
    preferredSkills: jd.preferredSkills || []
  };
}

/**
 * For a list of requirements and a list of resume items, find the best
 * cosine similarity for each requirement.
 *
 * Returns:
 *   - bestScores: number[] — best match score per requirement
 *   - evidence: Array<{ requirement, resumeEvidence, similarityScore, classification }>
 */
async function matchCategory(requirements, resumeItems) {
  if (!requirements.length || !resumeItems.length) {
    return {
      bestScores: requirements.map(() => 0),
      evidence: requirements.map((req) => ({
        requirement: req,
        resumeEvidence: "",
        similarityScore: 0,
        classification: "missing"
      }))
    };
  }

  // Embed everything
  const reqEmbeddings = await embedTexts(requirements);
  const itemEmbeddings = await embedTexts(resumeItems);

  const bestScores = [];
  const evidence = [];

  for (let i = 0; i < requirements.length; i++) {
    let best = 0;
    let bestEvidence = "";

    for (let j = 0; j < resumeItems.length; j++) {
      const sim = cosineSimilarity(reqEmbeddings[i], itemEmbeddings[j]);
      if (sim > best) {
        best = sim;
        bestEvidence = resumeItems[j];
      }
    }

    bestScores.push(best);
    evidence.push({
      requirement: requirements[i],
      resumeEvidence: bestEvidence,
      similarityScore: Math.round(best * 100) / 100,
      classification: classifySimilarity(best)
    });
  }

  return { bestScores, evidence };
}

/**
 * Run the full semantic match pipeline.
 *
 * @param {object} resumeStructuredData - From resumeSchema (validated AI output)
 * @param {object} extractedJd - From jdSchema (validated AI output)
 * @returns {Promise<MatchPipelineResult>}
 */
export async function runMatchPipeline(resumeStructuredData, extractedJd) {
  const resumeSegments = extractResumeSegments(resumeStructuredData);
  const jdRequirements = extractJdRequirements(extractedJd);

  const categories = ["technicalSkills", "projects", "experience", "education", "responsibilities", "preferredSkills"];

  const categoryRawScores = {};
  const allEvidence = [];
  const matchedSkills = [];
  const partialSkills = [];
  const missingSkills = [];

  for (const category of categories) {
    const requirements = jdRequirements[category] || [];
    const resumeItems = resumeSegments[category] || resumeSegments.responsibilities || [];

    const { bestScores, evidence } = await matchCategory(requirements, resumeItems);

    // Average similarity for this category
    const avgScore = bestScores.length > 0
      ? bestScores.reduce((a, b) => a + b, 0) / bestScores.length
      : 0;

    categoryRawScores[category] = avgScore;

    // Collect evidence
    for (const ev of evidence) {
      allEvidence.push({ ...ev, resumeSection: category });

      // Only classify skills for the readable summary
      if (category === "technicalSkills" || category === "preferredSkills") {
        if (ev.classification === "strong") matchedSkills.push(ev.requirement);
        else if (ev.classification === "partial") partialSkills.push(ev.requirement);
        else missingSkills.push(ev.requirement);
      }
    }
  }

  const { overallScore, categoryScores } = calculateScore(categoryRawScores);

  return {
    overallScore,
    categoryScores,
    matchedSkills: [...new Set(matchedSkills)],
    partialSkills: [...new Set(partialSkills)],
    missingSkills: [...new Set(missingSkills)],
    evidence: allEvidence
  };
}
