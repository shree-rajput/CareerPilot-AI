import mongoose from "mongoose";

const preparationTimerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    skillName: { type: String, required: true },
    taskTitle: { type: String, required: true },
    targetMinutes: { type: Number, default: 25 },
    elapsedSeconds: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false },
    isRunning: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const PreparationTimer = mongoose.model("PreparationTimer", preparationTimerSchema);
