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
    analysis: {
      technicalAccuracy: { type: Number, default: 0 },
      relevance: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      structure: { type: Number, default: 0 },
      communication: { type: Number, default: 0 }
    },
    communicationMetrics: {
      speakingPace: { type: Number, default: 0 }, // wpm
      fillerWords: { type: Number, default: 0 },
      longPauses: { type: Number, default: 0 }
    },
    feedback: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] }
    },
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
