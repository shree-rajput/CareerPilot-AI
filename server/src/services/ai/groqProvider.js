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
  }
  return _client;
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

  try {
    const completion = await client.chat.completions.create({
      model: env.groqModel,
      messages,
      temperature,
      max_tokens: maxTokens
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

    // Generic upstream failure
    throw new AppError(
      `AI request failed: ${error.message || "unknown error"}`,
      502,
      "AI_REQUEST_FAILED"
    );
  }
}
