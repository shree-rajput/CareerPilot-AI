import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    testCaseId: { type: mongoose.Schema.Types.ObjectId },
    passed: { type: Boolean, required: true },
    actualOutput: { type: mongoose.Schema.Types.Mixed },
    expectedOutput: { type: mongoose.Schema.Types.Mixed },
    executionTimeMs: { type: Number, default: 0 },
    error: { type: String, default: "" }
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    interviewSessionId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    language: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      required: true
    },
    passedTests: {
      type: Number,
      required: true
    },
    totalTests: {
      type: Number,
      required: true
    },
    testResults: {
      type: [testResultSchema],
      default: []
    },
    runtimeMs: {
      type: Number,
      default: 0
    },
    memoryKb: {
      type: Number,
      default: 0
    },
    codeQualityScore: {
      type: Number,
      default: null
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

codingSubmissionSchema.index({ candidateId: 1, questionId: 1, createdAt: -1 });

const CodingSubmission = mongoose.model("CodingSubmission", codingSubmissionSchema);

export default CodingSubmission;
