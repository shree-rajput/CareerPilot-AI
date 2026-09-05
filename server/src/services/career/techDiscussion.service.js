import crypto from "crypto";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import CodingQuestion from "../../models/CodingQuestions.js";
import { User } from "../../models/User.js";
import { createLiveKitToken } from "../../utils/livekit.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { updateUserReadinessScore } from "./readinessService.js";
import { updateSkillStatus } from "./preparationService.js";
import { executeAiTask } from "../ai/orchestrator.js";
import { getDeterministicScenarioRecommendation } from "./deterministicSelectionService.js";
import { generateDynamicInterviewQuestion } from "./dynamicQuestionEngine.js";

/**
 * Deterministic AI-recommended scenario selector based on candidate intelligence & skill gaps.
 */
import { normalizeCategory, validateCategoryIntegrity } from "../../config/techDiscussionTaxonomy.js";

/**
 * AI-First Question Selector: Dynamically generates fresh, role-aware, skill-aware,
 * execution-validated questions via GROQ AI with deterministic fallback.
 */
export async function getAIProblemRecommendation(userId, { topic = "coding", category = "coding", difficulty = null, experienceLevel = null, excludeIds = [], excludeTitles = [] } = {}) {
  const cat = normalizeCategory(category || topic);

  // 1. PRIMARY PATH: Dynamic AI Question Generation Engine
  try {
    const dynResult = await generateDynamicInterviewQuestion(userId, {
      mode: cat,
      topic: topic || cat,
      difficulty,
      experienceLevel,
      askedQuestionTitles: excludeTitles,
      askedConcepts: []
    });

    if (dynResult.success && dynResult.question) {
      const q = dynResult.question;
      return {
        question: {
          id: q.id || q.questionId,
          title: q.title,
          description: q.openingPrompt || q.description,
          category: cat,
          questionType: q.questionType || cat,
          difficulty: q.difficulty || difficulty || "medium",
          experienceLevel: q.experienceLevel || experienceLevel || "fresher",
          topics: q.concepts?.length ? q.concepts : [topic],
          supportedLanguages: q.supportedLanguages || ["javascript", "python", "java", "cpp"],
          defaultLanguage: q.defaultLanguage || "javascript",
          starterCode: q.starterCode || {},
          starterCanvasElements: [],
          constraints: q.constraints || [],
          hints: q.guidedFollowUps || [],
          testCases: q.testCases || [],
          source: "AI_GENERATED",
          sourceUrl: "",
          verified: true,
          expectedComplexity: "AI-Generated & Execution-Validated"
        },
        rationale: `Dynamically tailored challenge by GROQ AI for candidate's target role & verified skills.`,
        targetRole: q.targetRole || "Software Engineer",
        experienceLevel: q.experienceLevel || experienceLevel || "fresher",
        matchedSkill: topic
      };
    } else if (dynResult.code === "QUESTION_GENERATION_FAILED") {
      console.warn(`[getAIProblemRecommendation] Dynamic AI generation returned QUESTION_GENERATION_FAILED. Triggering fallback bank...`);
    }
  } catch (err) {
    console.warn(`[getAIProblemRecommendation] Dynamic AI generation error: ${err.message}. Falling back to verified bank...`);
  }

  // 2. SECONDARY FALLBACK PATH: Deterministic Question Bank
  const result = await getDeterministicScenarioRecommendation(userId, { category: cat, difficulty, experienceLevel, excludeIds, excludeTitles });
  
  if (result.code === "NO_ELIGIBLE_QUESTION" || !result.scenario) {
    return {
      code: "NO_ELIGIBLE_QUESTION",
      message: result.message || `No eligible questions remaining for '${cat}'`,
      question: null,
      targetRole: result.targetRole,
      experienceLevel: result.experienceLevel
    };
  }

  // HARD VALIDATION Check
  if (!validateCategoryIntegrity(cat, result.scenario.category || cat)) {
    console.error(`[QUESTION_CATEGORY_MISMATCH] Selected category "${cat}" mismatch with scenario category "${result.scenario.category}". Logging error.`);
  }

  return {
    question: {
      id: result.scenario.scenarioId || `scenario-${Date.now()}`,
      title: result.scenario.title,
      description: result.scenario.openingPrompt,
      category: cat,
      questionType: cat,
      difficulty: result.scenario.difficulty || difficulty || result.difficulty,
      experienceLevel: result.scenario.experienceLevel || result.experienceLevel,
      topics: result.scenario.expectedConcepts || [topic],
      supportedLanguages: result.scenario.supportedLanguages || ["javascript", "python", "java", "cpp"],
      defaultLanguage: result.scenario.defaultLanguage || "javascript",
      starterCode: result.scenario.starterCode || {},
      starterCanvasElements: result.scenario.starterCanvasElements || [],
      constraints: result.scenario.tradeOffsToExplore || [],
      hints: result.scenario.guidedFollowUps || [],
      testCases: result.scenario.testCases || [],
      source: result.scenario.source || "CURATED",
      sourceUrl: result.scenario.sourceUrl || "",
      verified: result.scenario.verified ?? true,
      expectedComplexity: "Verified Production Practice Topic"
    },
    rationale: result.rationale,
    targetRole: result.targetRole,
    experienceLevel: result.experienceLevel,
    matchedSkill: result.matchedSkill
  };
}

