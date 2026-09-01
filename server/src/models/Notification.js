import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "INTERVIEW_REMINDER",
        "APPLICATION_FOLLOWUP",
        "PREPARATION_REMINDER",
        "MENTOR_REQUEST",
        "MENTOR_ACCEPTED",
        "MENTOR_REJECTED",
        "MENTOR_MESSAGE",
        "MENTOR_SESSION_REMINDER",
        "SKILL_GAP",
        "APPLICATION_STATUS",
        "SYSTEM",
        // Legacy fallbacks
        "deadline",
        "reminder",
        "action_required",
        "insight"
      ],
      required: true
    },
    title: { type: String, trim: true, default: "" },
    message: { type: String, required: true, trim: true },
    entityType: { type: String, trim: true, default: "system" },
    entityId: { type: String, trim: true, default: "" },
    actionUrl: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
