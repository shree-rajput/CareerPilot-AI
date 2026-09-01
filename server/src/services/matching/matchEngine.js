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
 *     → Cosine similarity & Token overlap for every (resume item, requirement) pair
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
 * Deterministic token overlap fallback for string matching.
 */
function computeTokenOverlap(itemA, itemB) {
  if (!itemA || !itemB) return 0;
  const strA = String(typeof itemA === "string" ? itemA : itemA.skillName || itemA.name || itemA.canonicalName || String(itemA)).toLowerCase().trim();
  const strB = String(typeof itemB === "string" ? itemB : itemB.skillName || itemB.name || itemB.canonicalName || String(itemB)).toLowerCase().trim();
  if (!strA || !strB) return 0;

  if (strA === strB) return 1.0;
  if (strA.includes(strB) || strB.includes(strA)) return 0.85;

  const tokensA = new Set(strA.split(/\W+/).filter(t => t.length > 1));
  const tokensB = new Set(strB.split(/\W+/).filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach(t => { if (tokensB.has(t)) intersection++; });
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Extract a flat text representation per scoring category from resume structured data.
 * @param {object} structuredData - Validated resumeStructureSchema output
 * @returns {object} { technicalSkills: string[], projects: string[], experience: string[], education: string[] }
 */
function extractResumeSegments(structuredData) {
  const sd = structuredData || {};

  const skillsList = (sd.skills || []).map(s => typeof s === "string" ? s : s.canonicalName || s.name || s.skillName || "").filter(Boolean);

  return {
    technicalSkills: skillsList,
    projects: (sd.projects || []).map(
      (p) => `${p.name || ""}: ${p.description || ""} ${p.problemSolved || ""} Technologies: ${Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies || ""}`
    ),
    experience: (sd.experience || []).map(
      (e) => `${e.role || ""} at ${e.company || ""}: ${e.description || ""}`
    ),
    education: (sd.education || []).map(
      (e) => `${e.degree || ""} in ${e.branch || e.fieldOfStudy || ""} from ${e.institution || e.school || ""}`
    ),
    responsibilities: [
      sd.summary || "",
      ...(sd.achievements || []),
      ...(sd.experience || []).map((e) => e.description || "")
    ].filter(Boolean)
  };
}

/**
 * Extract requirement lists per category from JD extracted data.
 */
function extractJdRequirements(extractedJd) {
  const jd = extractedJd || {};

  const formatSkills = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(s => typeof s === "string" ? s : s.skillName || s.name || s.canonicalName || "").filter(Boolean);
  };

  return {
    technicalSkills: formatSkills(jd.requiredSkills),
    projects: jd.responsibilities || [], 
    experience: formatSkills(jd.requiredSkills), 
    education: jd.educationRequirement ? [jd.educationRequirement] : [],
    responsibilities: jd.responsibilities || [],
    preferredSkills: formatSkills(jd.preferredSkills)
  };
}

/**
 * For a list of requirements and a list of resume items, find the best
 * similarity for each requirement.
 */
async function matchCategory(requirements, resumeItems) {
  const reqStrings = requirements.map(r => typeof r === "string" ? r : r.skillName || r.name || String(r)).filter(Boolean);
  const itemStrings = resumeItems.map(i => typeof i === "string" ? i : i.skillName || i.name || String(i)).filter(Boolean);

  if (!reqStrings.length || !itemStrings.length) {
    return {
      bestScores: reqStrings.map(() => 0),
      evidence: reqStrings.map((req) => ({
        requirement: req,
        resumeEvidence: "",
        similarityScore: 0,
        classification: "missing"
      }))
    };
  }

  // Embed everything
  const reqEmbeddings = await embedTexts(reqStrings);
  const itemEmbeddings = await embedTexts(itemStrings);

  const bestScores = [];
  const evidence = [];

  for (let i = 0; i < reqStrings.length; i++) {
    let best = 0;
    let bestEvidence = "";

    for (let j = 0; j < itemStrings.length; j++) {
      const cosSim = (reqEmbeddings[i] && itemEmbeddings[j]) ? cosineSimilarity(reqEmbeddings[i], itemEmbeddings[j]) : 0;
      const tokSim = computeTokenOverlap(reqStrings[i], itemStrings[j]);
      const sim = Math.max(cosSim, tokSim);

      if (sim > best) {
        best = sim;
        bestEvidence = itemStrings[j];
      }
    }

    bestScores.push(best);
    evidence.push({
      requirement: reqStrings[i],
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

    const avgScore = bestScores.length > 0
      ? bestScores.reduce((a, b) => a + b, 0) / bestScores.length
      : 0;

    categoryRawScores[category] = avgScore;

    for (const ev of evidence) {
      allEvidence.push({ ...ev, resumeSection: category });

      if (category === "technicalSkills" || category === "preferredSkills") {
        if (ev.classification === "strong") matchedSkills.push(ev.requirement);
        else if (ev.classification === "partial") partialSkills.push(ev.requirement);
        else missingSkills.push(ev.requirement);
      }
    }
  }

  const { overallScore, categoryScores } = calculateScore(categoryRawScores);

  // Compute fit breakdown corresponding to product requirements
  const fitBreakdown = {
    technicalFit: categoryScores.technicalSkills || 0,
    experienceFit: categoryScores.experience || 0,
    skillFit: Math.round(((categoryScores.technicalSkills || 0) + (categoryScores.preferredSkills || 0)) / 2),
    projectFit: categoryScores.projects || 0,
    educationFit: categoryScores.education || 0
  };

  // Categorize gaps
  const criticalGaps = [];
  const importantGaps = [];
  const niceToHaveGaps = [];

  for (const ev of allEvidence) {
    if (ev.classification === "missing") {
      if (ev.resumeSection === "technicalSkills") {
        criticalGaps.push(ev.requirement);
      } else if (ev.resumeSection === "preferredSkills") {
        niceToHaveGaps.push(ev.requirement);
      } else {
        importantGaps.push(ev.requirement);
      }
    } else if (ev.classification === "partial") {
      importantGaps.push(ev.requirement);
    }
  }

  const uniqueCritical = [...new Set(criticalGaps)];
  const uniqueImportant = [...new Set(importantGaps)];
  const uniqueNiceToHave = [...new Set(niceToHaveGaps)];

  // Generate actionable next steps per gap (without inventing fake evidence)
  const actionPlan = [
    ...uniqueCritical.slice(0, 4).map(gap => ({
      gap,
      severity: "critical",
      action: `${gap} is listed as a critical requirement. It is not currently evidenced in your resume. Consider building or deploying one project using ${gap} and adding the experience only after you actually gain it.`
    })),
    ...uniqueImportant.slice(0, 3).map(gap => ({
      gap,
      severity: "important",
      action: `${gap} is an important requirement. Highlight relevant hands-on coursework or project components in your resume.`
    })),
    ...uniqueNiceToHave.slice(0, 3).map(gap => ({
      gap,
      severity: "nice_to_have",
      action: `${gap} is a preferred skill. Mention basic familiarity or plan to explore it if time permits.`
    }))
  ];

  return {
    overallScore,
    categoryScores,
    fitBreakdown,
    matchedSkills: [...new Set(matchedSkills)],
    partialSkills: [...new Set(partialSkills)],
    missingSkills: [...new Set(missingSkills)],
    criticalGaps: uniqueCritical,
    importantGaps: uniqueImportant,
    niceToHaveGaps: uniqueNiceToHave,
    actionPlan,
    evidence: allEvidence
  };
}

