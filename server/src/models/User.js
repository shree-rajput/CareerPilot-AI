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
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
    },
    techVsBehavioralRatio: {
      type: String,
      enum: ["technical_heavy", "balanced", "behavioral_heavy"],
      default: "balanced"
    },
    preferredQuestionCategories: {
      type: [String],
      default: []
    },
    adaptiveQuestioning: {
      type: Boolean,
      default: true
    },
    followUpQuestions: {
      type: Boolean,
      default: true
    },
    strictnessOfEvaluation: {
      type: String,
      enum: ["gentle", "standard", "strict"],
      default: "standard"
    },
    feedbackDepth: {
      type: String,
      enum: ["concise", "standard", "detailed"],
      default: "detailed"
    }
  },
  { _id: false }
);

const aiPreferencesSchema = new mongoose.Schema(
  {
    responseStyle: {
      type: String,
      enum: ["concise", "detailed"],
      default: "detailed"
    },
    coachingStyle: {
      type: String,
      enum: ["encouraging", "rigorous", "socratic", "direct"],
      default: "rigorous"
    },
    hintBehavior: {
      type: String,
      enum: ["always", "on_request", "never"],
      default: "on_request"
    },
    personalizedRecommendations: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const preparationPreferencesSchema = new mongoose.Schema(
  {
    dailyTargetMinutes: {
      type: Number,
      default: 45,
      min: 10,
      max: 300
    },
    preferredLearningAreas: {
      type: [String],
      default: []
    },
    difficultyPreference: {
      type: String,
      enum: ["easy", "medium", "hard", "adaptive"],
      default: "adaptive"
    },
    priorityTopics: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    applicationReminders: { type: Boolean, default: true },
    interviewReminders: { type: Boolean, default: true },
    preparationReminders: { type: Boolean, default: true },
    mentorUpdates: { type: Boolean, default: true },
    weeklySummaries: { type: Boolean, default: true },
    alerts: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true }
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
    aiPreferences: {
      type: aiPreferencesSchema,
      default: () => ({})
    },
    preparationPreferences: {
      type: preparationPreferencesSchema,
      default: () => ({})
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({})
    },

    // Final Phase Extended Fields: Readiness, Onboarding, and Mentorship
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
    readinessBreakdown: {
      resume: { type: Number, default: 0, min: 0, max: 100 },
      technical: { type: Number, default: 0, min: 0, max: 100 },
      interview: { type: Number, default: 0, min: 0, max: 100 },
      projects: { type: Number, default: 0, min: 0, max: 100 },
      applications: { type: Number, default: 0, min: 0, max: 100 },
      preparation: { type: Number, default: 0, min: 0, max: 100 },
      profile: { type: Number, default: 0, min: 0, max: 100 },
      communication: { type: Number, default: 0, min: 0, max: 100 },
      careerStrategy: { type: Number, default: 0, min: 0, max: 100 }
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
      enum: ["none", "pending", "under_review", "approved", "verified", "rejected", "suspended"],
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
      topics: { type: [String], default: [] },
      languages: { type: [String], default: ["English"] },
      sessionTypes: { type: [String], default: ["1:1 Video Session", "Resume Review", "Mock Interview"] },
      completedSessions: { type: Number, default: 0 },
      linkedinUrl: { type: String, trim: true, default: "" },
      githubUrl: { type: String, trim: true, default: "" },
      verificationDocuments: { type: [String], default: [] }, // Private
      earnings: { type: Number, default: 0 }
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
