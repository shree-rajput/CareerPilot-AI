import mongoose from "mongoose";

const preparationTimerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    skillName: { type: String, required: true },
    taskTitle: { type: String, required: true },
    status: { type: String, enum: ["active", "paused", "completed", "cancelled"], default: "paused" },
    durationSeconds: { type: Number, default: 1500 },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    accumulatedPausedSeconds: { type: Number, default: 0 },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const PreparationTimer = mongoose.model("PreparationTimer", preparationTimerSchema);
