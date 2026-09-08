import mongoose from "mongoose";

const applicationEventSchema = new mongoose.Schema(
  {
    eventId: {
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
    type: {
      type: String,
      enum: [
        "JOB_DISCOVERED",
        "JOB_SAVED",
        "APPLY_STARTED",
        "APPLICATION_SUBMITTED",
        "APPLICATION_RECEIVED",
        "SCREENING_INVITED",
        "OA_INVITED",
        "INTERVIEW_INVITED",
        "INTERVIEW_SCHEDULED",
        "OFFER_RECEIVED",
        "APPLICATION_REJECTED",
        "REJECTED",
        "APPLICATION_WITHDRAWN",
        "WITHDRAWN",
        "USER_CONFIRMED_APPLICATION",
        "FOLLOW_UP_SENT",
        "STATUS_UPDATED",
      ],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: [
        "job_portal",
        "company_site",
        "ats",
        "college_portal",
        "gmail",
        "manual",
        "system",
        "extension_auto_overlay",
        "extension_manual_action",
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    evidence: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

applicationEventSchema.index({ userId: 1, applicationId: 1, timestamp: -1 });

export const ApplicationEvent = mongoose.model("ApplicationEvent", applicationEventSchema);
