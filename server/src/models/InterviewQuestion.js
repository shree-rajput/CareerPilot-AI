import mongoose from "mongoose";

const interviewQuestionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
      index: true
    },
    questionText: {
      type: String,
      required: true
    },
    // Normalized SHA-256 fingerprint for exact duplicate detection
    fingerprint: { type: String, default: "", index: true },
    // Structured metadata for concept tracking and diversity
    questionType: {
      type: String,
      enum: ["THEORETICAL", "PRACTICAL", "SCENARIO", "PROJECT", "DEBUGGING", "BEHAVIORAL", "FOLLOW_UP", "TRADEOFF", "DESIGN", "INTRODUCTION"],
      default: "THEORETICAL"
    },
    technology: { type: String, default: "" },  // e.g. "React", "Node.js"
    concept: { type: String, default: "" },       // e.g. "reconciliation", "closures"
    category: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      required: true
    },
    expectedConcepts: {
      type: [String],
      default: []
    },
    followUpStrategy: {
      type: String,
      default: ""
    },
    generationSource: {
      type: String,
      enum: ["ai", "deterministic_fallback"],
      default: "ai"
    },
    fallbackReason: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "asked", "answered", "skipped"],
      default: "pending"
    },
    userAnswerAudioUrl: { type: String, default: null },
    transcript: { type: String, default: null },
    
    // The adaptive reason this question was chosen
    actionContext: {
      action: { type: String, default: "MOVE_FORWARD" }, // FOLLOW_UP, INCREASE_DIFFICULTY, etc.
      reason: { type: String, default: "" }
    },
    
    // Structured evidence-based evaluation
    evaluation: {
      relevance: { type: String, default: "Medium" },
      correctness: { type: String, default: "Medium" },
      depth: { type: String, default: "Medium" },
      specificity: { type: String, default: "Medium" },
      structure: { type: String, default: "Medium" },
      evidenceCollected: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      missingConcepts: { type: [String], default: [] }
    },
    
    confidence: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM" // Confidence in the assessment, not the candidate
    },

    communicationMetrics: {
      speakingPace: { type: Number, default: 0 }, // wpm
      fillerWords: { type: Number, default: 0 },
      longPauses: { type: Number, default: 0 }
    },
    
    // For coaching/practice mode
    idealAnswer: {
      text: { type: String, default: "" },
      explanation: { type: String, default: "" }
    },
    analysisSource: {
      type: String,
      enum: ["ai", "deterministic_fallback"],
      default: "ai"
    },
    analysisFallbackReason: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export const InterviewQuestion = mongoose.model("InterviewQuestion", interviewQuestionSchema);
