import mongoose from "mongoose";

const requiredSkillSchema = new mongoose.Schema({
  skillName: { type: String, required: true },
  importance: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" }
}, { _id: false });

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, trim: true, default: "" },
    employmentType: { type: String, trim: true, default: "" },
    experienceLevel: { type: String, trim: true, default: "" },
    source: { type: String, trim: true, default: "manual" },
    url: { type: String, trim: true, default: "" },
    
    // Extracted Intelligence
    requiredSkills: { type: [requiredSkillSchema], default: [] },
    preferredSkills: { type: [requiredSkillSchema], default: [] },
    softSkills: { type: [requiredSkillSchema], default: [] },
    
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

jobSchema.index({ company: 1, title: 1 });

export const Job = mongoose.model("Job", jobSchema);
