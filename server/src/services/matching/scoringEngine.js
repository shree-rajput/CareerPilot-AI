/**
 * Deterministic scoring engine.
 *
 * This module calculates the final match score from category similarity scores.
 * The LLM does NOT influence these numbers — it only writes the explanation.
 *
 * Weights are configurable and sum to 1.0.
 */

// Base weights across categories
const WEIGHTS = {
  technicalSkills: 0.40,
  projects: 0.20,
  experience: 0.15,
  education: 0.05,
  responsibilities: 0.10,
  preferredSkills: 0.10
};

const STRONG_THRESHOLD = 0.72;  // cosine similarity ≥ 0.72 → strong match
const PARTIAL_THRESHOLD = 0.50;  // cosine similarity ≥ 0.50 → partial match

/**
 * Clamp any value to a normalized 0-100 integer.
 * @param {number} val
 * @returns {number} Integer between 0 and 100
 */
export function clampScore(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return 0;
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * Classify a cosine similarity score.
 * @param {number} score
 * @returns {"strong" | "partial" | "missing"}
 */
export function classifySimilarity(score) {
  if (score >= STRONG_THRESHOLD) return "strong";
  if (score >= PARTIAL_THRESHOLD) return "partial";
  return "missing";
}

/**
 * Calculate a weighted overall score from category raw scores.
 * Re-normalizes category weights dynamically for categories that are present in the JD.
 *
 * @param {object} categoryRawScores - { technicalSkills: 0.85, projects: 0.70, ... }
 *   Each value is the average cosine similarity for that category (0–1) or null if omitted.
 * @param {object} [categoryHasRequirements] - Optional map indicating if category has JD requirements
 * @returns {{ overallScore: number, categoryScores: object }}
 *   overallScore is 0–100 integer.
 *   categoryScores contains 0–100 values per category.
 */
export function calculateScore(categoryRawScores, categoryHasRequirements = null) {
  const categoryScores = {};

  // Determine active categories (categories with actual requirements in JD)
  let activeWeightSum = 0;
  const activeCategories = [];

  for (const [category, baseWeight] of Object.entries(WEIGHTS)) {
    const hasReq = categoryHasRequirements
      ? !!categoryHasRequirements[category]
      : (categoryRawScores[category] !== null && categoryRawScores[category] !== undefined);

    if (hasReq || category === "technicalSkills") { // technicalSkills is always active
      activeCategories.push(category);
      activeWeightSum += baseWeight;
    }
  }

  // Fallback to all categories if none identified as active
  if (activeWeightSum === 0) {
    activeWeightSum = 1.0;
  }

  let weighted = 0;
  for (const [category, baseWeight] of Object.entries(WEIGHTS)) {
    const raw = categoryRawScores[category] ?? 0;
    const clamped = Math.max(0, Math.min(1, raw));
    const scoreVal = Math.round(clamped * 100);
    categoryScores[category] = scoreVal;

    if (activeCategories.includes(category)) {
      const normalizedWeight = baseWeight / activeWeightSum;
      weighted += clamped * normalizedWeight;
    }
  }

  const overallScore = clampScore(weighted * 100);

  return { overallScore, categoryScores };
}

export { WEIGHTS, STRONG_THRESHOLD, PARTIAL_THRESHOLD };
