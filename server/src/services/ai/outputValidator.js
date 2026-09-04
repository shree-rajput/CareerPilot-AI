import { AppError } from "../../utils/errors.js";

/**
 * Creates a standardized INSUFFICIENT_DATA object when required context is missing.
 */
export function buildInsufficientDataResponse(message = "I don't have enough verified information to answer this.") {
  return {
    status: "INSUFFICIENT_DATA",
    message
  };
}

/**
 * Extracts JSON from a raw string that might contain markdown fences or extra text.
 */
export function extractJson(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  try {
    const startObj = rawText.indexOf("{");
    const startArr = rawText.indexOf("[");

    let startIndex = -1;
    if (startObj !== -1 && startArr !== -1) {
      startIndex = Math.min(startObj, startArr);
    } else {
      startIndex = Math.max(startObj, startArr);
    }

    if (startIndex === -1) return null;

    let openBraces = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = startIndex; i < rawText.length; i++) {
      const char = rawText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') openBraces++;
        if (char === '}' || char === ']') openBraces--;
      }

      if (openBraces === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex !== -1) {
      const jsonStr = rawText.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Validates the parsed JSON against a Zod schema.
 * Handles plain text fallback for chat tasks gracefully without throwing 500 errors.
 */
export function validateOutput(parsedJson, schema, rawText = "") {
  if (!parsedJson) {
    if (rawText && typeof rawText === "string" && rawText.trim()) {
      // If LLM returned clean plain text, wrap into copilotChat style object
      return {
        answer: rawText.trim(),
        reply: rawText.trim(),
        suggestedActions: [],
        keyPoints: [],
        actionItems: [],
        data: null
      };
    }
    throw new AppError("Failed to extract JSON from AI output.", 500, "VALIDATION_ERROR");
  }

  if (!schema) {
    return parsedJson;
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    // If parsed object lacks standard keys, attempt graceful key mapping
    if (parsedJson && typeof parsedJson === "object") {
      const extractedAnswer = parsedJson.answer || parsedJson.reply || parsedJson.content || parsedJson.text || parsedJson.message || parsedJson.response;
      if (extractedAnswer) {
        let actions = [];
        if (Array.isArray(parsedJson.suggestedActions)) actions = parsedJson.suggestedActions;
        else if (Array.isArray(parsedJson.actions)) actions = parsedJson.actions;

        return {
          answer: String(extractedAnswer),
          reply: String(extractedAnswer),
          keyPoints: Array.isArray(parsedJson.keyPoints) ? parsedJson.keyPoints : [],
          actionItems: Array.isArray(parsedJson.actionItems) ? parsedJson.actionItems : [],
          suggestedActions: actions.map(a => typeof a === "string" ? a : a?.label || a?.text || a?.title || String(a || "")).filter(Boolean),
          data: parsedJson.data || null
        };
      }
    }
    throw new AppError(`Schema validation failed: ${result.error.message}`, 500, "SCHEMA_MISMATCH");
  }

  return result.data;
}
