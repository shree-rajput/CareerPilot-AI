import mongoose from "mongoose";

const technicalScenarioSchema = new mongoose.Schema(
  {
    scenarioId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["coding", "development", "cs_fundamentals", "architecture", "project_discussion", "interview_prep", "custom"],
      required: true,
      index: true,
    },
    subtopic: {
      type: String,
      default: "General",
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
    },
    targetRoles: {
      type: [String],
      default: ["Software Engineer", "Backend Engineer", "Full Stack Developer"],
    },
    openingPrompt: {
      type: String,
      required: true,
    },
    guidedFollowUps: {
      type: [String],
      default: [],
    },
    tradeOffsToExplore: {
      type: [String],
      default: [],
    },
    expectedConcepts: {
      type: [String],
      default: [],
    },
    starterCode: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    starterCanvasElements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    sourceReference: {
      type: String,
      default: "CareerPilot Curated",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const TechnicalScenarioBank = mongoose.model(
  "TechnicalScenarioBank",
  technicalScenarioSchema
);

export default TechnicalScenarioBank;
