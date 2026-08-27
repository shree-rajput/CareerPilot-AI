import { PreparationPlan } from "../../models/PreparationPlan.js";
import { UserSkill } from "../../models/UserSkill.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Creates a preparation plan based on the user's skill gaps and upcoming events.
 */
export async function generateDailyPlan(userId, targetRole, generatedFor = "General") {
  // Try to find an existing active plan
  let plan = await PreparationPlan.findOne({ userId, isActive: true });
  
  if (plan) {
    // Optionally archive old plan if it's outdated, but for now just return it
    // if we only want one active plan.
    return plan;
  }

  // Gather user's weakest skills to feed to AI
  const weakSkills = await UserSkill.find({ userId, proficiency: { $lt: 60 } }).limit(5).lean();
  const weakSkillNames = weakSkills.map(s => s.canonicalName).join(", ");

  let actionItems = [];

  try {
    // Assuming an AI task "GENERATE_PREP_PLAN" exists
    const response = await executeAiTask("GENERATE_PREP_PLAN", {
      targetRole,
      weakSkills: weakSkillNames,
      generatedFor
    });

    if (response && response.actionItems) {
      actionItems = response.actionItems;
    }
  } catch (error) {
    console.error("[PreparationService] AI plan generation failed, using fallback:", error);
    // Fallback rule-based action items
    if (weakSkills.length > 0) {
      actionItems.push({
        title: `Brush up on ${weakSkills[0].canonicalName}`,
        reason: "Identified as a weak area compared to target roles.",
        priority: "HIGH",
        estimatedTimeMinutes: 45,
        source: "gap_analysis"
      });
    } else {
      actionItems.push({
        title: "Practice a random medium algorithm problem.",
        reason: "General preparation for coding rounds.",
        priority: "MEDIUM",
        estimatedTimeMinutes: 30,
        source: "general"
      });
    }
  }

  plan = new PreparationPlan({
    userId,
    targetRole,
    generatedFor,
    actionItems,
    isActive: true
  });

  return await plan.save();
}

/**
 * Update the status of an action item
 */
export async function updateActionItemStatus(planId, itemId, status) {
  const plan = await PreparationPlan.findOneAndUpdate(
    { _id: planId, "actionItems._id": itemId },
    { $set: { "actionItems.$.status": status } },
    { new: true }
  );

  if (!plan) {
    throw new Error("Plan or action item not found.");
  }
  
  return plan;
}

/**
 * Get active plan for a user
 */
export async function getActivePlan(userId) {
  return await PreparationPlan.findOne({ userId, isActive: true });
}

/**
 * Archive current plan
 */
export async function archivePlan(planId) {
  return await PreparationPlan.findByIdAndUpdate(planId, { isActive: false }, { new: true });
}
