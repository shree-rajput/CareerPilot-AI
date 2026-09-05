import mongoose from "mongoose";
import { STATUS_VALUES } from "./Application.js";

export const EVENT_TYPES = [
  "NOT_APPLICATION_RELEVANT",
  "APPLICATION_APPLIED",
  "OA_INVITATION",
  "INTERVIEW_INVITATION",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "APPLICATION_ADVANCED",
  "OFFER_RECEIVED",
  "APPLICATION_REJECTED",
  "WITHDRAWN",
];

const emailEventRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    threadId: {
      type: String,
      trim: true,
      default: "",
    },
    eventType: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    detectedStatus: {
      type: String,
      enum: STATUS_VALUES,
      default: "saved",
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },
    confidenceScore: {
      type: Number,
      default: 0,
    },
    matchedApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
      index: true,
    },
    sender: {
      type: String,
      trim: true,
      default: "",
    },
    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    senderDomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    evidence: {
      type: String,
      trim: true,
      default: "",
    },
    matchSignals: {
      type: [String],
      default: [],
    },
    actionTaken: {
      type: String,
      enum: [
        "AUTOMATIC_UPDATE",
        "SUGGESTION_CREATED",
        "IGNORED_LOW_CONFIDENCE",
        "IGNORED_FORBIDDEN_TRANSITION",
        "ALREADY_PROCESSED",
        "IGNORED_NOT_RELEVANT",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

emailEventRecordSchema.index({ userId: 1, messageId: 1 }, { unique: true });

export const EmailEventRecord = mongoose.model("EmailEventRecord", emailEventRecordSchema);
