import mongoose from "mongoose";

const mentorAppealSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    restrictionReason: { type: String, required: true, trim: true },
    policyInvolved: { type: String, default: "General Mentor Guidelines" },
    appealStatement: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    supportingLinks: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
      index: true
    },
    adminNotes: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

mentorAppealSchema.index({ status: 1, createdAt: -1 });

export const MentorAppeal = mongoose.model("MentorAppeal", mentorAppealSchema);
