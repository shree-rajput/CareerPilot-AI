import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    dueDate: { type: Date }
  },
  { _id: true }
);

const ratingsSchema = new mongoose.Schema(
  {
    studentRating: { type: Number, default: 0 },
    studentReview: { type: String, default: "" }
  },
  { _id: false }
);

const sessionNotesSchema = new mongoose.Schema(
  {
    topic: { type: String, trim: true, default: "" },
    studentLevel: { type: String, trim: true, default: "Intermediate" },
    problemsDiscussed: { type: String, trim: true, default: "" },
    studentStruggles: { type: String, trim: true, default: "" },
    recommendedPractice: { type: String, trim: true, default: "" },
    nextSteps: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const mentorshipSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["requested", "accepted", "scheduled", "reschedule_proposed", "completed", "cancelled", "missed"],
      default: "requested"
    },
    topic: {
      type: String,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    duration: {
      type: Number,
      required: true // in minutes (e.g., 30, 45, 60)
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    proposedRescheduleAt: {
      type: Date
    },
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancellationReason: {
      type: String,
      default: ""
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    isNoShow: {
      type: String,
      enum: ["none", "student", "mentor", "both"],
      default: "none"
    },
    meetingUrl: {
      type: String,
      default: ""
    },
    aiBrief: {
      type: String,
      default: "" // Dynamic AI brief generated for the mentor before the session
    },
    sessionSummary: {
      type: String,
      default: "" // AI summary generated after the session completes
    },
    mentorFeedback: {
      type: String,
      default: "" // Text feedback notes from the mentor
    },
    sessionNotes: {
      type: sessionNotesSchema,
      default: () => ({})
    },
    actionItems: {
      type: [actionItemSchema],
      default: [] // To-do tasks assigned to the student by the mentor
    },
    ratings: {
      type: ratingsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

mentorshipSessionSchema.index({ studentId: 1, scheduledAt: -1 });
mentorshipSessionSchema.index({ mentorId: 1, scheduledAt: -1 });

const MentorshipSession = mongoose.model("MentorshipSession", mentorshipSessionSchema);

export default MentorshipSession;
