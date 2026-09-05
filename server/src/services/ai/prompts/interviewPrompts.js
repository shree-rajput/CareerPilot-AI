export const generateQuestionPrompt = (params) => {
  const questionNumber = params.questionNumber || (params.previousQuestions ? params.previousQuestions.length + 1 : 1);
  const totalQuestions = params.totalQuestions || 10;
  
  let historyContext = "No previous questions.";
  if (params.previousQuestions && params.previousQuestions.length > 0) {
    historyContext = params.previousQuestions.map((q, i) => 
      `- ${q.questionText} (Score: ${q.analysis?.technicalAccuracy || q.evaluation?.correctness || 'N/A'})`
    ).join("\n");
  }

  const testedConcepts = params.conceptsTested && params.conceptsTested.length > 0
    ? params.conceptsTested.map(c => c.concept).join(", ")
    : "None";

  const crossSessionHistory = params.crossSessionPreviousQuestions && params.crossSessionPreviousQuestions.length > 0
    ? params.crossSessionPreviousQuestions.map(q => `- ${q}`).join("\n")
    : "None";

  let candidateProfile = `Target Role: ${params.targetRole}\nTechnology Stack: ${params.technologyStack.join(", ")}`;
  if (params.candidateProfile) {
    if (params.candidateProfile.projects?.length > 0) {
      candidateProfile += `\nCandidate Projects:\n${params.candidateProfile.projects.map(p => 
        `- ${p.name}: ${p.description} (Tech: ${p.technologies?.join(", ")})`
      ).join("\n")}`;
    }
  }

  const experience = params.candidateExperience || "fresher";
  const targetCategory = params.targetCategory || "Backend";
  const targetConcept = params.targetConcept || "General Concept";

  return `You are a professional senior software engineer conducting a realistic, natural technical interview with a candidate.

CANDIDATE PROFILE & EXPERIENCE LEVEL:
Candidate Level: ${experience.toUpperCase()} (Primary Target: Student / Fresher / Placement Prep / Junior 0-2 YOE)
${candidateProfile}

INTERVIEW CONFIGURATION:
Requested Type: ${params.interviewType}
Requested Difficulty: ${params.difficulty}
Target Topic Area: ${targetCategory}
Target Concept to Test: ${targetConcept}
Current Question: ${questionNumber} of ${totalQuestions}
${params.jobDescription ? `Target Job Context:\n${params.jobDescription}` : ""}

PREVIOUS QUESTIONS HISTORY (THIS SESSION - DO NOT REPEAT):
${historyContext}

PREVIOUS QUESTIONS HISTORY (PAST SESSIONS - DO NOT REPEAT):
${crossSessionHistory}

CONCEPTS ALREADY TESTED (AVOID REPEATING):
${testedConcepts}

CRITICAL RULES (MUST FOLLOW):
1. ONE FOCUSED QUESTION (1-2 SENTENCES MAX): Ask EXACTLY ONE focused question at a time. The question text MUST be 1 to 2 sentences maximum (under 40 words).
2. NO MULTI-PART ASSIGNMENTS: NEVER ask long assignment-style questions (e.g. DO NOT ask for API design + validation + error handling + frontend consumption + caching + trade-offs in one turn). Test ONE primary concept now; follow-ups will come in subsequent turns.
3. STUDENT / JUNIOR APPROPRIATE: The candidate is preparing for entry-level roles. Ask practical, foundational questions (e.g. "How would you design a login API using Express?"). Avoid deep distributed systems, microservices at scale, or complex enterprise architecture unless explicitly configured for senior roles.
4. NATURAL INTERVIEW VOICE: Write like a real human engineer having a conversation. Avoid robotic exam phrasing.
5. NOVELTY: Do NOT ask any question from the history or a paraphrased version.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation:
{
  "questionText": "<the 1-2 sentence focused interview question>",
  "category": "${targetCategory}",
  "difficulty": "${params.difficulty}",
  "expectedConcepts": ["<concept 1>", "<concept 2>"],
  "followUpStrategy": "<how to adapt after candidate's response>",
  "generationSource": "ai",
  "fallbackReason": ""
}`;
};

