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
