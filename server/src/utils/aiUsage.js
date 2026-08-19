import mongoose from "mongoose";

/**
 * Tracks per-user daily AI usage in MongoDB.
 * Key: userId + date (YYYY-MM-DD) + feature
 */
const aiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true }, // "2024-08-19"
    feature: { type: String, required: true }, // "resume_analysis" | "jd_analysis" | "tailoring" | "match_explanation"
    requestCount: { type: Number, default: 0 }
  },
  { timestamps: false }
);

aiUsageSchema.index({ userId: 1, date: 1, feature: 1 }, { unique: true });

const AIUsage = mongoose.model("AIUsage", aiUsageSchema);

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if a user is within the daily limit for a feature.
 * @param {string} userId
 * @param {string} feature - e.g. "resume_analysis"
 * @param {number} limit - max allowed per day
 * @returns {{ allowed: boolean, used: number, limit: number }}
 */
export async function checkAiLimit(userId, feature, limit) {
  if (limit <= 0) return { allowed: true, used: 0, limit: 0 };

  const date = todayString();
  const record = await AIUsage.findOne({ userId, date, feature });
  const used = record?.requestCount || 0;

  return { allowed: used < limit, used, limit };
}

/**
 * Increment usage counter. Call AFTER a successful AI request.
 */
export async function incrementAiUsage(userId, feature) {
  const date = todayString();
  await AIUsage.findOneAndUpdate(
    { userId, date, feature },
    { $inc: { requestCount: 1 } },
    { upsert: true, new: true }
  );
}
