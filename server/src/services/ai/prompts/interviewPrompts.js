export const generateQuestionPrompt = (params) => {
  const questionNumber = params.questionNumber || (params.previousQuestions ? params.previousQuestions.length + 1 : 1);
  const totalQuestions = params.totalQuestions || 10;
  
  // Format previous questions context (combines current session and cross-session history)
  let historyContext = "No previous questions.";
  if (params.previousQuestions && params.previousQuestions.length > 0) {
    historyContext = params.previousQuestions.map((q, i) => 
      `- ${q.questionText} (Score: ${q.analysis?.technicalAccuracy || q.evaluation?.correctness || 'N/A'})`
    ).join("\n");
  }

  // Format concepts already tested
  const testedConcepts = params.conceptsTested && params.conceptsTested.length > 0
    ? params.conceptsTested.map(c => c.concept).join(", ")
    : "None";

  // Format cross-session history
  const crossSessionHistory = params.crossSessionPreviousQuestions && params.crossSessionPreviousQuestions.length > 0
    ? params.crossSessionPreviousQuestions.map(q => `- ${q}`).join("\n")
    : "None";

  // Format candidate context (projects, skills)
  let candidateProfile = `Target Role: ${params.targetRole}\nTechnology Stack: ${params.technologyStack.join(", ")}`;
  if (params.candidateProfile) {
    if (params.candidateProfile.projects?.length > 0) {
      candidateProfile += `\nCandidate Projects:\n${params.candidateProfile.projects.map(p => 
        `- ${p.name}: ${p.description} (Tech: ${p.technologies?.join(", ")})`
      ).join("\n")}`;
    }
  }

  return `You are an expert technical interviewer conducting a realistic, adaptive mock interview.

CANDIDATE PROFILE:
${candidateProfile}

INTERVIEW CONFIGURATION:
Requested Type: ${params.interviewType}
Requested Difficulty: ${params.difficulty}
Current Question: ${questionNumber} of ${totalQuestions}
${params.jobDescription ? `Target Job Context:\n${params.jobDescription}` : ""}
Session Seed: ${params.interviewSeed || "random"}

PREVIOUS QUESTIONS HISTORY (THIS SESSION - DO NOT REPEAT):
${historyContext}

PREVIOUS QUESTIONS HISTORY (PAST SESSIONS - DO NOT REPEAT):
${crossSessionHistory}

CONCEPTS ALREADY TESTED (AVOID REPEATING):
${testedConcepts}

Based on the candidate's profile, requested difficulty, and PREVIOUS PERFORMANCE, generate ONE highly relevant and UNIQUE interview question.

CRITICAL GUIDELINES:
1. NOVELTY: Do NOT ask any question from the history. Do NOT ask a paraphrased version. Do NOT test the exact same concept unless explicitly following up.
2. STRICT DIFFICULTY CALIBRATION:
   - EASY: Focus on core fundamentals, clear definitions, basic framework mechanics, and approachable concepts.
   - MEDIUM: Focus on practical implementation, common patterns, real-world scenario trade-offs, and state/error handling.
   - HARD: Focus on advanced optimization, deep internal mechanics, scalability under load, or complex system trade-offs.
3. ADAPTIVE DIFFICULTY: If the candidate answered previous questions well (high correctness), ask a slightly deeper question. If they struggled, step down difficulty or ask a concept-building question.
4. PERSONALIZATION: Strongly prefer asking questions based on the Candidate Projects provided above. Ask about their specific architecture, choices, or challenges in those projects instead of generic definitions.
5. TYPE: Vary the question type. Use a mix of CONCEPTUAL, PRACTICAL, SCENARIO, and BEHAVIORAL based on the interview type.
6. Make it sound like a real question spoken by a human interviewer.
7. Return exactly one question.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation.
The JSON object must use EXACTLY these field names:

{
  "questionText": "<the full interview question as a string>",
  "category": "<topic category, e.g. React, System Design, Behavioral>",
  "difficulty": "<easy | medium | hard>",
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

CRITICAL EVALUATION GUIDELINES:
1. STRICT NON-ANSWER ASSESSMENT: If the candidate answered "No", "I don't know", "No idea", "I'm not sure", or provided empty/irrelevant gibberish, you MUST set answerStatus to "NO_ANSWER", correctnessScore to 0, correctness to "Low", relevance to "Low", depth to "Low", and communication.score to 0.
2. ANSWER CLASSIFICATION:
   - "NO_ANSWER": Candidate declined to answer, stated they don't know, or gave a non-response (score = 0).
   - "INCORRECT": Candidate attempted but gave factually wrong or completely off-target information (score = 1-30).
   - "PARTIAL": Candidate covered some expected concepts accurately but missed important details or trade-offs (score = 31-70).
   - "CORRECT": Candidate answered accurately, clearly, and addressed core technical concepts (score = 71-100).
3. Generate a highly structured "ideal answer" that the candidate can learn from.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON object must use EXACTLY these field names:

{
  "answerStatus": "<NO_ANSWER | INCORRECT | PARTIAL | CORRECT>",
  "correctnessScore": <0-100 numeric correctness score, 0 for NO_ANSWER>,
  "relevance": "<High | Medium | Low>",
  "correctness": "<High | Medium | Low>",
  "depth": "<High | Medium | Low>",
  "specificity": "<High | Medium | Low>",
  "structure": "<High | Medium | Low>",
  "communication": {
    "score": <0-100 overall communication score>,
    "clarity": <0-100 rating on directness and understandability>,
    "relevance": <0-100 rating on staying on topic>,
    "structure": <0-100 rating on logical flow and sequencing>,
    "conciseness": <0-100 rating on efficiency without rambling>,
    "fillerUsage": <0-100 rating for minimal filler words>,
    "evidence": ["<specific observation 1>", "<specific observation 2>"]
  },
  "evidenceCollected": ["<quote or specific point 1>", "<quote or specific point 2>"],
  "strengths": ["<strength 1>", "..."],
  "weaknesses": ["<weakness 1>", "..."],
  "missingConcepts": ["<concept 1>", "..."],
  "confidence": "<HIGH | MEDIUM | LOW>",
  "idealAnswer": {
    "text": "<well-structured example answer>",
    "explanation": "<why this answer is strong>"
  },
  "analysisSource": "ai",
  "fallbackReason": ""
}`;
};

