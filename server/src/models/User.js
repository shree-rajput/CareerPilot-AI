import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true, default: "" },
    degree: { type: String, trim: true, default: "" },
    branch: { type: String, trim: true, default: "" },
    graduationYear: { type: Number, min: 1950, max: 2100 }
  },
  { _id: false }
);

const interviewPreferencesSchema = new mongoose.Schema(
  {
    defaultDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    defaultInterviewType: {
      type: String,
      enum: ["technical", "hr", "project", "mixed"],
      default: "mixed"
    }
  },
  { _id: false }
);

const targetRoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    techStack: { type: [String], default: [] },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true, default: "" },
    education: { type: educationSchema, default: () => ({}) },
    
    // Career Profile & Placement Command Center Fields
    targetRoles: { type: [targetRoleSchema], default: [] },
    targetCompanies: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    remotePreference: { 
      type: String, 
      enum: ["remote", "hybrid", "onsite", "any"], 
      default: "any" 
    },
    salaryExpectation: { type: String, trim: true, default: "" },
    placementDeadline: { type: Date },
    
    experienceLevel: {
      type: String,
      enum: ["student", "fresher", "intern", "junior"],
      default: "student"
    },
    technicalSkills: { type: [String], default: [] },
    primaryTechStack: { type: [String], default: [] }, // Kept for backwards compatibility/global reference
    
    interviewPreferences: {
      type: interviewPreferencesSchema,
      default: () => ({})
    },

    // Final Phase Extended Fields: Readiness, Onboarding, and Mentorship
    readinessScore: { type: Number, default: -1 },
    readinessBreakdown: {
      resume: { type: Number, default: -1 },
      technical: { type: Number, default: -1 },
      interview: { type: Number, default: -1 },
      projects: { type: Number, default: -1 },
      applications: { type: Number, default: -1 },
      preparation: { type: Number, default: -1 },
      profile: { type: Number, default: 0 },
      communication: { type: Number, default: -1 },
      careerStrategy: { type: Number, default: -1 }
    },
    readinessHistory: {
      type: [{
        score: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        changeReason: { type: String, default: "" }
      }],
      default: []
    },
    dismissedActions: { type: [String], default: [] },
    snoozedActions: {
      type: [{
        actionId: { type: String, required: true },
        snoozeUntil: { type: Date, required: true }
      }],
      default: []
    },
    completedActions: { type: [String], default: [] },
    mentorStatus: {
      type: String,
      enum: ["none", "pending", "approved", "suspended"],
      default: "none"
    },
    mentorProfile: {
      role: { type: String, trim: true, default: "" },
      company: { type: String, trim: true, default: "" },
      experienceYears: { type: Number, default: 0 },
      skills: { type: [String], default: [] },
      specialties: { type: [String], default: [] },
      availability: { type: [String], default: [] },
      bio: { type: String, trim: true, default: "" },
      rating: { type: Number, default: 4.8 },
      reviewsCount: { type: Number, default: 0 },
      topics: { type: [String], default: [] }
    }
  },
  { timestamps: true }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

export const User = mongoose.model("User", userSchema);
