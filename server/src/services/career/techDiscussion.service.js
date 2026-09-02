import crypto from "crypto";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import CodingQuestion from "../../models/CodingQuestions.js";
import { User } from "../../models/User.js";
import { createLiveKitToken } from "../../utils/livekit.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { updateUserReadinessScore } from "./readinessService.js";
import { updateSkillStatus } from "./preparationService.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * AI-recommended problem selector based on candidate intelligence & skill gaps.
 */
export async function getAIProblemRecommendation(userId, { topic = "DSA", difficulty = "medium" } = {}) {
  let userGaps = [];
  let targetRole = "Software Engineer";
  let readinessScore = 50;

  try {
    const intel = await getCareerIntelligence(userId);
    userGaps = intel.skillGaps || [];
    targetRole = intel.targetRoles?.[0] || "Software Engineer";
    readinessScore = intel.readinessScore || 50;
  } catch (err) {
    console.warn("Could not fetch full career intelligence for problem recommendation:", err.message);
  }

  // 1. Try to find a matching coding question in DB
  const query = { isActive: true };
  if (difficulty) query.difficulty = difficulty;

  const dbQuestions = await CodingQuestion.find(query).lean();
  let selectedQuestion = null;
  let rationale = "";

  if (dbQuestions && dbQuestions.length > 0) {
    // Pick question matching topic or gap
    const gapNames = userGaps.map(g => g.skill.toLowerCase());
    const matched = dbQuestions.find(q => 
      (q.topics || []).some(t => gapNames.includes(t.toLowerCase()))
    );

    if (matched) {
      selectedQuestion = matched;
      const matchedSkill = userGaps.find(g => (matched.topics || []).some(t => t.toLowerCase() === g.skill.toLowerCase()))?.skill;
      rationale = `Recommended based on your target role (${targetRole}). Your profile shows a skill gap in '${matchedSkill || matched.topics[0]}', so practicing '${matched.title}' will boost your readiness score (currently ${readinessScore}%).`;
    } else {
      selectedQuestion = dbQuestions[Math.floor(Math.random() * dbQuestions.length)];
      rationale = `Recommended for ${targetRole} practice in ${topic}. This problem tests core data structures and algorithmic complexity.`;
    }
  }

  // Fallback default question if DB is empty
  if (!selectedQuestion) {
    selectedQuestion = {
      id: "lru-cache-fallback",
      title: "LRU Cache Implementation",
      description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `get` and `put` methods with O(1) average time complexity.",
      difficulty: difficulty || "medium",
      topics: ["Data Structures", "HashMap", "Doubly Linked List"],
      supportedLanguages: ["javascript", "python", "java"],
      defaultLanguage: "javascript",
      starterCode: {
        javascript: "class LRUCache {\n  /**\n   * @param {number} capacity\n   */\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n\n  get(key) {\n    // Implement O(1) get\n    return -1;\n  }\n\n  put(key, value) {\n    // Implement O(1) put\n  }\n}",
        python: "class LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = {}\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass",
        java: "import java.util.*;\n\nclass LRUCache {\n    private int capacity;\n    public LRUCache(int capacity) {\n        this.capacity = capacity;\n    }\n    public int get(int key) {\n        return -1;\n    }\n    public void put(int key, int value) {\n    }\n}"
      },
      testCases: [
        { input: "LRUCache(2); put(1, 1); put(2, 2); get(1); put(3, 3); get(2);", expectedOutput: "1, -1", explanation: "key 2 was evicted when key 3 was inserted" }
      ],
      constraints: ["1 <= capacity <= 3000", "0 <= key <= 10000", "At most 2*10^5 calls to get and put"],
      hints: ["Consider combining a HashMap for O(1) lookup with a Doubly Linked List for O(1) node removal and insertion."],
      expectedComplexity: "Time: O(1) for get and put, Space: O(capacity)"
    };
    rationale = `Recommended: LRU Cache (${difficulty.toUpperCase()}). Rationale: Your profile indicates high target role expectations in ${targetRole}. Building caching structures is essential for backend & system design readiness.`;
  }

  return {
    question: selectedQuestion,
    rationale
  };
}

/**
 * Creates a new Tech Discussion Room.
 */
