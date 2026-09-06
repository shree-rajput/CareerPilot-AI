import mongoose from "mongoose";

const mentorVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    identityStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected", "UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
      default: "unverified",
      set: v => v ? v.toLowerCase() : v
    },
    employmentStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected", "UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
      default: "unverified",
      set: v => v ? v.toLowerCase() : v
    },
    expertiseStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected", "UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
      default: "unverified",
      set: v => v ? v.toLowerCase() : v
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastVerifiedAt: { type: Date },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

export const MentorVerification = mongoose.model("MentorVerification", mentorVerificationSchema);
