import mongoose from "mongoose";
import { executeAiTask } from "../ai/orchestrator.js";
import { CopilotConversation } from "../../models/CopilotConversation.js";
import { planContext } from "../copilot/contextPlanner.js";
import { buildEvidence } from "../copilot/evidenceBuilder.js";
import { validateResponseRelevance } from "./copilotIntentEngine.js";
import { aiLogger } from "../ai/observability.js";
import { AppError } from "../../utils/errors.js";
import crypto from "crypto";

export async function getConversations(userId) {
  return await CopilotConversation.find({ userId })
    .sort({ updatedAt: -1 })
    .select("-messages") // Don't load full messages for the list
    .lean();
}

export async function getConversation(userId, conversationId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_CONVERSATION_ID");
  }

  const conv = await CopilotConversation.findOne({ _id: conversationId, userId }).lean();
  if (!conv) {
    const exists = await CopilotConversation.findById(conversationId).lean();
    if (exists) {
      throw new AppError("Access denied to this conversation", 403, "CONVERSATION_ACCESS_DENIED");
    }
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }
  return conv;
}

export async function createConversation(userId, title = "New Conversation") {
  const conv = new CopilotConversation({ userId, title, messages: [] });
  await conv.save();
  return conv.toObject();
}

export async function renameConversation(userId, conversationId, title) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_CONVERSATION_ID");
  }

  const conv = await CopilotConversation.findOneAndUpdate(
    { _id: conversationId, userId },
    { title },
    { new: true }
  ).lean();
  if (!conv) {
    const exists = await CopilotConversation.findById(conversationId).lean();
    if (exists) {
      throw new AppError("Access denied to this conversation", 403, "CONVERSATION_ACCESS_DENIED");
    }
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }
  return conv;
}

export async function deleteConversation(userId, conversationId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_CONVERSATION_ID");
  }

  const result = await CopilotConversation.findOneAndDelete({ _id: conversationId, userId });
  if (!result) {
    const exists = await CopilotConversation.findById(conversationId).lean();
    if (exists) {
      throw new AppError("Access denied to this conversation", 403, "CONVERSATION_ACCESS_DENIED");
    }
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }
  return true;
}

export async function shareConversation(userId, conversationId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_CONVERSATION_ID");
  }

  const conv = await CopilotConversation.findOne({ _id: conversationId, userId });
  if (!conv) {
    const exists = await CopilotConversation.findById(conversationId).lean();
    if (exists) {
      throw new AppError("Access denied to this conversation", 403, "CONVERSATION_ACCESS_DENIED");
    }
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  if (!conv.isShared) {
    conv.isShared = true;
    conv.shareToken = crypto.randomBytes(16).toString("hex");
    await conv.save();
  }

  return { shareToken: conv.shareToken };
}

export async function getSharedConversation(shareToken) {
  const conv = await CopilotConversation.findOne({ isShared: true, shareToken })
    .select("-userId") // Do not leak the owner's ID
    .lean();
  if (!conv) throw new AppError("Shared conversation not found", 404, "CONVERSATION_NOT_FOUND");
  return conv;
}

/**
 * Truncates and budgets context object payload to prevent HTTP 413 / LLM token overload.
 */
function budgetContextData(contextData, maxChars = 3000) {
  let str = typeof contextData === "string" ? contextData : JSON.stringify(contextData);
  if (str.length <= maxChars) return str;

  try {
    const clone = JSON.parse(JSON.stringify(contextData));

    // Trim sub-arrays
    if (clone.resumeIntelligence?.projects) {
      clone.resumeIntelligence.projects = clone.resumeIntelligence.projects.slice(0, 2);
    }
    if (Array.isArray(clone.applications)) {
      clone.applications = clone.applications.slice(0, 2);
    }
    if (clone.interviewIntelligence?.weaknesses) {
      clone.interviewIntelligence.weaknesses = clone.interviewIntelligence.weaknesses.slice(0, 2);
    }

    str = JSON.stringify(clone);
    if (str.length <= maxChars) return str;
  } catch {
    // Fallback if parsing string fails
  }

  return str.substring(0, maxChars);
}

