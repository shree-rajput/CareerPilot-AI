import mongoose from "mongoose";

const mentorshipMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipSession",
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

mentorshipMessageSchema.index({ sessionId: 1, sentAt: 1 });

export const MentorshipMessage = mongoose.model("MentorshipMessage", mentorshipMessageSchema);