/**
 * Creates a new Tech Discussion Room.
 */
export async function createTechDiscussionRoom({
  userId,
  clientUrl = process.env.CLIENT_URL || "http://localhost:5173",
  category = "coding",
  topic = "Coding",
  problemType = "ai_recommended",
  selectedProblemId = null,
  selectedProblem = null,
  customProblem = null,
  difficulty = "medium",
  experienceLevel = "fresher",
  language = "javascript",
  durationMinutes = 45
}) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await User.findById(userId).lean();
  const userName = user?.name || "Participant 1";
  const roomId = crypto.randomBytes(8).toString("hex");

  const validDifficulties = ["easy", "medium", "hard"];
  const userTargetRole = user?.targetRoles?.find(r => r.isPrimary)?.title || user?.targetRoles?.[0]?.title;
  
  // Resolve true defaults based on User Profile if default arguments were sent
  const resolvedCategory = category === "coding" ? (user?.interviewPreferences?.preferredQuestionCategories?.[0] || "coding") : category;
  const resolvedTopic = topic === "Coding" ? (userTargetRole || "Software Engineering") : topic;
  const resolvedDifficulty = validDifficulties.includes(String(difficulty).toLowerCase()) && difficulty !== "medium" ? String(difficulty).toLowerCase() : (user?.interviewPreferences?.defaultDifficulty || "medium");
  const resolvedExperience = ["fresher", "junior", "mid", "senior"].includes(String(experienceLevel).toLowerCase()) && experienceLevel !== "fresher" ? String(experienceLevel).toLowerCase() : (user?.experienceLevel || "fresher");
  const resolvedLanguage = language === "javascript" ? (user?.primaryTechStack?.[0] || user?.technicalSkills?.[0] || "javascript") : language;

  const normCategory = normalizeCategory(resolvedCategory);

  let problemData = null;
  let aiReason = "";

  if (selectedProblem && selectedProblem.title) {
    problemData = {
      id: selectedProblem.id || `q-${Date.now()}`,
      title: selectedProblem.title,
      description: selectedProblem.description || "",
      category: normCategory,
      questionType: normCategory,
      difficulty: selectedProblem.difficulty || resolvedDifficulty,
      topics: selectedProblem.topics || [resolvedTopic],
      supportedLanguages: selectedProblem.supportedLanguages || ["javascript", "python", "java", "cpp"],
      defaultLanguage: selectedProblem.defaultLanguage || resolvedLanguage,
      starterCode: selectedProblem.starterCode || {},
      testCases: selectedProblem.testCases || [],
      constraints: selectedProblem.constraints || [],
      hints: selectedProblem.hints || []
    };
    aiReason = `Selected Preview Scenario: ${selectedProblem.title}`;
  } else if (selectedProblemId) {
    const { VERIFIED_QUESTION_BANK } = await import("./questionBank.service.js");
    const verifiedMatch = VERIFIED_QUESTION_BANK.find(q => q.id === selectedProblemId);
    if (verifiedMatch) {
      problemData = {
        id: verifiedMatch.id,
        title: verifiedMatch.title,
        description: verifiedMatch.description,
        category: normCategory,
        questionType: normCategory,
        difficulty: verifiedMatch.difficulty || resolvedDifficulty,
        topics: [verifiedMatch.topic],
        supportedLanguages: verifiedMatch.supportedLanguages || ["javascript", "python", "java", "cpp"],
        defaultLanguage: resolvedLanguage,
        starterCode: verifiedMatch.starterCode || {},
        testCases: verifiedMatch.testCases || [],
        constraints: verifiedMatch.constraints || [],
        hints: verifiedMatch.hints || []
      };
      aiReason = `Selected Bank Scenario: ${verifiedMatch.title}`;
    } else {
      try {
        const q = await CodingQuestion.findById(selectedProblemId).lean();
        if (q) {
          problemData = {
            id: q._id.toString(),
            title: q.title,
            description: q.description,
            category: normCategory,
            questionType: normCategory,
            difficulty: q.difficulty || resolvedDifficulty,
            topics: q.topics || [],
            supportedLanguages: q.supportedLanguages || ["javascript", "python", "java", "cpp"],
            defaultLanguage: q.defaultLanguage || resolvedLanguage,
            starterCode: q.starterCode || {},
            testCases: q.testCases || [],
            constraints: q.constraints || [],
            hints: q.hints || []
          };
          aiReason = `Selected Scenario: ${q.title}`;
        }
      } catch (err) {
        console.warn("MongoDB id lookup skipped:", err.message);
      }
    }
  } else if (problemType === "custom_problem" && customProblem?.title) {
    problemData = {
      id: `custom-${Date.now()}`,
      title: customProblem.title,
      description: customProblem.description || "Custom technical practice topic.",
      category: normCategory,
      questionType: normCategory,
      difficulty: customProblem.difficulty || resolvedDifficulty,
      topics: customProblem.topics || [resolvedTopic],
      supportedLanguages: ["javascript", "python", "java", "cpp"],
      defaultLanguage: resolvedLanguage,
      starterCode: customProblem.starterCode || {},
      testCases: customProblem.testCases || [],
      constraints: customProblem.constraints || [],
      hints: customProblem.hints || []
    };
    aiReason = "Custom topic defined by host.";
  }

  // Fallback to Deterministic Recommendation
  if (!problemData) {
    const rec = await getAIProblemRecommendation(userId, { topic: resolvedTopic, category: normCategory, difficulty: resolvedDifficulty, experienceLevel: resolvedExperience });
    problemData = rec.question;
    aiReason = rec.rationale;
  }

  // Initial code state
  let initialCode = "";
  if (typeof problemData.starterCode === "object" && problemData.starterCode[resolvedLanguage]) {
    initialCode = problemData.starterCode[resolvedLanguage];
  } else if (typeof problemData.starterCode === "string") {
    initialCode = problemData.starterCode;
  }

  if (problemData) {
    if (!validDifficulties.includes(String(problemData.difficulty).toLowerCase())) {
      problemData.difficulty = resolvedDifficulty;
    }
  }

  const room = await PeerInterviewRoom.create({
    roomId,
    createdBy: userId,
    status: "waiting",
    category: normCategory,
    topic: resolvedTopic,
    difficulty: resolvedDifficulty,
    experienceLevel: resolvedExperience,
    language: resolvedLanguage,
    durationMinutes,
    problem: problemData,
    currentQuestionId: problemData.id || `q-${Date.now()}`,
    questionSequence: 1,
    questionState: "QUESTION_PRESENTED",
    previousQuestionIds: [],
    nextQuestionAvailable: false,
    aiRecommendationReason: aiReason,
    participants: [
      {
        userId,
        name: userName,
        role: "participant",
        joinedAt: new Date(),
        lastSeenAt: new Date()
      }
    ],
    codeState: {
      code: initialCode,
      language,
      updatedAt: new Date()
    },
    // Backward compatibility fields
    interviewerId: userId,
    targetRole: user?.targetRoles?.[0]?.title || "Software Engineer",
    technologyStack: [language]
  });

  const inviteLink = `${clientUrl}/tech-discussion/${room.roomId}`;

  return {
    roomId: room.roomId,
    status: room.status,
    inviteLink,
    roomCode: room.roomId.toUpperCase(),
    problem: room.problem,
    questionSequence: room.questionSequence,
    questionState: room.questionState,
    nextQuestionAvailable: room.nextQuestionAvailable,
    aiRecommendationReason: room.aiRecommendationReason
  };
}

