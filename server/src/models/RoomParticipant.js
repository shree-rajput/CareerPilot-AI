import mongoose from "mongoose";

const roomParticipantSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PeerInterviewRoom",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["interviewer", "interviewee"],
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

roomParticipantSchema.index({ roomId: 1, userId: 1 }, { unique: true });

roomParticipantSchema.index({ roomId: 1, role: 1 }, { unique: true });

const RoomParticipant = mongoose.model(
  "RoomParticipant",
  roomParticipantSchema,
);

export default RoomParticipant;
