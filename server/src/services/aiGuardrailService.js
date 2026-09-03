/**
 * AI Guardrail Service — Set-Difference Entity Verification
 *
 * Scans AI-generated bullet points against the user's input bullet/profile.
 * Flags any numbers, percentages, technologies, or proper nouns in the output
 * that were NOT present in the input as `needs_user_input: true`.
 *
 * Example:
 * Input: "Led engineering team and improved release frequency."
 * Output: "Led team of 8 engineers and improved release speed by 45% using Docker."
 * Flagged Entities: ["8", "45%", "Docker"] (because none were in input).
 *
 * Input: "Managed team of 5 engineers."
 * Output: "Led team of 5 engineers."
 * Flagged Entities: [] ("5" was in input, so it's NOT flagged).
 */

export function extractEntities(text = "") {
  if (!text || typeof text !== "string") return new Set();

  const str = text.trim();
  const entities = new Set();

  // 1. Extract all numbers and percentages (e.g. "5", "45%", "$10M", "3.5")
  const numberRegex = /\b\$?\d+(?:\.\d+)?%?\b/gi;
  const numbers = str.match(numberRegex);
  if (numbers) {
    numbers.forEach((num) => entities.add(num.toLowerCase()));
  }

  // 2. Extract capitalized proper nouns and technical terms
  // Exclude common starting words if sentence start, but include capitalized words & acronyms
  const words = str.split(/\s+/);
  words.forEach((w) => {
    const cleanWord = w.replace(/^[^\w]+|[^\w]+$/g, "");
    if (!cleanWord) return;

    // Check if word contains uppercase letters (e.g., React, AWS, Docker, Node.js) or numbers
    if (/[A-Z0-9]/.test(cleanWord) && cleanWord.length > 1) {
      entities.add(cleanWord.toLowerCase());
    }
  });

  return entities;
}

export function checkSetDifferenceGuardrail(inputText = "", outputText = "") {
  const inputEntities = extractEntities(inputText);
  const outputEntities = extractEntities(outputText);

  const unverifiedEntities = [];

  for (const entity of outputEntities) {
    if (!inputEntities.has(entity)) {
      unverifiedEntities.push(entity);
    }
  }

  return {
    needsUserInput: unverifiedEntities.length > 0,
    unverifiedEntities,
    verifiedCount: outputEntities.size - unverifiedEntities.length,
  };
}
