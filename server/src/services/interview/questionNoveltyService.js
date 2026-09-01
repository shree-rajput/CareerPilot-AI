import crypto from "crypto";

/**
 * Normalizes a question by removing punctuation, extra spaces, and converting to lowercase.
 * Also removes common interview filler prefixes.
 */
export function normalizeQuestion(text) {
  if (!text) return "";
  let normalized = text.toLowerCase();
  
  // Remove common prefixes
  const prefixes = [
    "tell me about a time",
    "can you explain",
    "please describe",
    "what is your understanding of",
    "how would you define",
    "in your own words"
  ];
  
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
    }
  }

  // Remove punctuation and extra whitespace
  normalized = normalized.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  return normalized;
}

/**
 * Generates a deterministic SHA-256 fingerprint of the normalized question.
 * Used for exact duplicate detection.
 */
export function fingerprintQuestion(text) {
  const normalized = normalizeQuestion(text);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Calculates the Jaccard similarity (token overlap) between two strings.
 * Returns a score between 0.0 (no overlap) and 1.0 (exact match).
 */
export function jaccardSimilarity(text1, text2) {
  const norm1 = normalizeQuestion(text1);
  const norm2 = normalizeQuestion(text2);
  
  if (!norm1 && !norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  // Filter out common stop words for better semantic comparison
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "what", "how", "why", "when", "where", "is", "are", "was", "were", "do", "does", "did", "can", "could", "would", "should"]);
  
  const tokens1 = new Set(norm1.split(" ").filter(t => !stopWords.has(t)));
  const tokens2 = new Set(norm2.split(" ").filter(t => !stopWords.has(t)));
  
  if (tokens1.size === 0 && tokens2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = tokens1.size + tokens2.size - intersectionCount;
  return intersectionCount / unionCount;
}

/**
 * Checks if a candidate question is sufficiently novel compared to a list of previous questions.
 * @param {string} candidateText The new question text to check.
 * @param {string[]} previousTexts Array of previous question texts.
 * @param {number} threshold The similarity threshold (0.0 to 1.0) above which it's considered a duplicate. Default is 0.6.
 * @returns {{ isNovel: boolean, reason: string, maxSimilarity: number, similarTo: string|null }}
 */
export function isNovelQuestion(candidateText, previousTexts, threshold = 0.6) {
  if (!candidateText) {
    return { isNovel: false, reason: "Empty question", maxSimilarity: 1.0, similarTo: null };
  }

  if (!previousTexts || previousTexts.length === 0) {
    return { isNovel: true, reason: "No previous questions", maxSimilarity: 0.0, similarTo: null };
  }

  const candidateFingerprint = fingerprintQuestion(candidateText);
  let maxSimilarity = 0.0;
  let mostSimilarText = null;

  for (const prevText of previousTexts) {
    // Check exact duplicate
    if (fingerprintQuestion(prevText) === candidateFingerprint) {
      return { 
        isNovel: false, 
        reason: "Exact duplicate found", 
        maxSimilarity: 1.0, 
        similarTo: prevText 
      };
    }

    // Check semantic similarity (Jaccard)
    const sim = jaccardSimilarity(candidateText, prevText);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      mostSimilarText = prevText;
    }

    if (sim >= threshold) {
      return {
        isNovel: false,
        reason: `Too similar to previous question (score: ${sim.toFixed(2)})`,
        maxSimilarity: sim,
        similarTo: prevText
      };
    }
  }

  return {
    isNovel: true,
    reason: "Sufficiently novel",
    maxSimilarity,
    similarTo: mostSimilarText
  };
}

export const QUESTION_CATEGORIES = [
  "FUNDAMENTALS",
  "PRACTICAL_IMPLEMENTATION",
  "DEBUGGING",
  "ARCHITECTURE",
  "TRADEOFFS",
  "SCENARIO_BASED",
  "SYSTEM_DESIGN",
  "PROJECT_DEEP_DIVE",
  "BEHAVIORAL",
  "PROBLEM_SOLVING",
  "FOLLOW_UP",
  "EDGE_CASES",
  "PERFORMANCE",
  "SECURITY",
  "SCALABILITY"
];

/**
 * Suggests the next diverse category to test based on categories already asked in session.
 * Ensures the interview rotates across concepts rather than repeating identical question types.
 */
export function getNextDiverseCategory(askedCategories = [], interviewType = "mixed") {
  const askedSet = new Set((askedCategories || []).map(c => String(c).toUpperCase()));

  if (interviewType === "hr") {
    const hrOrder = ["BEHAVIORAL", "SCENARIO_BASED", "PROBLEM_SOLVING", "PROJECT_DEEP_DIVE", "FOLLOW_UP"];
    for (const cat of hrOrder) {
      if (!askedSet.has(cat)) return cat;
    }
    return "BEHAVIORAL";
  }

  // Technical / Mixed order rotation
  const techOrder = [
    "FUNDAMENTALS",
    "PRACTICAL_IMPLEMENTATION",
    "PROJECT_DEEP_DIVE",
    "DEBUGGING",
    "TRADEOFFS",
    "ARCHITECTURE",
    "PERFORMANCE",
    "EDGE_CASES",
    "SECURITY",
    "SCALABILITY",
    "BEHAVIORAL"
  ];

  for (const cat of techOrder) {
    if (!askedSet.has(cat)) return cat;
  }

  // If all tested, pick least used or next in list
  return QUESTION_CATEGORIES[(askedCategories || []).length % QUESTION_CATEGORIES.length];
}

