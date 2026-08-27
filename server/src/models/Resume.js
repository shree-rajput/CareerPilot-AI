import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      trim: true,
      default: "",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: "My Resume",
    },
    label: {
      // e.g. "Google Resume", "Startup Resume"
      type: String,
      trim: true,
      default: "",
    },
    originalFilename: {
      type: String,
      trim: true,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt"],
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      default: "",
    },
    cloudinaryPublicId: {
      type: String,
      default: "",
    },
    rawText: {
      type: String,
      required: true,
    },
    structuredData: {
      // Validated JSON from AI — stored as Mixed to allow flexible schema
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentVersionId: {
      // For version history chain
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    atsScore: {
      type: Number,
      default: null,
    },
    matchScore: {
      type: Number,
      default: null,
    },
    keywordCoverage: {
      type: Number,
      default: null,
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    healthIndicators: {
      ats: { type: Number, default: null },
      match: { type: Number, default: null },
      content: { type: Number, default: null },
      clarity: { type: Number, default: null },
      completeness: { type: Number, default: null },
    },
    aiSuggestions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound index for version queries per user
resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model("Resume", resumeSchema);
