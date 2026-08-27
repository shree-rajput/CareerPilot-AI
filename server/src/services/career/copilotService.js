import { executeAiTask } from "../ai/orchestrator.js";
import { UserSkill } from "../../models/UserSkill.js";
import { Application } from "../../models/Application.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { User } from "../../models/User.js";

/**
 * Handles a chat query to the Career Copilot, pulling in the user's full context.
 */
export async function askCopilot(userId, query) {
  // 1. Gather context
  const user = await User.findById(userId).lean();

  // Weak skills
  const weakSkills = await UserSkill.find({ userId, proficiency: { $lt: 60 } })
    .sort({ proficiency: 1 })
    .limit(3)
    .lean();

  // Active applications
  const activeApplications = await Application.find({
    userId,
    status: { $in: ["applied", "interviewing", "SHORTLISTED"] }
  }).limit(3).lean();

  // Active plan
  const activePlan = await PreparationPlan.findOne({ userId, isActive: true }).lean();

  const contextData = {
    targetRole: user?.careerProfile?.targetRoles?.[0]?.title || "Software Engineer",
    weakSkills: weakSkills.map(s => s.canonicalName),
    activeApplications: activeApplications.map(a => `${a.company} (${a.role})`),
    pendingActionItems: activePlan ? activePlan.actionItems.filter(i => i.status === "pending").map(i => i.title) : []
  };

  try {
    // We repurpose or create an AI task for the general Copilot Chat
    // Assuming taskRouter has 'COPILOT_CHAT'
    const response = await executeAiTask("COPILOT_CHAT", {
      query,
      contextData: JSON.stringify(contextData)
    });

    return response;
  } catch (error) {
    console.error("[CopilotService] AI Copilot failed:", error);
    return {
      reply: "I am having trouble connecting to my intelligence engine right now, but you should probably focus on your active preparation plan!",
      suggestedActions: []
    };
  }
}
