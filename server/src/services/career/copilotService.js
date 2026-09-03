import mongoose from "mongoose";
import { executeAiTask } from "../ai/orchestrator.js";
import { CopilotConversation } from "../../models/CopilotConversation.js";
import { getCandidateIntelligenceContext } from "./candidateIntelligenceService.js";
import {
  classifyIntent,
  mapIntentToMode,
  buildFilteredContext,
  filterRelevantHistory,
  validateResponseRelevance
} from "./copilotIntentEngine.js";
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
  conv.messages.push({ role: "user", content: query });

  // 2. Classify Intent & Map Mode
  const intent = classifyIntent(query, conv.messages);
  const mode = mapIntentToMode(intent);

  // 3. Retrieve & Filter Context strictly based on intent
  const rawContext = await getCandidateIntelligenceContext(userId, intent);
  const filteredContext = buildFilteredContext(rawContext, intent);

  // Filter conversation history to prevent topic contamination
  const history = filterRelevantHistory(conv.messages.slice(0, -1), intent);

  // Clean null/empty keys
  const cleanContext = JSON.parse(JSON.stringify(filteredContext, (key, value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;
    return value;
  }));

  const budgetedContextStr = budgetContextData(cleanContext, 1500);

  let aiResponseContent = "";
  let suggestedActions = [];
  let wasCorrected = false;

  try {
    // 4. Primary AI Call
    let response = await executeAiTask("COPILOT_CHAT", {
      query,
      history,
      contextData: budgetedContextStr
    });

    // Handle plain text response fallback safely
    if (typeof response === "string") {
      aiResponseContent = response;
    } else {
      // 5. Response Relevance Check
      let validation = validateResponseRelevance(response, query, intent, filteredContext);

      if (!validation.isValid) {
        console.warn(`[CopilotService] Response failed relevance validation (${validation.reason}). Retrying with targeted correction...`);
        wasCorrected = true;

        const correctionQuery = `${query}\n\n[INSTRUCTION: The previous answer failed validation because: ${validation.reason}. Answer the user's question directly without inventing non-existent records or forcing unrelated profile/resume details.]`;

        response = await executeAiTask("COPILOT_CHAT", {
          query: correctionQuery,
          history,
          contextData: budgetedContextStr
        });
      }

      aiResponseContent = typeof response === "string" ? response : (response.reply || response.content || "I am here to assist with your career goals.");
      suggestedActions = Array.isArray(response.suggestedActions) ? response.suggestedActions : [];
    }

  } catch (error) {
    console.warn("[CopilotService] Primary AI Copilot request failed. Retrying with minimal fallback context...", error?.message || error);

    try {
      const minimalContext = {
        candidateProfile: {
          name: rawContext?.careerProfile?.name || "Candidate",
          targetRoles: rawContext?.careerProfile?.targetRoles || []
        }
      };

      const fallbackResponse = await executeAiTask("COPILOT_CHAT", {
        query,
        history: [], // Drop history to eliminate token bloat
        contextData: JSON.stringify(minimalContext)
      });

      aiResponseContent = typeof fallbackResponse === "string" ? fallbackResponse : (fallbackResponse.reply || fallbackResponse.content || "I am here to help you navigate your career.");
      suggestedActions = Array.isArray(fallbackResponse.suggestedActions) ? fallbackResponse.suggestedActions : [];
    } catch (fallbackErr) {
      console.error("[CopilotService] AI Copilot fallback also failed:", fallbackErr?.message || fallbackErr);
      
      const errCode = fallbackErr?.code || fallbackErr?.errorCode || "AI_UNAVAILABLE";
      if (errCode === "AI_RATE_LIMITED" || fallbackErr?.statusCode === 429) {
        aiResponseContent = "AI usage limit reached. Please try again in a few seconds.";
      } else if (errCode === "AI_NOT_CONFIGURED" || fallbackErr?.statusCode === 503) {
        aiResponseContent = "CareerPilot AI is not configured correctly. Please verify your environment settings.";
      } else if (errCode === "AI_MODEL_NOT_FOUND") {
        aiResponseContent = "The configured AI model is currently unavailable.";
      } else if (errCode === "ETIMEDOUT" || errCode === "AI_TIMEOUT") {
        aiResponseContent = "The AI request took too long to complete. Please retry.";
      } else {
        aiResponseContent = `CareerPilot AI encountered an issue (${fallbackErr?.message || "service unavailable"}). Please try rephrasing your question.`;
      }
      
      suggestedActions = ["Retry question", "Explore Job Board", "View Preparation Plan"];
    }
  }

  // 6. Save AI Message
  conv.messages.push({ role: "assistant", content: aiResponseContent });
  await conv.save();

  // 7. Observability Logging
  aiLogger.logOperation({
    task: "COPILOT_CHAT",
    modelRole: mode,
    latencyMs: Date.now() - startTime,
    success: true,
    retryCount: wasCorrected ? 1 : 0,
    validationResult: wasCorrected ? "corrected" : "passed"
  });

  return {
    reply: aiResponseContent,
    suggestedActions,
    intent,
    mode,
    conversation: conv.toObject()
  };
}