/**
 * Handles sending a message to a specific conversation with Intent Detection,
 * Context Relevance Filtering, and Post-Generation Relevance Validation.
 */
/**
 * Normalizes any LLM response structure into a clean content string, sections array, and suggested actions.
 */
function normalizeCopilotResponse(response) {
  if (typeof response === "string") {
    return {
      content: response.trim(),
      sections: [],
      suggestedActions: []
    };
  }

  if (!response || typeof response !== "object") {
    return {
      content: "",
      sections: [],
      suggestedActions: []
    };
  }

  let content = (response.reply || response.content || response.text || response.message || response.answer || response.response || "").trim();
  let sections = Array.isArray(response.sections) ? response.sections : [];
  let suggestedActions = Array.isArray(response.suggestedActions)
    ? response.suggestedActions.map(a => (typeof a === "string" ? a : a?.label || a?.text || a?.title || String(a || ""))).filter(Boolean)
    : [];

  // If top-level reply/content is empty but UI sections exist, synthesize full markdown content
  if (!content && sections.length > 0) {
    const parts = [];
    for (const sec of sections) {
      if (sec.type === "code") {
        parts.push(`\`\`\`${sec.language || ""}\n${sec.content || ""}\n\`\`\``);
      } else if (sec.type === "steps") {
        const titleHeader = sec.title ? `### ${sec.title}\n` : "";
        const itemLines = (sec.items || []).map(item => `- ${item}`).join("\n");
        parts.push(`${titleHeader}${itemLines}`);
      } else if (sec.type === "callout") {
        parts.push(`> **${sec.title || "Note"}**: ${sec.content || ""}`);
      } else {
        if (sec.title) parts.push(`### ${sec.title}`);
        if (sec.content) parts.push(sec.content);
      }
    }
    content = parts.filter(Boolean).join("\n\n");
  }

  return {
    content,
    sections,
    suggestedActions
  };
}

/**
 * Send a user message and generate a structured Copilot response.
 */
