import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "ACTION_REQUIRED",
        "OPPORTUNITY",
        "INTERVIEW",
        "LEARNING",
        "PROGRESS",
        // Legacy fallbacks kept to avoid breaking existing data immediately
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
        "deadline",
        "reminder",
        "action_required",
        "insight"
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM"
    },
    title: { type: String, trim: true, default: "" },
    message: { type: String, required: true, trim: true },
    source: {
      entityType: { type: String, trim: true, default: "system" },
      entityId: { type: String, trim: true, default: "" },
      eventType: { type: String, trim: true, default: "" }
    },
    action: {
      route: { type: String, default: "" },
      label: { type: String, default: "" }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Legacy fields maintained temporarily
    entityType: { type: String, trim: true, default: "system" },
    entityId: { type: String, trim: true, default: "" },
    actionUrl: { type: String, default: "" },
    
    dueDate: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },
    emailFailedAt: { type: Date, default: null },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    dedupeKey: { type: String, unique: true, sparse: true, index: true }, // Alias for newer code
    expiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
