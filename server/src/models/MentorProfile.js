import mongoose from "mongoose";

const mentorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    professionalName: { type: String, required: true, trim: true, maxlength: 100 },
    headline: { type: String, required: true, trim: true, maxlength: 150 },
    currentRole: { type: String, required: true, trim: true, maxlength: 100 },
    company: { type: String, required: true, trim: true, maxlength: 100 },
    experienceYears: { type: Number, required: true, min: 0, max: 60 },
    skills: { type: [String], default: [], index: true },
    expertiseAreas: { type: [String], default: [], index: true },
    mentoringTopics: { type: [String], default: [], index: true },
    languages: { type: [String], default: ["English"] },
    bio: { type: String, trim: true, default: "", maxlength: 2000 },
    portfolioUrl: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    preferredStudentLevels: { type: [String], default: ["Beginner", "Intermediate"] },
    education: { type: String, trim: true, default: "" },
    certifications: { type: [String], default: [] },
    previousExperience: { type: String, trim: true, default: "" },
    profileCompletion: { type: Number, default: 80, min: 0, max: 100 },
    reputationStatus: {
      type: String,
      enum: ["probation", "verified", "trusted", "restricted"],
      default: "probation"
    },
    maxWeeklySessions: { type: Number, default: 5, min: 1, max: 50 },
    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    completedSessionsCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDemo: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

mentorProfileSchema.index({ isActive: 1, isDemo: 1, rating: -1 });

export const MentorProfile = mongoose.model("MentorProfile", mentorProfileSchema);
