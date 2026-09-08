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

export function extractFieldFromRawJson(jsonStr, fieldName) {
  if (!jsonStr || typeof jsonStr !== "string") return "";
  try {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "i");
    const match = regex.exec(jsonStr);
    if (match && match[1]) {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  } catch {
    // ignore
  }
  return "";
}

/**
 * Extracts JSON from a raw string that might contain markdown fences or extra text.
 */
export function extractJson(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "").trim();
    }

    const startObj = cleanText.indexOf("{");
    const startArr = cleanText.indexOf("[");

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

    for (let i = startIndex; i < cleanText.length; i++) {
      const char = cleanText[i];

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
      const jsonStr = cleanText.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
  } catch {
    // Regex fallback if strict open/close brace iteration or JSON.parse failed
    const extReply = extractFieldFromRawJson(rawText, "reply") || extractFieldFromRawJson(rawText, "content") || extractFieldFromRawJson(rawText, "answer");
    const extSummary = extractFieldFromRawJson(rawText, "summary");
    const extType = extractFieldFromRawJson(rawText, "responseType");

    if (extReply || extSummary) {
      return {
        responseType: extType || "EXPLANATION",
        summary: extSummary || "",
        reply: extReply || extSummary || "",
        content: extReply || extSummary || "",
        keyPoints: [],
        expandableSections: [],
        suggestedActions: []
      };
    }
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
      let cleanContent = rawText.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "").trim();
      }

      // If rawText is a stringified JSON object that failed parsing, extract readable text
      if (cleanContent.startsWith("{") || cleanContent.includes('"responseType":') || cleanContent.includes('"reply":')) {
        const extReply = extractFieldFromRawJson(cleanContent, "reply") || extractFieldFromRawJson(cleanContent, "content") || extractFieldFromRawJson(cleanContent, "summary") || extractFieldFromRawJson(cleanContent, "answer");
        if (extReply) {
          cleanContent = extReply;
        } else {
          cleanContent = cleanContent
            .replace(/^{\s*"responseType":\s*"[^"]*",?/i, "")
            .replace(/"summary":\s*"([^"]*)",?/gi, "$1\n")
            .replace(/"keyPoints":\s*\[[\s\S]*?\],?/gi, "")
            .replace(/"reply":\s*"/i, "")
            .replace(/"expandableSections":\s*\[[\s\S]*$/i, "")
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .trim();
        }
      }

      return {
        answer: cleanContent,
        reply: cleanContent,
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
