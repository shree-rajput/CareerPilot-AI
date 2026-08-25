import mongoose from "mongoose";

const starterCodeSchema = new mongoose.Schema(
  {
    javascript: {
      type: String,
      default: "",
    },

    typescript: {
      type: String,
      default: "",
    },

    python: {
      type: String,
      default: "",
    },

    java: {
      type: String,
      default: "",
    },

    cpp: {
      type: String,
      default: "",
    },

    c: {
      type: String,
      default: "",
    },

    csharp: {
      type: String,
      default: "",
    },

    go: {
      type: String,
      default: "",
    },

    rust: {
      type: String,
      default: "",
    },

    kotlin: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    expectedOutput: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    explanation: {
      type: String,
      default: "",
    },

    hidden: {
      type: Boolean,
      default: false,
    },

    weight: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  {
    _id: true,
  },
);

const codingQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      index: true,
    },

    topics: {
      type: [String],
      default: [],
      index: true,
    },

    supportedLanguages: {
      type: [String],
      enum: [
        "javascript",
        "typescript",
        "python",
        "java",
        "cpp",
        "c",
        "csharp",
        "go",
        "rust",
        "kotlin",
      ],
      required: true,
      default: ["javascript"],
    },

    defaultLanguage: {
      type: String,
      enum: [
        "javascript",
        "typescript",
        "python",
        "java",
        "cpp",
        "c",
        "csharp",
        "go",
        "rust",
        "kotlin",
      ],
      default: "javascript",
    },

    starterCode: {
      type: starterCodeSchema,
      default: () => ({}),
    },

    testCases: {
      type: [testCaseSchema],
      default: [],
    },

    constraints: {
      type: [String],
      default: [],
    },

    hints: {
      type: [String],
      default: [],
    },

    expectedComplexity: {
      time: {
        type: String,
        default: "",
      },

      space: {
        type: String,
        default: "",
      },
    },

    evaluationCriteria: {
      correctness: {
        type: Number,
        default: 40,
        min: 0,
        max: 100,
      },

      codeQuality: {
        type: Number,
        default: 20,
        min: 0,
        max: 100,
      },

      timeComplexity: {
        type: Number,
        default: 20,
        min: 0,
        max: 100,
      },

      spaceComplexity: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },

      explanation: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
    },

    tags: {
      type: [String],
      default: [],
    },

    companyTags: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: ["system", "admin", "ai_generated", "user_created"],
      default: "system",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

codingQuestionSchema.index({
  difficulty: 1,
  topics: 1,
  isActive: 1,
});

const CodingQuestion = mongoose.model("CodingQuestion", codingQuestionSchema);

export default CodingQuestion;