export const extractCandidateContextPrompt = (params) => {
  return `You are an expert technical interviewer preparing for a mock interview.
Review the candidate's resume and the job description to extract the necessary context.

Candidate Resume:
${params.resumeText || "No resume provided"}

Job Description / Target Role:
${params.jobDescription || params.targetRole}

Provide a summary of their background relative to the role, their relevant skills, and potential gaps to probe.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "summary": "<2-3 sentence summary>",
  "relevantSkills": ["<skill1>", "<skill2>"],
  "potentialGaps": ["<gap1>", "<gap2>"]
}`;
};

export const adaptiveActionPrompt = (params) => {
  const historyContext = params.previousQuestions && params.previousQuestions.length > 0
    ? params.previousQuestions.map(q => `- ${q.questionText}`).join("\n")
    : "No previous questions.";

  const codingSection = params.codingContext
    ? `\nCoding Challenge Just Completed: "${params.codingContext.question}"\nAI Follow-up Hint: "${params.codingContext.aiFollowUp}"\n`
    : "";

  return `You are an expert technical interviewer adapting an ongoing interview.

Session Context:
Target Role: ${params.targetRole}
Technology Stack: ${params.technologyStack?.join(", ") || "Unknown"}
Current Interview State: ${params.currentState || "THEORY"}
Previous Questions (DO NOT REPEAT):
${historyContext}
${codingSection}
Immediately Prior Question: ${params.previousQuestionText}
Candidate's Answer Transcript: "${params.transcript}"
Recent Evaluation: ${JSON.stringify(params.evaluation)}

Decide the next logical step. Based on the evaluation AND the current state:
- If current state is CODING_REVIEW → generate a follow-up question specifically about their code approach, complexity, or design choices.
- If the answer was weak/shallow → CLARIFY or ask a fundamental question.
- If the answer was strong/deep → INCREASE_DIFFICULTY or ask a deeper practical SCENARIO.
- If the topic is exhausted → MOVE_FORWARD to a new topic.

Provide the specific next question text ensuring it is NOVEL and does not repeat previous questions.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "action": "<FOLLOW_UP | MOVE_FORWARD | INCREASE_DIFFICULTY | CLARIFY | WRAP_UP>",
  "reason": "<Internal reasoning>",
  "nextQuestionText": "<The actual text of the next question or follow-up>",
  "expectedConcepts": ["<concept1>", "<concept2>"]
}`;
};

