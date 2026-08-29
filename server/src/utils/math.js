export const NOT_ASSESSED = -1;

/**
 * Safely converts any value to a finite number.
 * Returns fallback if the value is NaN, Infinity, or undefined/null.
 */
export function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Clamps a score between a minimum and maximum value,
 * preserving NOT_ASSESSED if the score represents it.
 */
export function clampScore(score, min = 0, max = 100) {
  if (score === NOT_ASSESSED) return score;
  const safeNum = safeNumber(score, 0);
  return Math.min(Math.max(safeNum, min), max);
}

/**
 * Calculates a safe average of an array of numbers.
 * Ignores NaN/undefined. Returns NOT_ASSESSED if array is empty or no valid numbers.
 */
export function safeAverage(arr, min = 0, max = 100) {
  if (!Array.isArray(arr) || arr.length === 0) return NOT_ASSESSED;
  
  let sum = 0;
  let count = 0;
  
  for (const val of arr) {
    if (val !== null && val !== undefined) {
      const num = Number(val);
      if (Number.isFinite(num) && num !== NOT_ASSESSED) {
        sum += num;
        count++;
      }
    }
  }
  
  if (count === 0) return NOT_ASSESSED;
  return clampScore(Math.round(sum / count), min, max);
}

/**
 * Asserts a score is finite, otherwise returns NOT_ASSESSED or a fallback.
 */
export function assertFiniteScore(value, fallback = NOT_ASSESSED) {
  const num = safeNumber(value, fallback);
  return num === NOT_ASSESSED ? NOT_ASSESSED : clampScore(num);
}
