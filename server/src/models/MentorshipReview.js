import mongoose from "mongoose";

const mentorshipReviewSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipSession",
      required: true,
      unique: true,
      index: true
    },
    studentId: {
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    reviewText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    }
  },
  { timestamps: true }
);

mentorshipReviewSchema.index({ mentorId: 1, createdAt: -1 });

export const MentorshipReview = mongoose.model("MentorshipReview", mentorshipReviewSchema);
