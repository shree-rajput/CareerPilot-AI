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
 * Send a chat completion request to Groq.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {object} options
 * @param {number} [options.temperature=0.3]
 * @param {number} [options.maxTokens=2048]
 * @returns {Promise<string>} - The assistant message content
 */
export async function groqChat(messages, { temperature = 0.3, maxTokens = 2048 } = {}) {
  const client = getClient();
  const model = env.groqModel;

  assertCleanModel(model);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new AppError("AI returned an empty response.", 502, "AI_EMPTY_RESPONSE");
    }

    return content;
  } catch (error) {
    // Pass through AppErrors as-is
    if (error.name === "AppError" || error.statusCode) throw error;

    // Groq rate limit
    if (error.status === 429) {
      throw new AppError(
        "AI service rate limit reached. Please try again in a few minutes.",
        429,
        "AI_RATE_LIMITED"
      );
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
