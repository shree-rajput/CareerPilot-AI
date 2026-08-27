import mongoose from "mongoose";

const userSkillSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
    canonicalName: { type: String, required: true }, // Denormalized for fast queries
    proficiency: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    sources: { type: [String], default: [] }, // e.g. ["resume", "interview", "coding"]
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

userSkillSchema.index({ userId: 1, canonicalName: 1 }, { unique: true });

export const UserSkill = mongoose.model("UserSkill", userSkillSchema);