export const generateCoachingReportPrompt = (params) => {
  return `You are an expert career coach writing a final feedback report for a candidate after a mock interview.

Target Role: ${params.targetRole}
Interview History:
${JSON.stringify(params.questions.map(q => ({ question: q.questionText, transcript: q.transcript, evaluation: q.evaluation })), null, 2)}

Create a personalized, constructive coaching report based on the evidence from the interview.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "overallAssessment": "<Professional, high-level summary>",
  "whatYouDidWell": ["<strength1>", "<strength2>"],
  "whatWentWrong": ["<weakness1>", "<weakness2>"],
  "whyItWentWrong": "<Root-cause analysis>",
  "howToImprove": ["<step1>", "<step2>"],
  "practicePlan": [
    {
      "day": 1,
      "focus": "<topic>",
      "action": "<exercise>"
    }
  ]
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
      "section": "<e.g. Introduction, Behavioral, Technical Core>",
      "skill": "<e.g. React, Scalability>",
      "difficulty": "<easy|medium|hard>",
      "objective": "<what to discover>",
      "evaluationCriteria": ["<criteria1>", "<criteria2>"]
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

export const generateInterviewChallengePrompt = (params) => {
  return `You are an expert technical interviewer creating a dynamic coding challenge for a candidate.

Target Role: ${params.targetRole}
Technology Stack: ${params.technologyStack.join(", ")}
Requested Difficulty: ${params.difficulty}

DIFFICULTY GUIDELINES:
- EASY: Basic array/string manipulation, hash map lookup, simple loops, or basic utility functions. Solvable in < 10 mins.
- MEDIUM: Two-pointers, sliding window, stack/queue, basic tree traversal, or practical API/state manipulation. Solvable in 15 mins.
- HARD: Algorithmic optimization, advanced data structures, dynamic programming, or complex graph problems.

Make sure the challenge is directly relevant to ${params.targetRole}.
Include 2-3 public test cases and 1-2 hidden test cases.
Make sure the starter code defines a valid function named solution(input).

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "question": "<The full problem description>",
  "technology": "<e.g., Algorithms, React, Node.js>",
  "language": "${params.language || "javascript"}",
  "difficulty": "${params.difficulty}",
  "starterCode": {
    "javascript": "function solution(input) { \\n  // Your code here\\n}"
  },
  "requirements": ["<req1>", "<req2>"],
  "constraints": ["<constraint1>"],
  "evaluationCriteria": ["<criteria1>"],
  "testCases": [
    {
      "input": {"nums": [1,2], "target": 3},
      "expectedOutput": [0,1],
      "explanation": "<why>",
      "hidden": false
    }
  ]
}
`;
};

/**
 * Generates a short, natural interviewer reaction to the candidate's most recent answer.
 * The reaction is 1-3 sentences max — acknowledgement + natural bridge into the next question.
 * This is separate from the next question itself.
 */
export const interviewerReactionPrompt = (params) => {
  const evalSummary = params.evaluation
    ? `Evaluation: correctness=${params.evaluation.correctness}, depth=${params.evaluation.depth}, relevance=${params.evaluation.relevance}`
    : "No evaluation available.";

  return `You are a professional technical interviewer with a calm, slightly conversational personality.

The candidate just answered a question.

Question Asked: "${params.questionText}"
Candidate's Answer: "${params.transcript}"
${evalSummary}

Generate a SHORT (1-3 sentence) natural interviewer reaction to this answer.

Rules:
1. Do NOT ask the next question — only react to what was said.
2. Match tone to answer quality:
   - Strong answer (CORRECT): brief genuine affirmation + hint at going deeper. Example: "Good. That's a solid foundation."
   - Partial answer (PARTIAL): encouraging but honest response. Example: "You've got the general idea right, though there's an important trade-off to consider."
   - Weak/Incorrect answer (INCORRECT): neutral/corrective response without fake praise. Example: "I see your approach, but there's a key distinction here."
   - Declined/Unknown (NO_ANSWER): supportive response without fake praise. Example: "That's okay. Not knowing a specific detail is completely normal in an interview."
   - Off-topic: politely redirect. Example: "Interesting point. Let me bring us back to the core question."
3. Sound like a calm human professional, NOT like an AI assistant.
4. DO NOT use exaggerated praise ("Great!", "Amazing!", "Excellent!", "Fantastic!", "Well done!") especially on weak, wrong, or NO_ANSWER responses.
5. Keep it concise (1-2 short sentences, under 35 words).

You MUST respond with ONLY a valid JSON object:
{
  "reaction": "<the 1-2 sentence reaction string>",
  "tone": "<affirming | neutral | probing | redirecting | supportive>"
}`;
};

/**
 * After code submission, generates a natural interviewer comment + a verbal follow-up question.
 * This smoothly transitions from coding back to the verbal interview.
 */
export const codingFollowUpPrompt = (params) => {
  return `You are a professional technical interviewer who just reviewed a candidate's code submission.

Coding Problem: "${params.questionTitle}"
Language Used: ${params.language}
Test Results: Passed ${params.passedTests} of ${params.totalTests} test cases.

Code Submitted:
\`\`\`${params.language}
${params.code}
\`\`\`

AI Code Review Summary:
${params.aiReviewSummary || "Not available."}

Generate a SHORT (2-3 sentence) natural interviewer comment on the code, followed by ONE verbal follow-up question.

The comment should:
- Reference something SPECIFIC about their code (approach, data structure, complexity)
- Be honest but professional — don't over-praise or over-criticize
- Transition naturally back to verbal Q&A

The follow-up question should:
- Reference the specific code approach they used
- Test deeper understanding (e.g., scalability, edge cases, alternatives, complexity trade-offs)

You MUST respond with ONLY a valid JSON object:
{
  "comment": "<2-3 sentence code review comment>",
  "followUpQuestion": "<the specific verbal follow-up question>"
}`;
};
