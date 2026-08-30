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
    interviewState: {
      type: String,
      enum: [
        "CREATED", "CONFIGURED", "INTRODUCTION", "THEORY", 
        "PROJECT_DISCUSSION", "CODING", "CODING_REVIEW", 
        "FOLLOW_UP", "BEHAVIORAL", "FINAL_EVALUATION", 
        "REPORT_GENERATION", "COMPLETED"
      ],
      default: "CREATED"
    },
    // Compact context extracted from Resume, JD, and Role
    candidateContext: {
      summary: { type: String, default: "" },
      relevantSkills: { type: [String], default: [] },
      potentialGaps: { type: [String], default: [] }
    },
    // Snapshot of candidate's resume projects for resume-driven questioning
    resumeSnapshot: {
      projects: [{
        name: { type: String },
        technologies: { type: [String], default: [] },
        description: { type: String, default: "" },
        architecture: { type: String, default: "" }
      }],
      education: {
        institution: { type: String, default: "" },
        degree: { type: String, default: "" },
        branch: { type: String, default: "" }
      }
    },
    // Unique seed per attempt — drives question diversity across retries
    interviewSeed: { type: String, default: "" },
    // Tracks which tech concepts have already been tested
    conceptsTested: [{
      concept: { type: String },
      technology: { type: String },
      questionType: { type: String },
      lastCorrectness: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
      count: { type: Number, default: 1 }
    }],
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
      knowns: { type: Map, of: String, default: {} },
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
