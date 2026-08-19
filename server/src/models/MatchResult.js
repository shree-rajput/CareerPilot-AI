import mongoose from "mongoose";

const evidenceItemSchema = new mongoose.Schema(
  {
    requirement: { type: String, required: true }, // JD requirement
    resumeSection: { type: String, default: "" },  // Which resume section matched
    resumeEvidence: { type: String, default: "" }, // Exact resume text cited
    similarityScore: { type: Number, min: 0, max: 1, default: 0 },
    classification: {
      type: String,
      enum: ["strong", "partial", "missing"],
      required: true
    }
  },
  { _id: false }
);

const matchResultSchema = new mongoose.Schema(
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
      required: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true
    },
    // Cache keys — used to skip re-running the match if nothing changed
    resumeHash: { type: String, required: true },
    jdHash: { type: String, required: true },
    // Scores — calculated by the deterministic scoring engine, NOT by the LLM
    overallScore: { type: Number, min: 0, max: 100, required: true },
    categoryScores: {
      technicalSkills: { type: Number, default: 0 },
      projects: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      education: { type: Number, default: 0 },
      responsibilities: { type: Number, default: 0 },
      preferredSkills: { type: Number, default: 0 }
    },
    // Evidence
    matchedSkills: { type: [String], default: [] },
    partialSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    evidence: { type: [evidenceItemSchema], default: [] },
    // AI writes the explanation — it does NOT calculate the score
    explanation: { type: String, default: "" }
  },
  { timestamps: true }
);

matchResultSchema.index({ resumeHash: 1, jdHash: 1 });

export const MatchResult = mongoose.model("MatchResult", matchResultSchema);
