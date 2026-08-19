/**
 * Cosine similarity between two numeric vectors.
 * Pure deterministic math — no AI involved.
 *
 * @param {Float32Array|number[]} vecA
 * @param {Float32Array|number[]} vecB
 * @returns {number} similarity in range [0, 1]
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  // Clamp to [0, 1] — floating point can produce tiny negatives
  return Math.max(0, Math.min(1, dot / denominator));
}
