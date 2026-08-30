import mongoose from "mongoose";

const starterCodeSchema = new mongoose.Schema(
  {
    javascript: { type: String, default: "" },
    typescript: { type: String, default: "" },
    python: { type: String, default: "" },
    java: { type: String, default: "" },
    cpp: { type: String, default: "" },
    c: { type: String, default: "" },
    csharp: { type: String, default: "" },
    go: { type: String, default: "" },
    rust: { type: String, default: "" },
    kotlin: { type: String, default: "" },
  },
  { _id: false },
);

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expectedOutput: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { _id: true },
);

const interviewChallengeSchema = new mongoose.Schema(
  {
    interviewSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    technology: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true
    },
    starterCode: {
      type: starterCodeSchema,
      default: () => ({})
    },
    testCases: {
      type: [testCaseSchema],
      default: []
    },
    requirements: {
      type: [String],
      default: []
    },
    constraints: {
      type: [String],
      default: []
    },
    evaluationCriteria: {
      type: [String],
      default: []
    },
    generatedBy: {
      type: String,
      enum: ["ai", "system"],
      default: "ai"
    },
    validationStatus: {
      type: String,
      enum: ["pending", "valid", "invalid"],
      default: "pending"
    },
    // Tracks whether the candidate has submitted a solution
    status: {
      type: String,
      enum: ["pending", "active", "answered"],
      default: "pending"
    },
    // AI code review result stored after submission
    aiReview: {
      metrics: {
        correctness: { type: Number, default: 0 },
        efficiency: { type: Number, default: 0 },
        codeQuality: { type: Number, default: 0 },
        edgeCases: { type: Number, default: 0 }
      },
      timeComplexity: { type: String, default: "" },
      spaceComplexity: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      potentialIssues: { type: [String], default: [] },
      optimizationOpportunities: { type: [String], default: [] },
      // Conversational follow-up comment from the AI
      followUpComment: { type: String, default: "" }
    },
    // Execution summary for the report
    executionSummary: {
      passedTests: { type: Number, default: 0 },
      totalTests: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const InterviewChallenge = mongoose.model("InterviewChallenge", interviewChallengeSchema);
