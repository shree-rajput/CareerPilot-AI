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

const actionPlanTaskSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    taskType: { type: String, enum: ["learn", "practice", "implement", "questions", "assessment"], default: "learn" },
    completed: { type: Boolean, default: false }
  },
  { _id: true }
);

const requiredJobSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    role: { type: String, default: "" },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application" }
  },
  { _id: false }
);

const userSkillSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
    canonicalName: { type: String, required: true }, // Denormalized for fast queries
    category: { type: String, default: "other" },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "PRACTICING", "READY_FOR_ASSESSMENT", "VERIFIED", "RESOLVED"],
      default: "NOT_STARTED"
    },
    currentLevel: {
      type: String,
      enum: ["Unknown", "Beginner", "Intermediate", "Advanced"],
      default: "Unknown"
    },
    targetLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Intermediate"
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium"
    },
    proficiency: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    estimatedEffortHours: { type: Number, default: 4 },
    requiredByJobs: { type: [requiredJobSchema], default: [] },
    actionPlan: { type: [actionPlanTaskSchema], default: [] },
    verificationScore: { type: Number, default: null },
    verifiedAt: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
    evidence: { type: [evidenceSchema], default: [] },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);


userSkillSchema.index({ userId: 1, canonicalName: 1 }, { unique: true });

export const UserSkill = mongoose.model("UserSkill", userSkillSchema);
