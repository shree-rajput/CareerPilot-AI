import mongoose from "mongoose";

const mentorReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipSession",
      default: null
    },
    category: {
      type: String,
      enum: [
        "misleading_info",
        "inappropriate_behavior",
        "harassment",
        "discrimination",
        "false_credentials",
        "solicitation",
        "off_platform_payment",
        "spam",
        "impersonation",
        "other"
      ],
      required: true
    },
    details: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    status: {
      type: String,
      enum: ["pending", "under_investigation", "resolved", "dismissed"],
      default: "pending",
      index: true
    },
    actionTaken: {
      type: String,
      default: ""
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    resolvedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

mentorReportSchema.index({ status: 1, createdAt: -1 });

export const MentorReport = mongoose.model("MentorReport", mentorReportSchema);