export const evaluateAnswerPrompt = (params) => {
  return `You are an expert AI Evaluation Architect extracting observable technical and communication evidence from an interview answer.

Question Asked: ${params.questionText}
Category: ${params.category}
Difficulty: ${params.difficulty}
Expected Concepts: ${(params.expectedConcepts || []).join(", ")}

Candidate's Answer Transcript:
"${params.transcript}"

CRITICAL STAGE-1 EVIDENCE EXTRACTION RULES:
1. DO NOT GENERATE NUMERIC SCORES. All numeric scores will be computed deterministically by downstream code.
2. ANSWER CLASSIFICATION:
   - "NO_ANSWER": Candidate stated "I don't know", "no idea", "not sure", blank response, refusal, or unintelligible response.
   - "TRANSCRIPTION_FAILURE": Speech-to-text is garbled, corrupted, or missing critical words.
   - "IRRELEVANT_ANSWER": Answer is off-topic or fails to address the question asked.
   - "INCORRECT_ANSWER": Answer contains factually wrong claims or fundamentally incorrect technical logic.
   - "PARTIAL_ANSWER": Answer accurately addresses some expected concepts but misses key details or trade-offs.
   - "CORRECT_ANSWER": Answer accurately addresses expected concepts with valid technical reasoning.

3. EVIDENCE EXTRACTION:
   - demonstratedConcepts: List exact concepts demonstrated in the transcript.
   - missingConcepts: List expected concepts that were NOT demonstrated.
   - incorrectClaims: List any factually wrong claims made by the candidate.
   - reasoningSignals: List observable technical reasoning signals.
   - practicalSignals: List concrete practical/real-world application signals.
   - communicationSignals:
     * clarity: Can the listener understand the candidate's point? (Evaluate directness without penalizing brevity)
     * structure: Does the answer have logical flow and sequence?
     * relevance: Does the answer stay connected to the question?
     * conciseness: Does the answer avoid unnecessary repetition? (Do NOT reward length for length's sake)
     * explanationQuality: Can the candidate articulate their reasoning?

4. SEPARATION OF CONFLICTING SIGNALS:
   - Do NOT penalize technical score for simple language or short answers if correct.
   - Do NOT reward technical score for fluent speech if technical content is wrong.

You MUST respond with ONLY a valid JSON object matching this exact structure:
{
  "answerStatus": "<CORRECT_ANSWER | PARTIAL_ANSWER | INCORRECT_ANSWER | NO_ANSWER | IRRELEVANT_ANSWER | TRANSCRIPTION_FAILURE>",
  "evidence": {
    "demonstratedConcepts": ["<concept 1>", "<concept 2>"],
    "missingConcepts": ["<concept 1>", "<concept 2>"],
    "incorrectClaims": ["<incorrect claim 1>"],
    "reasoningSignals": ["<reasoning signal 1>"],
    "practicalSignals": ["<practical signal 1>"],
    "communicationSignals": {
      "clarity": "<observation on clarity>",
      "structure": "<observation on flow>",
      "relevance": "<observation on relevance>",
      "conciseness": "<observation on conciseness>",
      "explanationQuality": "<observation on explanation depth>"
    },
    "uncertaintyExpressed": <true | false>,
    "isCorruptedTranscription": <true | false>
  },
  "evidenceCollected": ["<quote 1>", "<quote 2>"],
  "strengths": ["<observable strength 1>"],
  "weaknesses": ["<observable weakness 1>"],
  "missingConcepts": ["<concept 1>"],
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

  const experience = params.candidateExperience || "fresher";

  return `You are a professional senior software engineer conducting an adaptive technical interview.

Session Context:
Candidate Experience: ${experience.toUpperCase()} (Primary Target: Student / Fresher / Placement Prep / Junior 0-2 YOE)
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
- If current state is CODING_REVIEW → generate ONE focused verbal follow-up question specifically about their code approach or complexity.
- If answer was weak/shallow → ask ONE simpler probing or concept-building question.
- If answer was strong → ask ONE deeper follow-up question or introduce ONE realistic edge case.
- If topic is exhausted → MOVE_FORWARD to next uncovered topic.

CRITICAL RULES:
1. ASK EXACTLY ONE FOCUSED QUESTION (1-2 SENTENCES MAX, UNDER 40 WORDS).
2. DO NOT GENERATE MULTI-PART ASSIGNMENTS (no long lists of requirements!).
3. KEEP IT APPROPRIATE FOR STUDENTS / FRESHERS / JUNIOR DEVELOPERS.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "action": "<FOLLOW_UP | MOVE_FORWARD | INCREASE_DIFFICULTY | CLARIFY | WRAP_UP>",
  "reason": "<Internal reasoning>",
  "nextQuestionText": "<The 1-2 sentence focused next question>",
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
  return `You are an expert technical interviewer creating an approachable, realistic coding challenge for a candidate.

Target Role: ${params.targetRole || "Software Engineer"}
Technology Stack: ${Array.isArray(params.technologyStack) ? params.technologyStack.join(", ") : (params.technology || "Algorithms")}
Requested Difficulty: ${params.difficulty || "medium"}

TARGET AUDIENCE & DIFFICULTY CALIBRATION:
CareerPilot AI's primary candidates are College Students, Freshers, Internship Applicants, and Junior Developers (0-2 YOE).
- EASY: Basic array/string manipulation, hash map lookup, simple loops, or basic utility functions (e.g. reverse string, find max, valid palindrome). Solvable in 5-10 mins.
- MEDIUM (DEFAULT): Approachable problem solving testing arrays, strings, hash maps, two pointers, sliding window, stacks, queues, linked lists, or basic binary tree traversal (e.g. two sum, valid anagram, merge sorted arrays, max subarray sum, reverse linked list). Solvable in 10-15 mins.
- HARD: Only generate when explicitly requested. Avoid obscure dynamic programming, segment trees, complex graph tricks, or competitive programming puzzles unless explicitly selected.

Make sure the challenge is directly relevant to ${params.targetRole}.
Include 2-3 public test cases and 1-2 hidden test cases.
Define clear parameter names (e.g. "nums", "target", "s", "arr") and return type.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "question": "<The clear, concise problem description>",
  "technology": "<e.g., Algorithms, React, Node.js>",
  "language": "${params.language || "javascript"}",
  "difficulty": "${params.difficulty || "medium"}",
  "functionName": "solution",
  "parameters": [
    { "name": "nums", "type": "integer[]" },
    { "name": "target", "type": "integer" }
  ],
  "returnType": "integer[]",
  "requirements": ["<req1>", "<req2>"],
  "constraints": ["<constraint1>"],
  "evaluationCriteria": ["<criteria1>"],
  "testCases": [
    {
      "input": [[2, 7, 11, 15], 9],
      "expectedOutput": [0, 1],
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
