export const generateQuestionPrompt = (params) => {
  const questionNumber = params.questionNumber || (params.previousQuestions ? params.previousQuestions.length + 1 : 1);
  const totalQuestions = params.totalQuestions || 5;

  return `You are an expert technical interviewer conducting a mock interview.

Candidate's Target Role: ${params.targetRole}
Candidate's Technology Stack: ${params.technologyStack.join(", ")}
Requested Interview Type: ${params.interviewType}
Requested Difficulty: ${params.difficulty}
Current Question: ${questionNumber} of ${totalQuestions}
${params.jobDescription ? `Job Description / Context:\n${params.jobDescription}` : ""}

${params.previousQuestions && params.previousQuestions.length > 0
    ? `Previously asked questions in this session (do NOT repeat these):\n${params.previousQuestions.map((q, i) => `${i + 1}. ${q.questionText}`).join("\n")}`
    : "This is the first question of the interview."}

Based on the candidate's profile and the context above, generate ONE highly relevant interview question.

Guidelines:
1. If the interview type is "technical", focus on the technology stack (e.g., how things work under the hood, tradeoffs).
2. If the interview type is "hr" or "project", focus on behavioral scenarios (STAR method) or project decisions.
3. If "mixed", pick a balanced question.
4. The question should match the requested difficulty.
5. Do NOT repeat any previously asked question.
6. Make it sound like a real question spoken by a human interviewer.
7. Return exactly one question.
8. If this is the final question (question ${questionNumber} of ${totalQuestions}), make it a strong closing question.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON object must use EXACTLY these field names:

{
  "questionText": "<the full interview question as a string>",
  "category": "<topic category, e.g. React, System Design, Behavioral>",
  "difficulty": "<one of: easy | medium | hard>",
  "expectedConcepts": ["<concept 1>", "<concept 2>", "..."],
  "followUpStrategy": "<how to adapt after this answer>",
  "generationSource": "ai",
  "fallbackReason": ""
}`;
};

export const evaluateAnswerPrompt = (params) => {
  return `You are an expert technical interviewer evaluating a candidate's answer.

Question Asked: ${params.questionText}
Category: ${params.category}
Difficulty: ${params.difficulty}
Expected Concepts: ${params.expectedConcepts.join(", ")}

Candidate's Answer Transcript:
"${params.transcript}"

Communication Metrics (computed locally):
- Speaking Pace: ${params.metrics?.speakingPace || "N/A"} wpm
- Filler Words Detected: ${params.metrics?.fillerWords || 0}
- Long Pauses: ${params.metrics?.longPauses || 0}

Evaluate the candidate's answer comprehensively.

Guidelines:
1. Be objective and constructive.
2. If the transcript contains many filler words or pauses, slightly penalize the communication score, but focus mostly on clarity and conciseness.
3. If the answer is completely off-topic, penalize relevance and completeness heavily.
4. Generate a highly structured "ideal answer" that the candidate can learn from, using frameworks like STAR for behavioral, or direct structured explanations for technical questions.
5. Do not invent details for the ideal answer that don't make sense for the question.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON object must use EXACTLY these field names:

{
  "technicalAccuracy": <number 0-100>,
  "relevance": <number 0-100>,
  "completeness": <number 0-100>,
  "clarity": <number 0-100>,
  "structure": <number 0-100>,
  "communication": <number 0-100>,
  "feedback": {
    "strengths": ["<strength 1>", "..."],
    "weaknesses": ["<weakness 1>", "..."]
  },
  "idealAnswer": {
    "text": "<well-structured example answer>",
    "explanation": "<why this answer is strong>"
  },
  "analysisSource": "ai",
  "fallbackReason": ""
}`;
};

export const generateInterviewPlanPrompt = (params) => {
  return `You are an expert technical interviewer planning a structured interview.

Candidate's Target Role: ${params.targetRole}
Candidate's Technology Stack: ${params.technologyStack.join(", ")}
Interview Type: ${params.interviewType}
Interview Difficulty: ${params.difficulty}
Duration: ${params.durationMinutes || 45} minutes

Generate a structured interview plan.
Include an Introduction, 1-3 Technical Questions (depending on duration), a Coding Problem (if technical or mixed), Follow-up Questions, and a Wrap-up.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "plan": [
    {
      "questionText": "<the topic or exact question>",
      "category": "<e.g. Introduction, Behavioral, System Design, Coding, Wrap-up>",
      "difficulty": "<easy|medium|hard>",
      "expectedConcepts": ["<concept1>", "<concept2>"]
    }
  ]
}
`;
};

export const generateCopilotPrompt = (params) => {
  return `You are an AI Copilot assisting a human interviewer in real-time.

Current Question being asked: "${params.currentQuestion}"
Candidate's context/answer so far (or their code):
"${params.context}"

Provide a suggestion for what the interviewer should ask next to probe deeper into the candidate's understanding or to guide them if they are stuck.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "suggestedFollowUp": "<the suggested question>",
  "reason": "<why this is a good follow-up>",
  "difficulty": "<difficulty of the follow-up>"
}
`;
};

export const analyzeCodePrompt = (params) => {
  return `You are an expert code reviewer analyzing a candidate's submitted solution.

Coding Problem: "${params.questionTitle}"
Description: "${params.questionDescription}"
Language Used: ${params.language}

Candidate's Code:
\`\`\`${params.language}
${params.code}
\`\`\`

Test Execution Results (if any):
"${params.testResults}"

Analyze the code for correctness, time/space complexity, edge cases, and code quality.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "metrics": {
    "correctness": <0-100>,
    "efficiency": <0-100>,
    "codeQuality": <0-100>,
    "edgeCases": <0-100>
  },
  "timeComplexity": "<Big O>",
  "spaceComplexity": "<Big O>",
  "strengths": ["<strength1>", "<strength2>"],
  "potentialIssues": ["<issue1>", "<issue2>"],
  "optimizationOpportunities": ["<opportunity1>", "<opportunity2>"]
}
`;
};
