import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  reason: { type: String, required: true },
  priority: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
  estimatedTimeMinutes: { type: Number, default: 30 },
  dueDate: { type: Date },
  status: { type: String, enum: ["pending", "completed", "skipped"], default: "pending" },
  source: { type: String, default: "gap_analysis" }
}, { _id: true });

const preparationPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetRole: { type: String, required: true },
    generatedFor: { type: String, enum: ["General", "Interview", "OA"], default: "General" },
    actionItems: { type: [actionItemSchema], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PreparationPlan = mongoose.model("PreparationPlan", preparationPlanSchema);
