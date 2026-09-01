/**
 * Safe Math Utilities
 * Prevents NaN, Infinity, -Infinity, null, and undefined from polluting database records or UI outputs.
 */

/**
 * Normalizes any value to a finite number bounded between min and max.
 * @param {any} value - The input value to sanitize
 * @param {number} fallback - Default numeric value if parsing fails
 * @param {number} min - Minimum lower bound (default 0)
 * @param {number} max - Maximum upper bound (default 100)
 * @returns {number}
 */
export function clampScore(value, fallback = 0, min = 0, max = 100) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (trimmed.toLowerCase() === "high" || trimmed.toLowerCase() === "strong") return 90;
    if (trimmed.toLowerCase() === "medium" || trimmed.toLowerCase() === "moderate" || trimmed.toLowerCase() === "partial") return 70;
    if (trimmed.toLowerCase() === "low" || trimmed.toLowerCase() === "weak" || trimmed.toLowerCase() === "missing") return 40;

    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.min(max, Math.max(min, Math.round(parsed)));
    }
  }

  return fallback;
}

/**
 * Safely calculates division (numerator / denominator) returning fallback if denominator is 0 or result is invalid.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} fallback
 * @returns {number}
 */
export function safeDivide(numerator, denominator, fallback = 0) {
  if (!denominator || typeof denominator !== "number" || denominator === 0) return fallback;
  if (typeof numerator !== "number" || !Number.isFinite(numerator)) return fallback;
  const res = numerator / denominator;
  return Number.isFinite(res) && !Number.isNaN(res) ? res : fallback;
}

/**
 * Safely formats a score as a percentage string (e.g. "85%" or "Not evaluated").
 * @param {any} value
 * @param {string} fallbackLabel
 * @returns {string}
 */
export function formatScoreString(value, fallbackLabel = "Not evaluated") {
  if (value === null || value === undefined) return fallbackLabel;
  if (typeof value === "number" && (Number.isNaN(value) || !Number.isFinite(value))) return fallbackLabel;
  const score = clampScore(value, -1);
  if (score < 0) return fallbackLabel;
  return `${score}%`;
}
