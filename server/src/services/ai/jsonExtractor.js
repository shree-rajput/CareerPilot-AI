/**
 * Safely extracts a JSON object or array from an LLM response string.
 *
 * LLMs frequently wrap JSON in markdown fences like:
 *   ```json
 *   { ... }
 *   ```
 * or add commentary before/after the JSON block.
 *
 * This extractor:
 * 1. Strips markdown code fences
 * 2. Finds the first { or [ and the matching closing bracket
 * 3. Attempts JSON.parse
 * 4. Returns null on failure (caller decides how to handle)
 *
 * @param {string} rawText - Raw LLM output
 * @returns {object|null}
 */
export function extractJson(rawText) {
  if (typeof rawText !== "string") return null;

  // Strip markdown fences
  let text = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find the first JSON structure
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");

  let startIndex = -1;
  let closingChar = "";

  if (firstBrace === -1 && firstBracket === -1) return null;

  if (firstBrace === -1) {
    startIndex = firstBracket;
    closingChar = "]";
  } else if (firstBracket === -1) {
    startIndex = firstBrace;
    closingChar = "}";
  } else {
    startIndex = Math.min(firstBrace, firstBracket);
    closingChar = startIndex === firstBrace ? "}" : "]";
  }

  const openingChar = closingChar === "}" ? "{" : "[";

  // Walk the string to find the matching closing bracket
  let depth = 0;
  let endIndex = -1;

  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === openingChar) depth++;
    else if (text[i] === closingChar) {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) return null;

  const candidate = text.slice(startIndex, endIndex + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    // Try once more with trailing-comma removal (common LLM mistake)
    try {
      const fixed = candidate.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}