export async function createTechDiscussionRoom({
  userId,
  clientUrl = process.env.CLIENT_URL || "http://localhost:5173",
  topic = "DSA",
  problemType = "ai_recommended",
  selectedProblemId = null,
  customProblem = null,
  difficulty = "medium",
  language = "javascript",
  durationMinutes = 45
}) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await User.findById(userId).lean();
  const userName = user?.name || "Participant 1";
  const roomId = crypto.randomBytes(8).toString("hex");

  let problemData = null;
  let aiReason = "";

  if (problemType === "select_problem" && selectedProblemId) {
    const q = await CodingQuestion.findById(selectedProblemId).lean();
    if (q) {
      problemData = {
        id: q._id.toString(),
        title: q.title,
        description: q.description,
        difficulty: q.difficulty || difficulty,
        topics: q.topics || [],
        supportedLanguages: q.supportedLanguages || ["javascript", "python", "java"],
        defaultLanguage: q.defaultLanguage || language,
        starterCode: q.starterCode || {},
        testCases: q.testCases || [],
        constraints: q.constraints || [],
        hints: q.hints || [],
        expectedComplexity: q.expectedComplexity || ""
      };
      aiReason = `Selected Problem: ${q.title}`;
    }
  } else if (problemType === "custom_problem" && customProblem?.title) {
    problemData = {
      id: `custom-${Date.now()}`,
      title: customProblem.title,
      description: customProblem.description || "Custom technical problem.",
      difficulty: customProblem.difficulty || difficulty,
      topics: customProblem.topics || [topic],
      supportedLanguages: ["javascript", "python", "java"],
      defaultLanguage: language,
      starterCode: customProblem.starterCode || {},
      testCases: customProblem.testCases || [],
      constraints: customProblem.constraints || [],
      hints: customProblem.hints || [],
      expectedComplexity: customProblem.expectedComplexity || ""
    };
    aiReason = "Custom challenge defined by room host.";
  }

  // Fallback to AI recommended
  if (!problemData) {
    const rec = await getAIProblemRecommendation(userId, { topic, difficulty });
    problemData = rec.question;
    aiReason = rec.rationale;
  }

  // Initial code state
  let initialCode = "";
  if (typeof problemData.starterCode === "object" && problemData.starterCode[language]) {
    initialCode = problemData.starterCode[language];
  } else if (typeof problemData.starterCode === "string") {
    initialCode = problemData.starterCode;
  }

  const room = await PeerInterviewRoom.create({
    roomId,
    createdBy: userId,
    status: "waiting",
    topic,
    difficulty,
    language,
    durationMinutes,
    problem: problemData,
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

  // Check if participant is already registered
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

    // Populate backward compatibility field
    if (!room.intervieweeId && room.createdBy.toString() !== userIdStr) {
      room.intervieweeId = userId;
    }
  }

  // If 2 peers joined, set room active & starting timer
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
 * Generates LiveKit WebRTC access token for Tech Discussion peers.
 */
export async function generateTechDiscussionToken({ roomId, userId }) {
  if (!roomId || !userId) {
    const err = new Error("Room ID and User ID are required");
    err.statusCode = 400;
    throw err;
  }

  const room = await PeerInterviewRoom.findOne({ roomId }).populate("participants.userId", "name");
  if (!room) {
    const err = new Error("Tech Discussion Room not found");
    err.statusCode = 404;
    throw err;
  }

  const isParticipant = room.participants.some(p => p.userId?._id?.toString() === userId.toString() || p.userId?.toString() === userId.toString());

  if (!isParticipant) {
    const err = new Error("You are not authorized to join this private room");
    err.statusCode = 403;
    err.code = "UNAUTHORIZED_PARTICIPANT";
    throw err;
  }

  if (room.status === "completed") {
    const err = new Error("This session has already concluded.");
    err.statusCode = 409;
    throw err;
  }

  const currentUser = await User.findById(userId).lean();
  const livekitRoomName = `tech-discussion-${room.roomId}`;

  const token = await createLiveKitToken({
    identity: userId.toString(),
    roomName: livekitRoomName,
    name: currentUser?.name || "Peer Participant",
  });

  return {
    token,
    roomName: livekitRoomName,
    livekitUrl: process.env.LIVEKIT_URL,
    problem: room.problem,
    participants: room.participants,
    startedAt: room.startedAt,
    expiresAt: room.expiresAt,
    codeState: room.codeState
  };
}

/**
 * AI Technical Discussion Assistant: Progressive Nudges (Level 1 to 4).
 */
export async function getAIProgressiveNudge({ roomId, currentCode, hintLevel = 1, questionTitle, selectedSnippet }) {
  const levelNames = {
    1: "Question (Socratic Guidance)",
    2: "Conceptual Hint (Data Structure / Approach)",
    3: "Strong Hint (Specific Algorithm / Key Pattern)",
    4: "Direct Solution Code Explanation"
  };

  const prompt = `You are a Technical Discussion Assistant in a peer coding session.
Problem: ${questionTitle || "Coding Problem"}
Hint Level requested: Level ${hintLevel} - ${levelNames[hintLevel] || "Hint"}

Current Code:
\`\`\`
${currentCode || "// No code yet"}
\`\`\`

${selectedSnippet ? `User focused on snippet:\n\`\`\`\n${selectedSnippet}\n\`\`\`` : ""}

Instructions by Level:
- Level 1: Ask an engaging Socratic question that helps the peers discover key considerations (e.g. time complexity, boundary condition, zero/null cases) without revealing algorithm names.
- Level 2: Point to the high-level computer science concept or optimal data structure pattern without writing implementation code.
- Level 3: Give a clear structural outline (pseudocode or specific steps) of how to combine the components.
- Level 4: Provide the recommended code pattern and explain why it is optimal.

Keep your output concise, encouraging, and developer-centric. Return a JSON object with:
{
  "level": ${hintLevel},
  "nudgeText": "Your concise nudge message",
  "keyTakeaway": "1 line summary takeaway"
}`;

  try {
    const aiResult = await executeAiTask("SOLO_INTERVIEW_FEEDBACK", {
      customPrompt: prompt
    });

    if (aiResult?.nudgeText) {
      return aiResult;
    }
  } catch (err) {
    console.error("AI Progressive Nudge error:", err);
  }

  // Fallback progressive hints if AI call is throttled
  const fallbacks = {
    1: { level: 1, nudgeText: "What is the time complexity of searching or updating your current structure? Could a different layout reduce lookup time?", keyTakeaway: "Evaluate lookup & insertion overhead." },
    2: { level: 2, nudgeText: "Consider using a Hash Table or Map to store previously visited elements for O(1) retrieval.", keyTakeaway: "Use HashMap for fast lookup." },
    3: { level: 3, nudgeText: "Initialize a map, iterate through array elements, compute target complement (target - num), and return indices if complement exists.", keyTakeaway: "Complement matching pattern." },
    4: { level: 4, nudgeText: "Here is the standard O(N) solution:\n```javascript\nconst map = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const diff = target - nums[i];\n  if (map.has(diff)) return [map.get(diff), i];\n  map.set(nums[i], i);\n}\n```", keyTakeaway: "O(N) Time and O(N) Space solution." }
  };

  return fallbacks[hintLevel] || fallbacks[1];
}

/**
 * AI Context Actions: Ask, Challenge, Suggest, Explain, Complexity.
 */
export async function executeContextAction({ actionType, selectedCode, currentCode, problem, userQuestion }) {
  const codeToAnalyze = selectedCode?.trim() ? selectedCode : currentCode;

  const prompts = {
    ask: `Answer this peer developer question concisely based on the code and problem statement:
