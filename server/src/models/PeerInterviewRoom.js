import mongoose from "mongoose";

const peerInterviewRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["waiting", "active", "completed"],
      default: "waiting",
      index: true,
    },

    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    intervieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewQuestion",
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetRole: {
      type: String,
      default: "",
    },
    technologyStack: {
      type: [String],
      default: [],
    },
    interviewType: {
      type: String,
      enum: ["technical", "hr", "project", "mixed"],
      default: "mixed",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    
    plan: [
      {
        questionText: { type: String, required: true },
        category: { type: String, default: "" },
        difficulty: { type: String, default: "medium" },
        expectedConcepts: { type: [String], default: [] }
      }
    ],

    report: {
      overallScore: { type: Number, default: 0 },
      scores: {
        technical: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        codeQuality: { type: Number, default: 0 },
      },
      feedback: {
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        recommendedPractice: { type: [String], default: [] }
      }
    }
  },
  {
    timestamps: true,
  },
);

const PeerInterviewRoom = mongoose.model(
  "PeerInterviewRoom",
  peerInterviewRoomSchema,
);

export default PeerInterviewRoom;
