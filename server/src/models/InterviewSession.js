import mongoose from "mongoose";

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null
    },
    targetRole: {
      type: String,
      required: true,
      trim: true
    },
    technologyStack: {
      type: [String],
      default: []
    },
    jobDescription: {
      type: String,
      default: ""
    },
    numberOfQuestions: {
      type: Number,
      default: 5
    },
    interviewType: {
      type: String,
      enum: ["technical", "hr", "project", "mixed"],
      default: "mixed"
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["setup", "in_progress", "completed", "aborted"],
      default: "setup"
    },
    overallScore: { type: Number, default: 0 },
    scores: {
      technical: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      structure: { type: Number, default: 0 },
      videoPresence: { type: Number, default: 0 }
    },
    feedback: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      improvements: { type: [String], default: [] }
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);
