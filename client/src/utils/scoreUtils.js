/**
 * Normalizes any score to a strict 0-100 range.
 * Defends against missing data, strings, nulls, undefined, NaN, and Infinity.
 * 
 * @param {any} value - The incoming score from the backend
 * @param {number} fallback - The default value if the score is completely invalid
 * @returns {number} A safe integer between 0 and 100
 */
export function normalizeScore(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}
