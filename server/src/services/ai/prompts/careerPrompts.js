export const GENERATE_PROJECT_KIT_SYSTEM = "You are an expert technical interviewer evaluating a software project. Return only valid JSON.";

export const buildProjectKitPrompt = (params) => {
  return `Generate an interview kit for the following project:
Name: ${params.name}
Technologies: ${(params.technologies || []).join(", ")}
Architecture: ${params.architecture}
Description: ${params.description}
Role: ${params.role}
Achievements: ${(params.achievements || []).join(", ")}
Complexity: ${params.complexity}

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "kit": [
    {
      "question": "<the interview question>",
      "category": "<e.g. Architecture, Behavioral, Technical>",
      "difficulty": "<easy|medium|hard>"
    }
  ]
}
`;
};

export const GENERATE_PREP_PLAN_SYSTEM = "You are an expert career coach creating a targeted preparation plan. Return only valid JSON.";

export const buildPrepPlanPrompt = (params) => {
  return `Generate a daily preparation plan for the candidate.
Target Role: ${params.targetRole}
Weak Skills Identified: ${params.weakSkills}
Plan Focus: ${params.generatedFor}

Return exactly a JSON object matching this structure:
{
  "actionItems": [
    {
      "title": "<short descriptive title>",
      "reason": "<why this helps>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "estimatedTimeMinutes": <number>,
      "source": "gap_analysis"
    }
  ]
}
`;
};

export const COPILOT_CHAT_SYSTEM = "You are an AI Career Copilot interacting directly with a job seeker. You return JSON containing your text reply and suggested actions.";

export const buildCopilotChatPrompt = (params) => {
  return `Context Data: ${params.contextData}

User Query: "${params.query}"

Provide a supportive and highly actionable response.
You MUST respond with ONLY a valid JSON object matching this structure:
{
  "reply": "<your response string>",
  "suggestedActions": ["<action 1>", "<action 2>"]
}
`;
};
