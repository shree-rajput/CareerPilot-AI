import mongoose from "mongoose";

const moderationActionSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    actionType: {
      type: String,
      enum: [
        "approve_application",
        "reject_application",
        "request_more_info",
        "verify_identity",
        "verify_employment",
        "verify_expertise",
        "suspend_mentor",
        "reactivate_mentor",
        "dismiss_report",
        "resolve_report",
        "cancel_sessions"
      ],
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

moderationActionSchema.index({ targetUserId: 1, createdAt: -1 });

export const ModerationAction = mongoose.model("ModerationAction", moderationActionSchema);
