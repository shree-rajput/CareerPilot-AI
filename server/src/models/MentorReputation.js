import mongoose from "mongoose";

const expertiseRatingSchema = new mongoose.Schema(
  {
    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    sessionCount: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const mentorReputationSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    overallRating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    totalSessions: { type: Number, default: 0, min: 0 },
    completedSessions: { type: Number, default: 0, min: 0 },
    repeatStudentsCount: { type: Number, default: 0, min: 0 },
    problemResolutionRate: { type: Number, default: 100, min: 0, max: 100 }, // percentage
    relevanceRate: { type: Number, default: 100, min: 0, max: 100 }, // percentage
    rebookingRate: { type: Number, default: 100, min: 0, max: 100 }, // percentage
    responseRatePercent: { type: Number, default: 100, min: 0, max: 100 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 }, // 100 minus no-shows/cancellations
    expertiseRatings: {
      type: Map,
      of: expertiseRatingSchema,
      default: {}
    },
    trustLevel: {
      type: String,
      enum: ["probation", "verified", "trusted", "restricted"],
      default: "probation",
      index: true
    },
    lastCalculatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const MentorReputation = mongoose.model("MentorReputation", mentorReputationSchema);
