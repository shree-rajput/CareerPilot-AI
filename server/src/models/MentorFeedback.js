import mongoose from "mongoose";

const mentorFeedbackSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipSession",
      default: null
    },
    category: {
      type: String,
      enum: [
        "Resume",
        "DSA",
        "Technical Interview",
        "HR Interview",
        "Communication",
        "Projects",
        "Applications",
        "General"
      ],
      default: "General",
      index: true
    },
    problemSolved: {
      type: String,
      enum: ["yes", "partially", "no"],
      default: "yes"
    },
    wasRelevant: {
      type: Boolean,
      default: true
    },
    wouldBookAgain: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    }
  },
  {
    timestamps: true
  }
);

mentorFeedbackSchema.index({ mentorId: 1, studentId: 1 });
mentorFeedbackSchema.index({ studentId: 1, createdAt: -1 });

export const MentorFeedback = mongoose.model("MentorFeedback", mentorFeedbackSchema);
