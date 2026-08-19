/**
 * Deterministic scoring engine.
 *
 * This module calculates the final match score from category similarity scores.
 * The LLM does NOT influence these numbers — it only writes the explanation.
 *
 * Weights are configurable and sum to 1.0.
 */

// Weights must sum to 1.0
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
 *
 * @param {object} categoryRawScores - { technicalSkills: 0.85, projects: 0.70, ... }
 *   Each value is the average cosine similarity for that category (0–1).
 * @returns {{ overallScore: number, categoryScores: object }}
 *   overallScore is 0–100 integer.
 *   categoryScores contains 0–100 values per category.
 */
export function calculateScore(categoryRawScores) {
  let weighted = 0;
  const categoryScores = {};

  for (const [category, weight] of Object.entries(WEIGHTS)) {
    const raw = categoryRawScores[category] ?? 0;
    const clamped = Math.max(0, Math.min(1, raw));
    categoryScores[category] = Math.round(clamped * 100);
    weighted += clamped * weight;
  }

  const overallScore = Math.round(weighted * 100);

  return { overallScore, categoryScores };
}

export { WEIGHTS, STRONG_THRESHOLD, PARTIAL_THRESHOLD };
