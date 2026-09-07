import mongoose from "mongoose";

const mentorStudentAssignmentSchema = new mongoose.Schema(
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
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["active", "inactive", "paused"],
      default: "active",
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Ensure a mentor isn't assigned the same student multiple times concurrently
mentorStudentAssignmentSchema.index({ mentorId: 1, studentId: 1 }, { unique: true });

export const MentorStudentAssignment = mongoose.model("MentorStudentAssignment", mentorStudentAssignmentSchema);
