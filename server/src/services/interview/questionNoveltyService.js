import crypto from "crypto";

/**
 * Normalizes a question by removing punctuation, extra spaces, and converting to lowercase.
 * Also removes common interview filler prefixes to extract the core topic.
 */
export function normalizeQuestion(text) {
  if (!text) return "";
  let normalized = text.toLowerCase().trim();
  
  // Remove common prefixes
  const prefixes = [
    "tell me about a time",
    "what is your understanding of",
    "what do you understand by",
    "can you explain how",
    "can you explain",
    "please describe how",
    "please describe",
    "how would you define",
    "how would you explain",
    "in your own words",
    "what is a",
    "what is an",
    "what is the",
    "what is",
    "explain how",
    "explain what",
    "explain the",
    "explain",
    "how does",
    "how do",
    "describe how",
    "describe the",
    "describe",
    "discuss the",
    "discuss"
  ];
  
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length).trim();
      break;
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
 * Extracts key technical terms / concepts from a normalized question.
 */
export function extractQuestionKeywords(text) {
  const norm = normalizeQuestion(text);
  if (!norm) return new Set();

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", 
    "about", "what", "how", "why", "when", "where", "is", "are", "was", "were", 
    "do", "does", "did", "can", "could", "would", "should", "your", "you", "me",
    "tell", "explain", "describe", "define", "work", "works", "used", "using",
    "understanding", "difference", "between"
  ]);

  return new Set(norm.split(" ").filter(t => t.length > 1 && !stopWords.has(t)));
}

/**
 * Calculates the Jaccard similarity (token overlap) between two strings.
 * Returns a score between 0.0 (no overlap) and 1.0 (exact match).
 */
export function jaccardSimilarity(text1, text2) {
  const tokens1 = extractQuestionKeywords(text1);
  const tokens2 = extractQuestionKeywords(text2);
  
  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

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
 * Supports exact SHA-256 fingerprint matching, token Jaccard similarity, and semantic keyword overlap.
 * @param {string} candidateText The new question text to check.
 * @param {string[]} previousTexts Array of previous question texts.
 * @param {number} threshold The similarity threshold (0.0 to 1.0) above which it's considered a duplicate. Default is 0.5.
 * @returns {{ isNovel: boolean, reason: string, maxSimilarity: number, similarTo: string|null }}
 */
export function isNovelQuestion(candidateText, previousTexts, threshold = 0.5) {
  if (!candidateText) {
    return { isNovel: false, reason: "Empty question", maxSimilarity: 1.0, similarTo: null };
  }

  if (!previousTexts || previousTexts.length === 0) {
    return { isNovel: true, reason: "No previous questions", maxSimilarity: 0.0, similarTo: null };
  }

  const candidateFingerprint = fingerprintQuestion(candidateText);
  const candidateNorm = normalizeQuestion(candidateText);
  const candidateKeywords = extractQuestionKeywords(candidateText);

  let maxSimilarity = 0.0;
  let mostSimilarText = null;

  for (const prevText of previousTexts) {
    if (!prevText) continue;

    // 1. Check exact duplicate via SHA-256 fingerprint
    if (fingerprintQuestion(prevText) === candidateFingerprint) {
      return { 
        isNovel: false, 
        reason: "Exact duplicate found", 
        maxSimilarity: 1.0, 
        similarTo: prevText 
      };
    }

    // 2. Check normalized text equality
    if (normalizeQuestion(prevText) === candidateNorm) {
      return {
        isNovel: false,
        reason: "Semantic duplicate found (normalized text match)",
        maxSimilarity: 1.0,
        similarTo: prevText
      };
    }

    // 3. Check Jaccard keyword similarity
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

    // 4. Semantic check for short key concepts (e.g. "REST API" vs "REST APIs" or "REST")
    const prevKeywords = extractQuestionKeywords(prevText);
    if (candidateKeywords.size > 0 && prevKeywords.size > 0) {
      let sharedCount = 0;
      for (const kw of candidateKeywords) {
        if (prevKeywords.has(kw) || Array.from(prevKeywords).some(pk => pk.includes(kw) || kw.includes(pk))) {
          sharedCount++;
        }
      }
      const overlapRatio = sharedCount / Math.min(candidateKeywords.size, prevKeywords.size);
      if (overlapRatio >= 0.8 && candidateKeywords.size <= 3) {
        return {
          isNovel: false,
          reason: `Semantic concept duplicate found (${Array.from(candidateKeywords).join(", ")})`,
          maxSimilarity: Math.max(sim, overlapRatio),
          similarTo: prevText
        };
      }
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

