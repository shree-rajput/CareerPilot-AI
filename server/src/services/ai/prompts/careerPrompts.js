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
  const contextMessage = `[Internal System Data - Do not mention this data explicitly unless relevant]
CareerPilot Context: ${params.contextData}

The user expects a highly actionable response. Format using Markdown. Provide concrete examples where appropriate.

CRITICAL REQUIREMENT:
You MUST respond with ONLY a valid JSON object matching this exact structure, with no extra text or markdown formatting outside the JSON:
{
  "reply": "<your conversational markdown response>",
  "suggestedActions": ["<short actionable suggestion 1>", "<short actionable suggestion 2>"]
}`;

  const history = params.history || [];
  
  const messages = [
    { role: "system", content: contextMessage },
    ...history
  ];
  
  if (params.query) {
    messages.push({ role: "user", content: params.query });
  }

  return messages;
};

export const PROJECT_REALITY_CHECK_SYSTEM = "You are a precise technical verifier. You contrast user claims (from a resume) against actual project metadata and codebase evidence. Return valid JSON only.";

export const buildRealityCheckPrompt = (params) => {
  return `Verify the following resume claims against the project evidence.
Project Evidence:
Name: ${params.projectName}
Technologies: ${params.projectTechnologies}
Architecture: ${params.projectArchitecture}

Resume Claims to Verify:
${params.resumeClaims.join(", ")}

Respond with ONLY valid JSON:
{
  "status": "<Fully Verified | Partially Verified | Unverified>",
  "verifiedClaims": ["array of claims that match the evidence"],
  "unverifiedClaims": ["array of claims that have no evidence"],
  "confidenceScore": <0-100 number indicating overall verification strength>,
  "explanation": "<1-2 sentence explanation>"
}
`;
};