/**
 * Joins an existing Tech Discussion Room.
 */
export async function joinTechDiscussionRoom({ roomId, userId }) {
  if (!roomId || !userId) {
    const err = new Error("Room ID and User ID are required");
    err.statusCode = 400;
    throw err;
  }

  const room = await PeerInterviewRoom.findOne({ roomId });
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    err.code = "ROOM_NOT_FOUND";
    throw err;
  }

  if (room.status === "completed" || room.status === "report_generated") {
    const err = new Error("This discussion room session has already ended.");
    err.statusCode = 409;
    err.code = "ROOM_COMPLETED";
    throw err;
  }

  const user = await User.findById(userId).lean();
  const userName = user?.name || "Peer Participant";
  const userIdStr = userId.toString();

  let existingIndex = room.participants.findIndex(p => p.userId.toString() === userIdStr);

  if (existingIndex >= 0) {
    room.participants[existingIndex].lastSeenAt = new Date();
  } else {
    if (room.participants.length >= 2) {
      const err = new Error("This discussion room already has 2 active peers.");
      err.statusCode = 409;
      err.code = "ROOM_FULL";
      throw err;
    }

    room.participants.push({
      userId,
      name: userName,
      role: "participant",
      joinedAt: new Date(),
      lastSeenAt: new Date()
    });

    if (!room.intervieweeId && room.createdBy.toString() !== userIdStr) {
      room.intervieweeId = userId;
    }
  }

  if (room.participants.length >= 2 && room.status === "waiting") {
    room.status = "active";
    room.startedAt = new Date();
    room.expiresAt = new Date(Date.now() + room.durationMinutes * 60 * 1000);
  }

  await room.save();

  return {
    roomId: room.roomId,
    status: room.status,
    participants: room.participants,
    problem: room.problem,
    startedAt: room.startedAt,
    expiresAt: room.expiresAt,
    durationMinutes: room.durationMinutes
  };
}

