import mongoose from "mongoose";

const cronLockSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, unique: true, index: true },
    lockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    nodeId: { type: String, default: "default-node" }
  },
  { timestamps: true }
);

export const CronLock = mongoose.model("CronLock", cronLockSchema);
