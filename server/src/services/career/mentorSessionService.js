import MentorshipSession from "../../models/MentorshipSession.js";
import { User } from "../../models/User.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { generatePreSessionBrief, generatePostSessionSummary } from "./mentorInsightService.js";
import { updateUserReadinessScore } from "./readinessService.js";

/**
 * Requests/books a mentorship session.
 * Automatically triggers AI to build the pre-session brief.
 */
export async function requestSession({ studentId, mentorId, topic, description, duration, scheduledAt }) {
  const [student, mentor] = await Promise.all([
    User.findById(studentId),
    User.findById(mentorId)
  ]);

  if (!student || !mentor || mentor.mentorStatus !== "approved") {
    throw new Error("Invalid student or mentor selected");
  }

  // Build the pre-session brief using AI
  const brief = await generatePreSessionBrief(studentId, topic, description);

  const session = new MentorshipSession({
    studentId,
    mentorId,
    topic,
    description,
    duration,
    scheduledAt: new Date(scheduledAt),
    aiBrief: brief,
    status: "requested"
  });

  await session.save();
  await updateUserReadinessScore(studentId, "Requested mentor session");
  return session;
}

/**
 * Responds to a slot request (accept, cancel, or reschedule).
 */
export async function respondToSession(sessionId, { status, scheduledAt, meetingUrl }) {
  const session = await MentorshipSession.findById(sessionId);
  if (!session) {
    throw new Error("Mentorship session not found");
  }

  if (status) session.status = status;
  if (scheduledAt) session.scheduledAt = new Date(scheduledAt);
  if (meetingUrl) session.meetingUrl = meetingUrl;

  await session.save();
  await updateUserReadinessScore(session.studentId, `Mentor session response: ${status}`);
  return session;
}

/**
 * Completes a mentorship session.
 * Invokes AI post-session summary and syncs action items to the student's PreparationPlan.
 */
export async function completeSession(sessionId, { mentorFeedback, rawNotes, actionItems = [] }) {
  const session = await MentorshipSession.findById(sessionId);
  if (!session) {
    throw new Error("Mentorship session not found");
  }

  // Generate the AI summary and verify actions
  const aiSummary = await generatePostSessionSummary(session.topic, mentorFeedback, rawNotes);

  session.status = "completed";
  session.mentorFeedback = mentorFeedback;
  session.sessionSummary = aiSummary.summary;

  // Compile assigned action items from UI input & AI parsing
  const finalActionItems = [];
  
  // 1. Add explicitly passed action items
  actionItems.forEach(item => {
    if (typeof item === "string" && item.trim()) {
      finalActionItems.push({
        title: item.trim(),
        status: "pending",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      });
    } else if (item && item.title) {
      finalActionItems.push({
        title: item.title,
        status: "pending",
        dueDate: item.dueDate ? new Date(item.dueDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      });
    }
  });

  // 2. Blend in any unique AI-extracted action items
  aiSummary.actionItems.forEach(title => {
    const exists = finalActionItems.some(item => item.title.toLowerCase() === title.toLowerCase());
    if (!exists) {
      finalActionItems.push({
        title,
        status: "pending",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Default 5 days
      });
    }
  });

  session.actionItems = finalActionItems;
  await session.save();

  // SYNC TO PREPARATION PLAN: Add these items as active prep checklist items
  const activePlan = await PreparationPlan.findOne({ userId: session.studentId, isActive: true });
  if (activePlan) {
    finalActionItems.forEach(item => {
      activePlan.actionItems.push({
        title: `Mentor Task: ${item.title}`,
        reason: `Assigned by mentor during session on ${session.topic}.`,
        priority: "HIGH",
        estimatedTimeMinutes: 45,
        dueDate: item.dueDate,
        status: "pending",
        source: "mentorship"
      });
    });
    await activePlan.save();
  } else {
    // If no active prep plan, create a basic fallback plan to host the actions
    const newPlan = new PreparationPlan({
      userId: session.studentId,
      targetRole: "Software Engineer",
      actionItems: finalActionItems.map(item => ({
        title: `Mentor Task: ${item.title}`,
        reason: `Assigned by mentor during session on ${session.topic}.`,
        priority: "HIGH",
        estimatedTimeMinutes: 45,
        dueDate: item.dueDate,
        status: "pending",
        source: "mentorship"
      })),
      isActive: true
    });
    await newPlan.save();
  }

  // Recalculate readiness score for candidate
  await updateUserReadinessScore(session.studentId, "Completed mentor session");

  return session;
}

/**
 * Submits rating/review from the student for a completed session.
 * Aggregates average rating and reviews count on the mentor's user profile.
 */
export async function rateSession(sessionId, { rating, review }) {
  const session = await MentorshipSession.findById(sessionId);
  if (!session || session.status !== "completed") {
    throw new Error("Cannot rate an incomplete session");
  }

  session.ratings = {
    studentRating: Number(rating),
    studentReview: review || ""
  };
  await session.save();

  // Recalculate average ratings for the mentor
  const mentorId = session.mentorId;
  const completedSessions = await MentorshipSession.find({
    mentorId,
    status: "completed",
    "ratings.studentRating": { $gt: 0 }
  });

  const ratingSum = completedSessions.reduce((sum, s) => sum + s.ratings.studentRating, 0);
  const avgRating = completedSessions.length > 0 ? Number((ratingSum / completedSessions.length).toFixed(1)) : 4.8;

  await User.findByIdAndUpdate(mentorId, {
    $set: {
      "mentorProfile.rating": avgRating,
      "mentorProfile.reviewsCount": completedSessions.length
    }
  });

  return session;
}

/**
 * Fetches sessions for a student.
 */
export async function getStudentSessions(studentId) {
  return await MentorshipSession.find({ studentId })
    .populate("mentorId", "name email avatar mentorProfile")
    .sort({ scheduledAt: -1 });
}

/**
 * Fetches sessions for a mentor.
 */
export async function getMentorSessions(mentorId) {
  return await MentorshipSession.find({ mentorId })
    .populate("studentId", "name email avatar")
    .sort({ scheduledAt: -1 });
}
