/**
 * Local embedding service using @xenova/transformers.
 *
 * Model: Xenova/all-MiniLM-L6-v2
 * - 22MB, downloads once and caches on disk
 * - 384-dimensional embeddings
 * - Fast inference, suitable for resume/JD similarity
 * - Completely free — runs in Node.js process
 *
 * Singleton pattern: model loads once, reused for all requests.
 */

import { AppError } from "../../utils/errors.js";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let _pipeline = null;
let _loadPromise = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;

  // Prevent concurrent loads
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const { pipeline } = await import("@xenova/transformers");
      _pipeline = await pipeline("feature-extraction", MODEL_NAME, {
        quantized: true // Use quantized model for faster load + smaller size
      });
      return _pipeline;
    } catch (err) {
      _loadPromise = null;
      console.warn(`[EmbeddingService] Transformer model load warning (${err.message}). Using token-based fallback matching.`);
      return null;
    }
  })();

  return _loadPromise;
}

/**
 * Generate embedding vectors for an array of text strings.
 * Safe against non-string primitives and transformer load failures.
 *
 * @param {Array<string|object>} texts
 * @returns {Promise<Float32Array[]>} - One embedding per input text
 */
export async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];

  const pipe = await getPipeline().catch(() => null);

  const embeddings = [];

  for (const textItem of texts) {
    const textStr = typeof textItem === "string" 
      ? textItem 
      : (textItem?.skillName || textItem?.name || textItem?.canonicalName || String(textItem || ""));

    if (!textStr || textStr.trim().length === 0 || !pipe) {
      embeddings.push(new Float32Array(384).fill(0));
      continue;
    }

    try {
      const output = await pipe(textStr, { pooling: "mean", normalize: true });
      embeddings.push(output.data);
    } catch {
      // Return zero vector on failure — scoring engine will treat as no match
      embeddings.push(new Float32Array(384).fill(0));
    }
  }

  return embeddings;
}

/**
 * Embed a single text string.
 * @param {string} text
 * @returns {Promise<Float32Array>}
 */
export async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding || new Float32Array(384).fill(0);
}