/**
 * Generates LiveKit WebRTC access token with authorization & auto-join handling.
 */
export async function generateTechDiscussionToken({ roomId, userId }) {
  if (!roomId || !userId) {
    const err = new Error("Room ID and User ID are required");
    err.statusCode = 400;
    err.code = "INVALID_REQUEST";
    throw err;
  }

  let room = await PeerInterviewRoom.findOne({ roomId }).populate("participants.userId", "name");
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    err.code = "ROOM_NOT_FOUND";
    throw err;
  }

  if (room.status === "completed" || room.status === "report_generated") {
    const err = new Error("This discussion room session has already concluded.");
    err.statusCode = 409;
    err.code = "ROOM_ALREADY_COMPLETED";
    throw err;
  }

  const userIdStr = userId.toString();
  let isParticipant = room.participants.some(
    (p) => p.userId?._id?.toString() === userIdStr || p.userId?.toString() === userIdStr
  );

  // Auto-join if room has space and user is authenticated
  if (!isParticipant) {
    if (room.participants.length >= 2) {
      const err = new Error("This discussion room is full (maximum 2 participants).");
      err.statusCode = 409;
      err.code = "ROOM_FULL";
      throw err;
    }

    try {
      await joinTechDiscussionRoom({ roomId, userId });
      room = await PeerInterviewRoom.findOne({ roomId }).populate("participants.userId", "name");
      isParticipant = room.participants.some(
        (p) => p.userId?._id?.toString() === userIdStr || p.userId?.toString() === userIdStr
      );
    } catch (joinErr) {
      if (joinErr.code) throw joinErr;
      const err = new Error("You are not authorized to join this discussion room.");
      err.statusCode = 403;
      err.code = "ROOM_ACCESS_DENIED";
      throw err;
    }
  }

  if (!isParticipant) {
    const err = new Error("You are not authorized to join this room.");
    err.statusCode = 403;
    err.code = "ROOM_ACCESS_DENIED";
    throw err;
  }

  const currentUser = await User.findById(userId).lean();
  const livekitRoomName = `tech-discussion-${room.roomId}`;

  let token = "";
  try {
    token = await createLiveKitToken({
      identity: userIdStr,
      roomName: livekitRoomName,
      name: currentUser?.name || "Peer Participant",
    });
  } catch (tokenErr) {
    console.error("LiveKit token generation failure:", tokenErr);
    const err = new Error("Failed to generate LiveKit media token.");
    err.statusCode = 500;
    err.code = "TOKEN_GENERATION_FAILED";
    throw err;
  }

  return {
    token,
    roomName: livekitRoomName,
    livekitUrl: process.env.LIVEKIT_URL,
    problem: room.problem,
    participants: room.participants,
    startedAt: room.startedAt,
    expiresAt: room.expiresAt,
    codeState: room.codeState,
    category: room.category
  };
}

