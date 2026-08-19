import mongoose from "mongoose";

const STATUS_VALUES = ["saved", "applied", "oa", "interview", "offer", "rejected", "withdrawn"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUS_VALUES, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    jobDescription: {
      type: String,
      required: true
    },
    extractedJd: {
      // Validated AI extraction result (jdStructureSchema)
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "saved"
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    dateApplied: {
      type: Date,
      default: null
    },
    interviewDate: {
      type: Date,
      default: null
    },
    resumeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null
    },
    matchResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchResult",
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    jobUrl: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, status: 1 });

export const Application = mongoose.model("Application", applicationSchema);
