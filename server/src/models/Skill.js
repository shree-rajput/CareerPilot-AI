import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    canonicalName: { type: String, required: true, unique: true, trim: true },
    aliases: { type: [String], default: [] },
    category: { 
      type: String, 
      enum: ["Programming", "Frontend", "Backend", "Database", "Cloud", "DevOps", "DSA", "System Design", "Testing", "Communication", "Behavioral", "Other"],
      default: "Other"
    }
  },
  { timestamps: true }
);

skillSchema.index({ aliases: 1 });

export const Skill = mongoose.model("Skill", skillSchema);
