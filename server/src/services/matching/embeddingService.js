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
      throw new AppError(
        `Embedding model failed to load: ${err.message}. The match engine requires this model.`,
        500,
        "EMBEDDING_MODEL_FAILED"
      );
    }
  })();

  return _loadPromise;
}

/**
 * Generate embedding vectors for an array of text strings.
 *
 * @param {string[]} texts
 * @returns {Promise<Float32Array[]>} - One embedding per input text
 */
export async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];

  const pipe = await getPipeline();

  const embeddings = [];

  for (const text of texts) {
    if (!text || text.trim().length === 0) {
      embeddings.push(new Float32Array(384).fill(0));
      continue;
    }

    try {
      const output = await pipe(text, { pooling: "mean", normalize: true });
      // output.data is a Float32Array
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
  return embedding;
}
