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
    targetRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    experienceLevel: {
      type: String,
      enum: ["student", "fresher", "intern", "junior"],
      default: "student"
    },
    technicalSkills: { type: [String], default: [] },
    primaryTechStack: { type: [String], default: [] },
    interviewPreferences: {
      type: interviewPreferencesSchema,
      default: () => ({})
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
