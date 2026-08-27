import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["deadline", "reminder", "action_required", "insight"], required: true },
    message: { type: String, required: true },
    actionUrl: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
