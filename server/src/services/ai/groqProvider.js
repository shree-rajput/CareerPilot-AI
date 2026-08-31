import Groq from "groq-sdk";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

let _client = null;

function getClient() {
  if (!env.groqApiKey) {
    throw new AppError(
      "AI service is not configured. Add GROQ_API_KEY to your environment variables.",
      503,
      "AI_NOT_CONFIGURED"
    );
  }
  if (!_client) {
    _client = new Groq({ apiKey: env.groqApiKey });

    // Safe startup log — never prints the API key
    console.log(`[Groq] Configured: true`);
    console.log(`[Groq] Model: ${env.groqModel}`);
  }
  return _client;
}

/**
 * Validate that a model ID is a single clean token.
 * Throws clearly if it looks like a fallback expression.
 */
function assertCleanModel(model) {
  if (!model || typeof model !== "string") {
    throw new AppError("GROQ_MODEL is not set.", 503, "AI_NOT_CONFIGURED");
  }
  if (/[\s|]/.test(model)) {
    throw new AppError(
      `Invalid GROQ_MODEL value "${model}". Must be a single model ID, not a fallback expression.`,
      503,
      "AI_INVALID_MODEL"
    );
  }
}

/**
 * Wait for a given number of milliseconds (used for backoff).
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { getModelForRole } from "./modelRouter.js";

/**
 * Send a chat completion request to Groq.
 *
 * Rate-limit handling (Groq provider 429):
 *   - Retry ONCE after a 2-second delay (exponential backoff, single step).
 *   - If the retry also returns 429, throw AI_RATE_LIMITED immediately.
 *   - Never retry more than once — prevents cascading Groq API exhaustion.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {object} options
 * @param {number} [options.temperature=0.3]
 * @param {number} [options.maxTokens=2048]
 * @param {boolean} [options.jsonMode=false]
 * @param {string} [options.modelRole]
 * @returns {Promise<string>} - The assistant message content
 */
export async function groqTranscribe(audioFileStream) {
  const client = getClient();
  try {
    const transcription = await client.audio.transcriptions.create({
      file: audioFileStream,
      model: "whisper-large-v3",
      response_format: "json",
      language: "en"
    });
    return transcription.text;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Audio transcription failed: ${error.message || "unknown error"}`,
      502,
      "AI_TRANSCRIPTION_FAILED"
    );
  }
}

export async function groqChat(messages, { temperature = 0.3, maxTokens = 2048, jsonMode = false, modelRole } = {}) {
  const client = getClient();
  const model = getModelForRole(modelRole);

  assertCleanModel(model);

  // Inner function: one attempt at the Groq API
  async function attempt() {
    const request = {
      model,
      messages,
      temperature
    };
    
    if (maxTokens) {
      // only pass if explicitly desired and valid, but mostly we let the model decide
      // request.max_tokens = maxTokens; 
    }

    if (jsonMode) {
      request.response_format = { type: "json_object" };
    }

    const completion = await client.chat.completions.create(request, {
      timeout: env.aiRequestTimeoutMs
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new AppError("AI returned an empty response.", 502, "AI_EMPTY_RESPONSE");
    }

    return content;
  }

  try {
    return await attempt();
  } catch (error) {
    // Pass through AppErrors as-is (already structured)
    if (error instanceof AppError) throw error;

    // ── Groq provider rate limit (429) ──────────────────────────────────────
    // Retry once with a 2-second backoff. If still 429, surface a clear error.
    if (error.status === 429) {
      console.warn("[Groq] Rate limited (429) — retrying once after 2s backoff…");
      await sleep(2000);

      try {
        return await attempt();
      } catch (retryError) {
        if (retryError instanceof AppError) throw retryError;
        // Still 429 after backoff — the provider is genuinely rate-limited
        if (retryError.status === 429) {
          throw new AppError(
            "AI service is temporarily rate-limited. Please wait a moment and try again.",
            429,
            "AI_RATE_LIMITED"
          );
        }
        // Different error on retry — fall through to generic handler below
        throw new AppError(
          `AI request failed on retry: ${retryError.message || "unknown error"}`,
          502,
          "AI_REQUEST_FAILED"
        );
      }
    }

    // Model not found / access denied
    if (error.status === 404) {
      throw new AppError(
        `Groq model "${model}" is not available on this API key. Update GROQ_MODEL in your .env file.`,
        503,
        "AI_MODEL_NOT_FOUND"
      );
    }

    // Generic upstream failure
    throw new AppError(
      `AI request failed: ${error.message || "unknown error"}`,
      502,
      "AI_REQUEST_FAILED"
    );
  }
}
