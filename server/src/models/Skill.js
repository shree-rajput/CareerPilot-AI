import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    canonicalName: { type: String, required: true, unique: true, trim: true },
    aliases: { type: [String], default: [] },
    category: { 
      type: String, 
      enum: ["programming_language", "framework", "library", "database", "cloud", "devops", "tool", "concept", "ai_ml", "communication", "behavioral", "other"],
      default: "other"
    },
    technologyType: { type: String, trim: true, default: "" }, // e.g. "frontend", "backend", "fullstack"
    parentSkill: { type: String, trim: true, default: "" }, // e.g. parent of React might be JavaScript
    relatedSkills: { type: [String], default: [] }
  },
  { timestamps: true }
);

skillSchema.index({ aliases: 1 });

export const Skill = mongoose.model("Skill", skillSchema);
