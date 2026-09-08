import mongoose from "mongoose";

const rubricScoresSchema = new mongoose.Schema(
  {
    correctness: { type: Number, min: 0, max: 100, default: 0 },
    clarity: { type: Number, min: 0, max: 100, default: 0 },
    relevance: { type: Number, min: 0, max: 100, default: 0 },
    communication: { type: Number, min: 0, max: 100, default: 0 },
    teachingAbility: { type: Number, min: 0, max: 100, default: 0 },
    practicalUsefulness: { type: Number, min: 0, max: 100, default: 0 }
  },
  { _id: false }
);

const mentorAssessmentSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    track: {
      type: String,
      enum: ["technical", "career", "interview"],
      required: true,
      index: true
    },
    challengeId: { type: String, required: true },
    challengeTitle: { type: String, required: true },
    scenarioPrompt: { type: String, required: true },
    submissionContent: { type: String, required: true, trim: true },
    rubricScores: { type: rubricScoresSchema, default: () => ({}) },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["pending", "in_review", "passed", "failed"],
      default: "pending",
      index: true
    },
    evaluatorNotes: { type: String, default: "" },
    aiAdvisoryReport: {
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
      recommendation: { type: String, default: "REVIEW_REQUIRED" }
    },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

mentorAssessmentSchema.index({ mentorId: 1, track: 1 });

export const MentorAssessment = mongoose.model("MentorAssessment", mentorAssessmentSchema);