export async function sendMessage(userId, conversationId, query) {
  const startTime = Date.now();

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_CONVERSATION_ID");
  }

  const conv = await CopilotConversation.findOne({ _id: conversationId, userId });
  if (!conv) {
    const exists = await CopilotConversation.findById(conversationId).lean();
    if (exists) {
      throw new AppError("Access denied to this conversation", 403, "CONVERSATION_ACCESS_DENIED");
    }
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  // Generate title if this is the first message
  if (conv.messages.length === 0) {
    conv.title = query.length > 40 ? query.substring(0, 40) + "..." : query;
  }

  // 1. Add User Message
  conv.messages.push({ role: "user", content: query, sections: [] });

  // 2. Context Planning
  const plan = await planContext(query, conv.messages.slice(0, -1));
  const { intent, mode } = plan;

  // 3. Build Evidence (Retrieve Relevant Data)
  const rawContext = await buildEvidence(plan, userId);
  
  // Clean null/empty keys
  const cleanContext = JSON.parse(JSON.stringify(rawContext, (key, value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;
    return value;
  }));

  const budgetedContextStr = budgetContextData(cleanContext, 1500);

  let normalizedContent = "";
  let normalizedSections = [];
  let suggestedActions = [];
  let isFallback = false;
  let wasCorrected = false;

  try {
    const history = conv.messages.slice(0, -1).slice(-4).map(m => ({
      role: m.role,
      content: typeof m.content === 'string' && m.content.length > 150 ? m.content.substring(0, 150) + "..." : m.content
    }));

    // 4. Primary AI Call
    let response = await executeAiTask("COPILOT_CHAT", {
      query,
      history,
      contextData: budgetedContextStr
    });

    let normalized = normalizeCopilotResponse(response);

    // 5. Response Relevance Check if structured object
    if (typeof response !== "string") {
      let validation = validateResponseRelevance(response, query, intent, rawContext);

      if (!validation.isValid) {
        console.warn(`[CopilotService] Response failed relevance validation (${validation.reason}). Retrying with targeted correction...`);
        wasCorrected = true;

        const correctionQuery = `${query}\n\n[INSTRUCTION: The previous answer failed validation because: ${validation.reason}. Answer the user's question directly without inventing non-existent records or forcing unrelated profile/resume details.]`;

        response = await executeAiTask("COPILOT_CHAT", {
          query: correctionQuery,
          history,
          contextData: budgetedContextStr
        });

        normalized = normalizeCopilotResponse(response);
      }
    }

    normalizedContent = normalized.content;
    normalizedSections = normalized.sections;
    suggestedActions = normalized.suggestedActions;

    if (!normalizedContent) {
      console.error("[CopilotService] Normalized content is empty after primary AI call!");
      normalizedContent = "I could not format a complete response for your query. Please try rephrasing your question.";
    }

  } catch (error) {
    console.warn("[CopilotService] Primary AI Copilot request failed. Retrying with minimal fallback context...", error?.message || error);
    isFallback = true;

    try {
      const minimalContext = {
        candidateProfile: rawContext.profile || { name: "Candidate" }
      };

      const fallbackResponse = await executeAiTask("COPILOT_CHAT", {
        query,
        history: [],
        contextData: JSON.stringify(minimalContext)
      });

      const normalized = normalizeCopilotResponse(fallbackResponse);
      normalizedContent = normalized.content || "I couldn't generate the answer right now. Please try again.";
      normalizedSections = normalized.sections;
      suggestedActions = normalized.suggestedActions;
    } catch (fallbackErr) {
      console.error("[CopilotService] AI Copilot fallback also failed:", fallbackErr?.message || fallbackErr);
      
      const errCode = fallbackErr?.code || fallbackErr?.errorCode || "AI_UNAVAILABLE";
      if (errCode === "AI_RATE_LIMITED" || fallbackErr?.statusCode === 429) {
        normalizedContent = "AI usage limit reached. Please wait a few seconds and try again.";
      } else if (errCode === "AI_NOT_CONFIGURED" || fallbackErr?.statusCode === 503) {
        normalizedContent = "CareerPilot AI is not configured correctly. Please check your environment settings.";
      } else if (errCode === "AI_MODEL_NOT_FOUND") {
        normalizedContent = "The configured AI model is currently unavailable.";
      } else if (errCode === "ETIMEDOUT" || errCode === "AI_TIMEOUT") {
        normalizedContent = "The AI request timed out. Please try rephrasing your question.";
      } else {
        normalizedContent = `CareerPilot AI encountered an error (${fallbackErr?.message || "service unavailable"}). Please try asking your question again.`;
      }
      
      suggestedActions = ["Retry question", "Explore Job Board", "View Preparation Plan"];
    }
  }

  // 6. Save AI Message in Conversation with Content & Sections
  conv.messages.push({
    role: "assistant",
    content: normalizedContent,
    sections: normalizedSections
  });
  await conv.save();

  // 7. Server-Side Detailed Debug Logging
  console.log(`
[COPILOT DEBUG LOG]
---------------------------------------------------
query: "${query}"
intent: ${intent}
mode: ${mode}
contextSize: ${budgetedContextStr?.length || 0}
responseLength: ${normalizedContent.length}
sectionsCount: ${normalizedSections.length}
suggestedActionsCount: ${suggestedActions.length}
fallbackTriggered: ${isFallback}
wasCorrected: ${wasCorrected}
---------------------------------------------------
  `);

  // 8. Observability Logging
  aiLogger.logOperation({
    task: "COPILOT_CHAT",
    modelRole: mode,
    latencyMs: Date.now() - startTime,
    success: !isFallback,
    retryCount: wasCorrected ? 1 : 0,
    validationResult: wasCorrected ? "corrected" : (isFallback ? "fallback" : "passed")
  });

  return {
    success: true,
    reply: normalizedContent,
    message: {
      role: "assistant",
      content: normalizedContent,
      sections: normalizedSections
    },
    suggestedActions,
    intent,
    mode,
    conversation: conv.toObject()
  };
}