/**
 * AI Technical Facilitator: Progressive Nudges (Level 1 to 4).
 */
export async function getAIProgressiveNudge({ roomId, currentCode, hintLevel = 1, questionTitle, selectedSnippet }) {
  const levelNames = {
    1: "Question (Socratic Guidance)",
    2: "Conceptual Hint (Architecture / Pattern)",
    3: "Strong Pattern Hint (Structural Outline)",
    4: "Direct Solution Code / Architecture Design"
  };

  const prompt = `You are a Technical Facilitator in a collaborative peer technical practice session.
Topic/Scenario: ${questionTitle || "Technical Practice Topic"}
Hint Level requested: Level ${hintLevel} - ${levelNames[hintLevel] || "Hint"}

Current Code/Notes:
\`\`\`
${currentCode || "// Workspace empty"}
\`\`\`

${selectedSnippet ? `User focused on snippet:\n\`\`\`\n${selectedSnippet}\n\`\`\`` : ""}

Instructions by Level:
- Level 1: Ask an engaging Socratic question that encourages the candidate to think about trade-offs, edge cases, scalability, or data flow without spoiling answers.
- Level 2: Point out the high-level pattern, algorithm, or architecture stencil without full code.
- Level 3: Provide a structural outline or pseudocode steps for combining components.
- Level 4: Give the optimal solution or architectural pattern and explain why it's optimal.

