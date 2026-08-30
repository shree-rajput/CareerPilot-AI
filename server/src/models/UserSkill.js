import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true }, // e.g. "Listed in Skills section" or "Used in Project CareerPilot"
    source: { type: String, enum: ["resume", "project", "interview", "coding", "manual", "application"], default: "manual" },
    date: { type: Date, default: Date.now },
    weight: { type: Number, default: 1 } // To calculate overall confidence
  },
  { _id: false }
);

const userSkillSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
    canonicalName: { type: String, required: true }, // Denormalized for fast queries
    category: { type: String, default: "other" },
    proficiency: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    evidence: { type: [evidenceSchema], default: [] },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

userSkillSchema.index({ userId: 1, canonicalName: 1 }, { unique: true });

export const UserSkill = mongoose.model("UserSkill", userSkillSchema);
