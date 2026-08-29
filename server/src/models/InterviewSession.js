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
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },
    weaknessesToTest: {
      type: [String],
      default: []
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
    mode: {
      type: String,
      enum: ["realistic", "coaching", "practice"],
      default: "realistic"
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
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
    // Compact context extracted from Resume, JD, and Role
    candidateContext: {
      summary: { type: String, default: "" },
      relevantSkills: { type: [String], default: [] },
      potentialGaps: { type: [String], default: [] }
    },
    // Pre-generated interview outline
    interviewPlan: [{
      section: String,
      skill: String,
      difficulty: String,
      objective: String,
      evaluationCriteria: [String]
    }],
    // Running state of the interview (evidence collection)
    intelligenceState: {
      knowns: { type: Map, of: String, default: {} }, // e.g., "Node.js": "Strong evidence"
      unknowns: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      strengths: { type: [String], default: [] }
    },
    // Final actionable coaching report
    finalReport: {
      overallAssessment: { type: String, default: "" },
      whatYouDidWell: { type: [String], default: [] },
      whatWentWrong: { type: [String], default: [] },
      whyItWentWrong: { type: String, default: "" },
      howToImprove: { type: [String], default: [] },
      practicePlan: [{
        day: Number,
        focus: String,
        action: String
      }]
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);
