import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "participant",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    topics: { type: [String], default: [] },
    supportedLanguages: { type: [String], default: ["javascript", "python", "java"] },
    defaultLanguage: { type: String, default: "javascript" },
    starterCode: { type: mongoose.Schema.Types.Mixed, default: {} },
    testCases: { type: [mongoose.Schema.Types.Mixed], default: [] },
    constraints: { type: [String], default: [] },
    hints: { type: [String], default: [] },
    expectedComplexity: { type: String, default: "" },
  },
  { _id: false }
);

const individualReportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    overallScore: { type: Number, default: 0 },
    scores: {
      technicalReasoning: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      codeQuality: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      collaboration: { type: Number, default: 0 },
    },
    strengths: { type: [String], default: [] },
    areasForImprovement: { type: [String], default: [] },
    summary: { type: String, default: "" },
    recommendedNextPractice: { type: String, default: "" },
    evidence: { type: [String], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const techDiscussionRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    participants: [participantSchema],

    status: {
      type: String,
      enum: ["created", "waiting", "ready", "active", "paused", "completed", "report_generated"],
      default: "waiting",
      index: true,
    },

    topic: {
      type: String,
      default: "DSA",
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior"],
      default: "fresher",
    },

    language: {
      type: String,
      default: "javascript",
    },

    durationMinutes: {
      type: Number,
      default: 45,
      min: 15,
      max: 120,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    problem: problemSchema,

    currentQuestionId: {
      type: String,
      default: "",
    },

    questionState: {
      type: String,
      enum: [
        "QUESTION_PRESENTED",
        "WAITING_FOR_ANSWER",
        "ANSWER_RECEIVED",
        "EVALUATING",
        "FEEDBACK",
        "FOLLOW_UP",
        "COMPLETED",
        "NEXT_QUESTION_AVAILABLE"
      ],
      default: "QUESTION_PRESENTED",
    },

    questionSequence: {
      type: Number,
      default: 1,
    },

    previousQuestionIds: {
      type: [String],
      default: [],
    },

    previousQuestionTitles: {
      type: [String],
      default: [],
    },

    nextQuestionAvailable: {
      type: Boolean,
      default: false,
    },

    aiRecommendationReason: {
      type: String,
      default: "",
    },

    codeState: {
      code: { type: String, default: "" },
      language: { type: String, default: "javascript" },
      updatedAt: { type: Date, default: Date.now },
    },

    submissions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        code: { type: String },
        language: { type: String },
        status: { type: String },
        passedTests: { type: Number, default: 0 },
        totalTests: { type: Number, default: 0 },
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    discussionMessages: [
      {
        senderId: { type: String },
        senderName: { type: String },
        text: { type: String },
        type: { type: String, default: "text" }, // "text", "action", "ai_nudge"
        actionType: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    reports: [individualReportSchema],

    // Legacy fields for backward compatibility
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    intervieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetRole: { type: String, default: "" },
    technologyStack: { type: [String], default: [] },
    interviewType: { type: String, default: "mixed" },
    plan: [
      {
        questionText: { type: String, required: true },
        category: { type: String, default: "" },
        difficulty: { type: String, default: "medium" },
        expectedConcepts: { type: [String], default: [] },
      },
    ],
    report: {
      overallScore: { type: Number, default: 0 },
      scores: {
        technical: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        codeQuality: { type: Number, default: 0 },
      },
      feedback: {
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        recommendedPractice: { type: [String], default: [] },
      },
    },
  },
  {
    timestamps: true,
  }
);

const PeerInterviewRoom = mongoose.model(
  "PeerInterviewRoom",
  techDiscussionRoomSchema
);

export default PeerInterviewRoom;
