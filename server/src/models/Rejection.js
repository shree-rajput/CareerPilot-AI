import mongoose from "mongoose";

const rejectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    stage: { type: String, enum: ["resume_screen", "oa", "technical_interview", "hr_interview", "final_round", "other"], required: true },
    reason: { type: String, default: "" },
    oaResult: { type: String, default: "" },
    interviewFeedback: { type: String, default: "" },
    rememberedQuestions: { type: [String], default: [] },
    weakTopics: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const Rejection = mongoose.model("Rejection", rejectionSchema);