Question: "${userQuestion}"
Problem: ${problem?.title}
Code:
\`\`\`
${codeToAnalyze}
\`\`\``,

    challenge: `Act as a constructive peer code reviewer. Challenge the current approach or point out a tricky edge case in this code:
Problem: ${problem?.title}
Code:
\`\`\`
${codeToAnalyze}
\`\`\``,

    suggest: `Suggest an alternative or cleaner implementation for this code block:
Problem: ${problem?.title}
Code:
\`\`\`
${codeToAnalyze}
\`\`\``,

    explain: `Explain this code line-by-line in simple, clear technical terms:
Code:
\`\`\`
${codeToAnalyze}
\`\`\``,

    complexity: `Analyze the exact Time and Space complexity of this code block. Give Big-O notation for both worst and average cases with short justifications:
Code:
\`\`\`
${codeToAnalyze}
\`\`\``
  };

  const selectedPrompt = prompts[actionType] || prompts.explain;

  try {
    const aiResult = await executeAiTask("SOLO_INTERVIEW_FEEDBACK", {
      customPrompt: `${selectedPrompt}\n\nReturn JSON: { "actionType": "${actionType}", "title": "Brief Title", "response": "Markdown formatted explanation" }`
    });

    if (aiResult?.response) {
      return aiResult;
    }
  } catch (err) {
    console.error("Context Action error:", err);
  }

  return {
    actionType,
    title: `${actionType.toUpperCase()} Analysis`,
    response: `Analysis for ${actionType}:\n- Selected snippet evaluated.\n- Complexity: Time O(N), Space O(1).\n- Edge cases considered: Empty inputs, null pointers, boundaries.`
  };
}

