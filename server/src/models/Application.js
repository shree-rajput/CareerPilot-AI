import mongoose from "mongoose";

export const STATUS_VALUES = [
  "discovered",
  "draft",
  "saved",
  "preparing",
  "ready_to_apply",
  "applied",
  "shortlisted",
  "screening",
  "oa",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "on_hold",
  "stale",
];

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, default: "" },
    toStatus: { type: String, required: true },
    changedBy: {
      type: String,
      enum: [
        "manual",
        "ai",
        "email",
        "calendar",
        "auto_stale",
        "system",
        "user_confirmation",
        "extension_capture",
        "user_manual_update",
        "trusted_external_signal",
      ],
      default: "manual",
    },
    source: { type: String, default: "user_manual_update" },
    confidence: { type: String, enum: ["high", "medium", "low"], default: "high" },
    evidence: { type: String, default: "" },
    note: { type: String, trim: true, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const pendingSuggestionSchema = new mongoose.Schema(
  {
    suggestedStatus: { type: String, required: true },
    reason: { type: String, required: true },
    source: {
      type: String,
      enum: ["auto_stale", "email", "calendar", "ai"],
      default: "auto_stale",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "dismissed"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },
    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },
    preparationStatus: {
      type: String,
      enum: ["pending", "in_progress", "ready"],
      default: "pending",
    },
    skillGaps: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    position: {
      type: String,
      trim: true,
      default: "",
    },
    jobDescription: {
      type: String,
      default: "",
    },
    extractedJd: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "saved",
    },
    source: {
      type: String,
      default: "user_manual",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    pendingStatusSuggestions: {
      type: [pendingSuggestionSchema],
      default: [],
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    dateApplied: {
      type: Date,
      default: null,
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    resumeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    matchResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchResult",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    jobUrl: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, status: 1 });

export const Application = mongoose.model("Application", applicationSchema);
