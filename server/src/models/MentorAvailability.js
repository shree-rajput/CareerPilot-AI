import mongoose from "mongoose";

const slotRuleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday...
    startMinutes: { type: Number, required: true, min: 0, max: 1440 }, // Minutes from midnight (e.g. 540 = 9:00 AM)
    endMinutes: { type: Number, required: true, min: 0, max: 1440 }   // Minutes from midnight (e.g. 1020 = 5:00 PM)
  },
  { _id: true }
);

const mentorAvailabilitySchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    timezone: { type: String, default: "UTC", trim: true },
    slotDurationMinutes: { type: Number, enum: [30, 45, 60], default: 30 },
    weeklySlots: { type: [slotRuleSchema], default: [] },
    blackoutDates: { type: [Date], default: [] }
  },
  { timestamps: true }
);

export const MentorAvailability = mongoose.model("MentorAvailability", mentorAvailabilitySchema);
