import { executeAiTask } from "../ai/orchestrator.js";

/**
 * ContextPlanner
 * Determines intent, resolved entities, and required data sources based on the user's query.
 * 
 * @param {string} query - The user's input message
 * @param {Array} history - Recent conversation history
 * @returns {Promise<Object>} The generated context plan
 */
export async function planContext(query, history = []) {
  try {
    // Truncate history to the last 3-4 turns to save tokens and prevent topic drift
    const recentHistory = history.slice(-4).map(m => ({
      role: m.role,
      content: typeof m.content === 'string' && m.content.length > 200 
        ? m.content.substring(0, 200) + "..." 
        : m.content
    }));

    const plan = await executeAiTask("COPILOT_CONTEXT_PLANNER", {
      query,
      history: recentHistory
    });

    const sources = plan.sources || [];
    if (!sources.includes("canonicalState")) {
      sources.push("canonicalState");
    }

    return {
      intent: plan.intent || "general",
      mode: mapIntentToMode(plan.intent),
      entities: plan.entities || [],
      sources
    };
  } catch (error) {
    console.error("[ContextPlanner] Error generating context plan. Falling back to default plan.", error.message);
    // Fallback heuristic if LLM fails
    return {
      intent: "general",
      mode: "COPILOT_GENERAL",
      entities: [],
      sources: ["profile"] // minimal fallback
    };
  }
}

/**
 * Maps the detected intent to the appropriate UI mode / System Prompt mode.
 */
function mapIntentToMode(intent) {
  switch (intent) {
    case "coding": return "COPILOT_CODING";
    case "resume": return "COPILOT_RESUME";
    case "job_matching": return "COPILOT_JOB_MATCH";
    case "interview": return "COPILOT_INTERVIEW";
    case "application": 
    case "outreach": 
    case "cover_letter": return "COPILOT_APPLICATION";
    case "project": return "COPILOT_PROJECT";
    case "skills":
    case "learning":
    case "job_search":
    case "dashboard":
    case "career_advice":
    case "clarification": return "COPILOT_CAREER";
    default: return "COPILOT_GENERAL";
  }
}
