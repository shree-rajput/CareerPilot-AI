import mongoose from "mongoose";

const reminderRecordSchema = new mongoose.Schema(
  {
    reminderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: [
        "FOLLOW_UP",
        "SECOND_FOLLOW_UP",
        "OA_DEADLINE",
        "INTERVIEW_PREP",
        "INTERVIEW_DAY",
        "OFFER_ACTION",
      ],
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "scheduled",
        "delivered",
        "seen",
        "dismissed",
        "snoozed",
        "completed",
        "cancelled",
      ],
      default: "scheduled",
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    snoozedUntil: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: "",
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    reason: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

reminderRecordSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
reminderRecordSchema.index({ applicationId: 1, reminderType: 1 });

export const ReminderRecord = mongoose.model("ReminderRecord", reminderRecordSchema);