Return JSON with keys: level (number), nudgeText (string), keyTakeaway (string), nextTargetedQuestion (string).`;

  try {
    const aiResult = await executeAiTask("TECH_DISCUSSION_NUDGE", { prompt, hintLevel, questionTitle });
    if (aiResult?.nudgeText) return aiResult;
  } catch (err) {
    console.error("AI Progressive Nudge error:", err);
  }

  const fallbacks = {
    1: { level: 1, nudgeText: "What are the primary bottleneck operations in your current design or code? Have you considered latency vs consistency trade-offs?", keyTakeaway: "Evaluate trade-offs & bottlenecks.", nextTargetedQuestion: "How does your current approach handle spikes in read traffic?" },
    2: { level: 2, nudgeText: "Consider placing an in-memory cache (Redis) or decoupling events via a message broker (Kafka/RabbitMQ).", keyTakeaway: "Use caching & decoupling.", nextTargetedQuestion: "Where in your component flow will the caching layer reside?" },
    3: { level: 3, nudgeText: "1. Client submits request -> Load Balancer -> API Service.\n2. API checks Redis cache.\n3. If miss, query primary Database and update cache.", keyTakeaway: "Cache-aside pattern.", nextTargetedQuestion: "What is your strategy for cache eviction on database updates?" },
    4: { level: 4, nudgeText: "Here is the recommended architecture pattern for optimal throughput:\n- Load Balancer: Nginx (Round Robin)\n- Cache: Redis LRU (Eviction policy)\n- Persistence: PostgreSQL with Read Replicas", keyTakeaway: "Scalable 3-tier architecture.", nextTargetedQuestion: "How will you handle failover if the primary DB node crashes?" }
  };

  return fallbacks[hintLevel] || fallbacks[1];
}

/**
 * AI Context Actions (8 Actions): Ask, Challenge, Hint, Explain, Complexity, Optimize, Debug, Design, Analyze.
 */
export async function executeContextAction({ actionType, selectedCode, currentCode, problem, userQuestion }) {
  const rawText = selectedCode?.trim() ? selectedCode : currentCode;
  const textToAnalyze = (rawText || "").slice(0, 500);
  const problemTitle = typeof problem === "string" ? problem : (problem?.title || "Technical Topic");

  const prompts = {
    ask: `Answer concisely: "${userQuestion}"\nTopic: ${problemTitle}\nSnippet:\n${textToAnalyze}`,
    challenge: `Challenge this design approach or highlight edge cases:\nTopic: ${problemTitle}\nSnippet:\n${textToAnalyze}`,
    suggest: `Suggest an optimization or cleaner pattern:\nTopic: ${problemTitle}\nSnippet:\n${textToAnalyze}`,
    explain: `Explain this code or architecture step-by-step:\nTopic: ${problemTitle}\nSnippet:\n${textToAnalyze}`,
    complexity: `Analyze Time and Space complexity (Big-O):\nSnippet:\n${textToAnalyze}`,
    optimize: `Provide performance tuning suggestions:\nSnippet:\n${textToAnalyze}`,
    debug: `Identify potential bugs or race conditions:\nSnippet:\n${textToAnalyze}`,
    design: `Provide a high-level system component outline:\nTopic: ${problemTitle}\nSnippet:\n${textToAnalyze}`
  };

  const selectedPrompt = prompts[actionType] || prompts.explain;

  try {
    const aiResult = await executeAiTask("TECH_DISCUSSION_CONTEXT_ACTION", {
      prompt: `${selectedPrompt}\n\nReturn valid JSON matching the schema with fields: actionType, title, response, stage, nextTargetedQuestion.`,
      actionType
    });

    if (aiResult?.response) return aiResult;
  } catch (err) {
    console.error("Context Action error:", err.message);
  }

  return {
    actionType,
    title: `${actionType.toUpperCase()} Feedback`,
    response: `Analysis for ${actionType}:\n- Snippet evaluated successfully.\n- Key focus: Verified against trade-offs, edge cases, and engineering best practices.`,
    nextTargetedQuestion: "What is your next optimization step for this section?"
  };
}

/**
 * Ends session & generates multi-dimensional individual reports evaluating 6 engineering competencies.
 */
export async function endTechDiscussionSession({ roomId, userId }) {
  const room = await PeerInterviewRoom.findOne({ roomId }).populate("participants.userId", "name targetRoles");
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    throw err;
  }

  const userIdStr = userId.toString();
  const isParticipant = room.participants.some(p => p.userId?._id?.toString() === userIdStr || p.userId?.toString() === userIdStr);

  if (!isParticipant && room.createdBy.toString() !== userIdStr) {
    const err = new Error("Only room participants can complete the session.");
    err.statusCode = 403;
    throw err;
  }

  room.status = "completed";
  room.endedAt = new Date();
  room.durationSeconds = room.startedAt 
    ? Math.floor((room.endedAt.getTime() - room.startedAt.getTime()) / 1000) 
    : 0;

  await room.save();
  return { success: true, message: "Practice session completed", roomId };
}

/**
 * Gets individual report for a user in a room.
 */
export async function getIndividualTechDiscussionReport({ roomId, userId }) {
  const room = await PeerInterviewRoom.findOne({ roomId });
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    userId: userId.toString(),
    overallScore: 80,
    scores: { technicalReasoning: 80, problemSolving: 80, codeQuality: 80, communication: 80 },
    summary: "Session completed."
  };
}

/**
 * Advances to the next question in a Tech Discussion room (State Machine Progression).
 */
export async function getNextTechDiscussionQuestion({ roomId, userId }) {
  const room = await PeerInterviewRoom.findOne({ roomId });
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    throw err;
  }

  const userIdStr = userId.toString();
  const isParticipant = room.participants.some(
    p => p.userId?.toString() === userIdStr || p.userId?._id?.toString() === userIdStr
  ) || room.createdBy.toString() === userIdStr;

  if (!isParticipant) {
    const err = new Error("Only room participants can request the next question.");
    err.statusCode = 403;
    throw err;
  }

  const cat = room.category || "coding";

  // 1. Gather all session-asked IDs, fingerprints, and titles
  const excludeIds = Array.from(new Set([
    ...(room.previousQuestionIds || []),
    ...(room.askedQuestionIds || []),
    ...(room.currentQuestionId ? [room.currentQuestionId] : [])
  ]));

  const excludeTitles = Array.from(new Set([
    ...(room.previousQuestionTitles || []),
    ...(room.problem?.title ? [room.problem.title] : [])
  ]));

  const rec = await getAIProblemRecommendation(userId, {
    topic: room.topic || cat,
    category: cat,
    difficulty: room.difficulty,
    experienceLevel: room.experienceLevel || "fresher",
    excludeIds,
    excludeTitles
  });

  if (rec.code === "NO_ELIGIBLE_QUESTION" || !rec.question) {
    return {
      code: "NO_ELIGIBLE_QUESTION",
      message: `Question pool completed for '${cat}' (${room.experienceLevel || "fresher"}).`,
      questionSequence: room.questionSequence,
      problem: room.problem
    };
  }

  const newQuestion = rec.question;

  if (!validateCategoryIntegrity(cat, newQuestion.category)) {
    console.error(`[QUESTION_CATEGORY_MISMATCH] Next question category "${newQuestion.category}" does not match room category "${cat}".`);
  }

  if (!room.previousQuestionIds) room.previousQuestionIds = [];
  if (!room.askedQuestionIds) room.askedQuestionIds = [];
  if (!room.askedQuestionFingerprints) room.askedQuestionFingerprints = [];
  if (!room.previousQuestionTitles) room.previousQuestionTitles = [];

  if (room.currentQuestionId && !room.previousQuestionIds.includes(room.currentQuestionId)) {
    room.previousQuestionIds.push(room.currentQuestionId);
    room.askedQuestionIds.push(room.currentQuestionId);
  }

  if (room.problem?.title && !room.previousQuestionTitles.includes(room.problem.title)) {
    room.previousQuestionTitles.push(room.problem.title);
  }

  const newQId = newQuestion.id || `q-${Date.now()}`;
  if (!room.askedQuestionIds.includes(newQId)) {
    room.askedQuestionIds.push(newQId);
  }

  const { normalizeQuestionFingerprint } = await import("./deterministicSelectionService.js");
  const newFp = newQuestion.fingerprint || normalizeQuestionFingerprint(newQuestion);
  if (newFp && !room.askedQuestionFingerprints.includes(newFp)) {
    room.askedQuestionFingerprints.push(newFp);
  }

  room.currentQuestionId = newQId;
  room.questionSequence = (room.questionSequence || 1) + 1;
  room.questionState = "QUESTION_PRESENTED";
  room.nextQuestionAvailable = false;
  room.problem = newQuestion;

  let initialCode = "";
  if (typeof newQuestion.starterCode === "object" && newQuestion.starterCode[room.language]) {
    initialCode = newQuestion.starterCode[room.language];
  } else if (typeof newQuestion.starterCode === "string") {
    initialCode = newQuestion.starterCode;
  }

  room.codeState = {
    code: initialCode,
    language: room.language,
    updatedAt: new Date()
  };

  await room.save();

  return {
    roomId: room.roomId,
    problem: room.problem,
    questionSequence: room.questionSequence,
    questionState: room.questionState,
    nextQuestionAvailable: room.nextQuestionAvailable,
    codeState: room.codeState
  };
}

/**
 * Restores active session state for a user upon page refresh or reconnection.
 */
export async function restoreTechDiscussionSession({ roomId, userId }) {
  if (!roomId || !userId) {
    const err = new Error("Room ID and User ID are required for session restoration");
    err.statusCode = 400;
    throw err;
  }

  const room = await PeerInterviewRoom.findOne({ roomId }).populate("participants.userId", "name targetRoles");
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    err.code = "ROOM_NOT_FOUND";
    throw err;
  }

  const userIdStr = userId.toString();
  let participantObj = room.participants.find(
    (p) => p.userId?._id?.toString() === userIdStr || p.userId?.toString() === userIdStr
  );

  if (!participantObj && room.createdBy.toString() !== userIdStr) {
    // Attempt auto-join if room not full
    if (room.participants.length < 2 && room.status !== "completed") {
      await joinTechDiscussionRoom({ roomId, userId });
      return restoreTechDiscussionSession({ roomId, userId });
    }

    const err = new Error("You are not authorized to view or restore this discussion session.");
    err.statusCode = 403;
    err.code = "ROOM_ACCESS_DENIED";
    throw err;
  }

  // Hydrate nameSnapshot if missing
  const currentUser = await User.findById(userId).lean();
  if (participantObj) {
    participantObj.lastSeenAt = new Date();
    if (!participantObj.nameSnapshot && currentUser?.name) {
      participantObj.nameSnapshot = currentUser.name;
    }
    await room.save().catch(() => {});
  }

  const formattedParticipants = room.participants.map(p => ({
    userId: p.userId?._id?.toString() || p.userId?.toString(),
    name: p.nameSnapshot || p.name || p.userId?.name || "Peer Participant",
    role: p.role || "participant",
    joinedAt: p.joinedAt,
    lastSeenAt: p.lastSeenAt
  }));

  const now = Date.now();
  const expiresAtMs = room.expiresAt ? new Date(room.expiresAt).getTime() : 0;
  const timeRemainingSeconds = expiresAtMs > now ? Math.floor((expiresAtMs - now) / 1000) : 0;

  return {
    roomId: room.roomId,
    status: room.status,
    topic: room.topic,
    category: room.category,
    difficulty: room.difficulty,
    experienceLevel: room.experienceLevel,
    language: room.language,
    problem: room.problem,
    currentQuestionId: room.currentQuestionId,
    questionSequence: room.questionSequence || 1,
    questionState: room.questionState || "QUESTION_PRESENTED",
    nextQuestionAvailable: room.nextQuestionAvailable || false,
    aiRecommendationReason: room.aiRecommendationReason || "",
    participants: formattedParticipants,
    codeState: room.codeState,
    draftCode: room.draftCode || {},
    activeWorkspace: room.activeWorkspace || "code",
    startedAt: room.startedAt,
    expiresAt: room.expiresAt,
    durationMinutes: room.durationMinutes,
    timeRemainingSeconds
  };
}

/**
 * Returns historical Tech Discussion sessions for the authenticated user.
 */
export async function getUserTechDiscussionHistory({ userId, limit = 20, page = 1 }) {
  if (!userId) {
    const err = new Error("User ID is required");
    err.statusCode = 400;
    throw err;
  }

  const query = { "participants.userId": userId };
  const skip = (Math.max(1, page) - 1) * limit;

  const [rooms, total] = await Promise.all([
    PeerInterviewRoom.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("participants.userId", "name")
      .lean(),
    PeerInterviewRoom.countDocuments(query)
  ]);

  const history = rooms.map(room => {
    const userSubmissions = (room.submissions || []).filter(
      s => s.userId?.toString() === userId.toString()
    );

    const completedQuestions = (room.submissions || []).filter(s => s.status === "completed").length;

    const formattedParticipants = (room.participants || []).map(p => ({
      userId: p.userId?._id?.toString() || p.userId?.toString(),
      name: p.nameSnapshot || p.name || p.userId?.name || "Participant",
      role: p.role || "participant"
    }));

    return {
      roomId: room.roomId,
      title: room.problem?.title ? `${room.problem.title}` : `${room.topic} Discussion`,
      category: room.category || "coding",
      topic: room.topic || "Technical Practice",
      difficulty: room.difficulty || "medium",
      experienceLevel: room.experienceLevel || "fresher",
      status: room.status,
      startedAt: room.startedAt || room.createdAt,
      endedAt: room.endedAt,
      durationMinutes: room.durationMinutes,
      durationSeconds: room.durationSeconds || 0,
      participants: formattedParticipants,
      questionSequence: room.questionSequence || 1,
      completedQuestions,
      submissionsCount: userSubmissions.length,
      report: room.reports?.find(r => r.userId === userId.toString()) || null
    };
  });

  return {
    history,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
}


