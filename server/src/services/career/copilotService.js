import { executeAiTask } from "../ai/orchestrator.js";
import { UserSkill } from "../../models/UserSkill.js";
import { Application } from "../../models/Application.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { User } from "../../models/User.js";
import { CopilotConversation } from "../../models/CopilotConversation.js";
import crypto from "crypto";

async function getContextData(userId) {
  const user = await User.findById(userId).lean();
  
  const weakSkills = await UserSkill.find({ userId, proficiency: { $lt: 60 } })
    .sort({ proficiency: 1 })
    .limit(3)
    .lean();

  const activeApplications = await Application.find({
    userId,
    status: { $in: ["applied", "interviewing", "SHORTLISTED"] }
  }).limit(3).lean();

  const activePlan = await PreparationPlan.findOne({ userId, isActive: true }).lean();

  return {
    targetRole: user?.careerProfile?.targetRoles?.[0]?.title || "Software Engineer",
    weakSkills: weakSkills.map(s => s.canonicalName),
    activeApplications: activeApplications.map(a => `${a.company} (${a.role})`),
    pendingActionItems: activePlan ? activePlan.actionItems.filter(i => i.status === "pending").map(i => i.title) : []
  };
}

export async function getConversations(userId) {
  return await CopilotConversation.find({ userId })
    .sort({ updatedAt: -1 })
    .select("-messages") // Don't load full messages for the list
    .lean();
}

export async function getConversation(userId, conversationId) {
  const conv = await CopilotConversation.findOne({ _id: conversationId, userId }).lean();
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

export async function createConversation(userId, title = "New Conversation") {
  const conv = new CopilotConversation({ userId, title, messages: [] });
  await conv.save();
  return conv.toObject();
}

export async function renameConversation(userId, conversationId, title) {
  const conv = await CopilotConversation.findOneAndUpdate(
    { _id: conversationId, userId },
    { title },
    { new: true }
  ).lean();
  if (!conv) throw new Error("Conversation not found");
  return conv;
}

export async function deleteConversation(userId, conversationId) {
  const result = await CopilotConversation.findOneAndDelete({ _id: conversationId, userId });
  if (!result) throw new Error("Conversation not found");
  return true;
}

export async function shareConversation(userId, conversationId) {
  const conv = await CopilotConversation.findOne({ _id: conversationId, userId });
  if (!conv) throw new Error("Conversation not found");
  
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
  if (!conv) throw new Error("Shared conversation not found");
  return conv;
}

/**
 * Handles sending a message to a specific conversation
 */
export async function sendMessage(userId, conversationId, query) {
  const conv = await CopilotConversation.findOne({ _id: conversationId, userId });
  if (!conv) throw new Error("Conversation not found");

  // Generate title if this is the first message
  if (conv.messages.length === 0) {
    conv.title = query.length > 40 ? query.substring(0, 40) + "..." : query;
  }

  // 1. Add User Message
  conv.messages.push({ role: "user", content: query });
  
  // 2. Gather Context
  const contextData = await getContextData(userId);
  
  // Prepare history for AI (skip system messages to save tokens, only pass user/assistant)
  // Take last 10 messages for context window size constraints
  const history = conv.messages.slice(-11, -1).map(m => ({
    role: m.role,
    content: m.content
  }));

  let aiResponseContent = "";
  let suggestedActions = [];

  try {
    const response = await executeAiTask("COPILOT_CHAT", {
      query,
      history,
      contextData: JSON.stringify(contextData)
    });
    
    aiResponseContent = response.reply;
    suggestedActions = response.suggestedActions || [];
  } catch (error) {
    console.error("[CopilotService] AI Copilot failed:", error);
    aiResponseContent = "I am having trouble connecting to my intelligence engine right now. Please try again in a moment.";
  }

  // 3. Save AI Message
  conv.messages.push({ role: "assistant", content: aiResponseContent });
  await conv.save();

  return {
    reply: aiResponseContent,
    suggestedActions,
    conversation: conv.toObject()
  };
}