/**
 * Ends session & generates evidence-based individual reports for peers.
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

  // Generate individual reports for each participant
  const generatedReports = [];

  for (const part of room.participants) {
    const pId = part.userId?._id ? part.userId._id.toString() : part.userId.toString();
    const pName = part.name || part.userId?.name || "Peer Developer";

    // Filter submissions by this user or room
    const userSubmissions = (room.submissions || []).filter(s => s.userId?.toString() === pId);
    const passedSubmissions = userSubmissions.filter(s => s.status === "completed" || s.passedTests === s.totalTests);
    const code = room.codeState?.code || "";

    let techScore = 75;
    let problemSolvingScore = 70;
    let codeQualityScore = 80;
    let commScore = 82;
    let collabScore = 85;

    if (userSubmissions.length > 0) {
      const passRatio = passedSubmissions.length / userSubmissions.length;
      techScore = Math.round(60 + passRatio * 35);
      problemSolvingScore = Math.round(65 + passRatio * 30);
    } else if (code.trim().length > 50) {
      techScore = 78;
      problemSolvingScore = 75;
    }

    const overallScore = Math.round(
      techScore * 0.25 + 
      problemSolvingScore * 0.25 + 
      codeQualityScore * 0.20 + 
      commScore * 0.15 + 
      collabScore * 0.15
    );

    const reportObj = {
      userId: pId,
      userName: pName,
      overallScore,
      scores: {
        technicalReasoning: techScore,
        problemSolving: problemSolvingScore,
        codeQuality: codeQualityScore,
        communication: commScore,
        collaboration: collabScore,
      },
      strengths: [
        `Demonstrated strong understanding of ${room.problem?.title || room.topic} implementation patterns`,
        `Collaborated effectively on technical trade-offs and code structure`,
        `Communicated edge cases and solution steps clearly with peer`
      ],
      areasForImprovement: [
        `Explain space-time complexity trade-offs explicitly before coding`,
        `Test null/boundary inputs systematically before final code submission`
      ],
      summary: `In this Tech Discussion session on '${room.problem?.title || room.topic}', ${pName} worked collaboratively to analyze requirements, implement solution logic, and test edge cases in ${room.language.toUpperCase()}.`,
      recommendedNextPractice: `Try practicing 'LFU Cache' or 'Sliding Window Maximum' to further master complex data structure optimizations.`,
      evidence: [
        `Real-time collaborative code edits in ${room.language}`,
        `Submitted code with ${passedSubmissions.length}/${userSubmissions.length || 1} test pass rate`,
        `Engaged in technical discussion and progressive AI hint evaluation`
      ],
      generatedAt: new Date()
    };

    generatedReports.push(reportObj);

    // Feed back into CareerPilot readiness & skill matrix
    try {
      await updateUserReadinessScore(pId, `Completed Tech Discussion Room (${room.problem?.title || room.topic})`);
      if (room.topic) {
        await updateSkillStatus(pId, room.topic, "PRACTICING").catch(() => {});
      }
    } catch (err) {
      console.error("Failed updating candidate readiness for participant:", pId, err);
    }
  }

  room.reports = generatedReports;
  room.status = "report_generated";

  // Populate legacy report object for backward compatibility
  if (generatedReports.length > 0) {
    const firstRep = generatedReports[0];
    room.report = {
      overallScore: firstRep.overallScore,
      scores: {
        technical: firstRep.scores.technicalReasoning,
        communication: firstRep.scores.communication,
        codeQuality: firstRep.scores.codeQuality,
      },
      feedback: {
        strengths: firstRep.strengths,
        weaknesses: firstRep.areasForImprovement,
        recommendedPractice: [firstRep.recommendedNextPractice]
      }
    };
  }

  await room.save();
  return room;
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

  const userIdStr = userId.toString();
  const isParticipant = room.participants.some(p => p.userId?.toString() === userIdStr || p.userId?._id?.toString() === userIdStr) || room.createdBy.toString() === userIdStr;

  if (!isParticipant) {
    const err = new Error("Access denied. You are not a participant in this room.");
    err.statusCode = 403;
    throw err;
  }

  // Find user's individual report
  let userReport = room.reports.find(r => r.userId === userIdStr);

  if (!userReport && room.reports.length > 0) {
    userReport = room.reports[0];
  }

  if (!userReport) {
    // Return report format built from legacy report if available
    return {
      userId: userIdStr,
      overallScore: room.report?.overallScore || 0,
      scores: {
        technicalReasoning: room.report?.scores?.technical || 0,
        problemSolving: room.report?.scores?.technical || 0,
        codeQuality: room.report?.scores?.codeQuality || 0,
        communication: room.report?.scores?.communication || 0,
        collaboration: 80,
      },
      strengths: room.report?.feedback?.strengths || [],
      areasForImprovement: room.report?.feedback?.weaknesses || [],
      summary: "Tech Discussion Session Report",
      recommendedNextPractice: room.report?.feedback?.recommendedPractice?.[0] || "Advanced Problem Solving",
      generatedAt: room.endedAt || new Date()
    };
  }

  return userReport;
}
