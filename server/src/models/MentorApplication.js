import mongoose from "mongoose";

const mentorApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "more_info_required"],
      default: "pending",
      index: true
    },
    professionalName: { type: String, required: true, trim: true },
    headline: { type: String, required: true, trim: true },
    currentRole: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    experienceYears: { type: Number, required: true, min: 0 },
    skills: { type: [String], default: [] },
    expertiseAreas: { type: [String], default: [] },
    mentoringTopics: { type: [String], default: [] },
    languages: { type: [String], default: ["English"] },
    bio: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    verificationNotes: { type: String, trim: true, default: "" },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String, default: "" },
    moreInfoReason: { type: String, default: "" }
  },
  { timestamps: true }
);

mentorApplicationSchema.index({ status: 1, submittedAt: -1 });

export const MentorApplication = mongoose.model("MentorApplication", mentorApplicationSchema);
