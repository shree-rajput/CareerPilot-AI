import mongoose from "mongoose";

const requiredSkillSchema = new mongoose.Schema({
  skillName: { type: String, required: true },
  importance: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" }
}, { _id: false });

const castSkillList = (val) => {
  if (!Array.isArray(val)) return [];
  return val.map(item => {
    if (typeof item === "string") {
      return { skillName: item.trim(), importance: "MEDIUM" };
    }
    if (item && typeof item === "object") {
      const name = item.skillName || item.name || item.canonicalName || "";
      if (!name) return null;
      return {
        skillName: String(name).trim(),
        importance: item.importance || "MEDIUM"
      };
    }
    return null;
  }).filter(Boolean);
};

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

    // Salary information
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, trim: true, default: "INR" },
    salaryDisplay: { type: String, trim: true, default: "" }, // e.g. "₹18L–₹32L"

    // Work arrangement
    remoteStatus: {
      type: String,
      enum: ["remote", "hybrid", "onsite", ""],
      default: ""
    },

    // Sponsorship & special flags
    sponsorshipAvailable: { type: Boolean, default: null }, // null = unknown
    isInternship: { type: Boolean, default: false },
    isNewGrad: { type: Boolean, default: false },

    // When the job was posted externally
    postedDate: { type: Date, default: null },

    // Users who saved/bookmarked this job (without applying)
    savedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    
    // Extracted Intelligence
    requiredSkills: { 
      type: [requiredSkillSchema], 
      default: [],
      set: castSkillList 
    },
    preferredSkills: { 
      type: [requiredSkillSchema], 
      default: [],
      set: castSkillList 
    },
    softSkills: { 
      type: [requiredSkillSchema], 
      default: [],
      set: castSkillList 
    },
    
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

jobSchema.index({ company: 1, title: 1 });
jobSchema.index({ savedBy: 1 });
jobSchema.index({ createdAt: -1 });

export const Job = mongoose.model("Job", jobSchema);
