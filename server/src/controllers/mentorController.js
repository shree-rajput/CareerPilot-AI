import { User } from "../models/User.js";
import { createError } from "../utils/error.js";
import {
  requestSession,
  respondToSession,
  completeSession,
  rateSession,
  getStudentSessions,
  getMentorSessions
} from "../services/career/mentorSessionService.js";
import { matchMentorsForCandidate } from "../services/career/mentorMatchingService.js";
import { updateUserReadinessScore } from "../services/career/readinessService.js";
import MentorshipSession from "../models/MentorshipSession.js";

/**
 * Onboards the current user as a mentor.
 * Sets status to 'approved' if SEED_DEMO_DATA=true or in development, else 'pending'.
 */
export const onboardMentor = async (req, res, next) => {
  try {
    const { role, company, experienceYears, skills, specialties, availability, bio, topics } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const autoApprove = process.env.SEED_DEMO_DATA === "true" || process.env.NODE_ENV === "development";
    user.mentorStatus = autoApprove ? "approved" : "pending";
    
    user.mentorProfile = {
      role: role || "",
      company: company || "",
      experienceYears: Number(experienceYears) || 0,
      skills: Array.isArray(skills) ? skills : [],
      specialties: Array.isArray(specialties) ? specialties : [],
      availability: Array.isArray(availability) ? availability : [],
      bio: bio || "",
      topics: Array.isArray(topics) ? topics : [],
      rating: 4.8,
      reviewsCount: 0
    };

    await user.save();
    await updateUserReadinessScore(req.user.id, "Onboarded as Mentor");

    res.status(200).json({
      success: true,
      data: user.toSafeObject(),
      message: user.mentorStatus === "approved" 
        ? "Onboarded successfully as an approved mentor."
        : "Mentor application submitted successfully. Pending review."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all approved mentors.
 */
export const getApprovedMentors = async (req, res, next) => {
  try {
    const mentors = await User.find({ mentorStatus: "approved" })
      .select("name email avatar mentorProfile")
      .lean();

    const formattedMentors = mentors.map(m => ({
      mentorId: m._id,
      name: m.name,
      email: m.email,
      avatar: m.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${m.name}`,
      mentorProfile: m.mentorProfile,
      isDemo: m.email.endsWith("@demo.careerpilot.ai")
    }));

    res.status(200).json({
      success: true,
      data: formattedMentors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Runs the hybrid Deterministic + AI Mentor Matching algorithm.
 */
export const matchMentors = async (req, res, next) => {
  try {
    const matched = await matchMentorsForCandidate(req.user.id);
    res.status(200).json({
      success: true,
      data: matched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Books/requests a session with a mentor.
 */
export const requestMentorSession = async (req, res, next) => {
  try {
    const { mentorId, topic, description, duration, scheduledAt } = req.body;

    if (!mentorId || !topic || !duration || !scheduledAt) {
      return next(createError(400, "Missing required booking details"));
    }

    // Mentor Readiness Evaluator: Candidate must meet a minimum readiness threshold
    const user = await User.findById(req.user.id);
    if (!user || user.readinessScore < 50) {
      return next(createError(403, "Mentor Readiness not met. Complete 'Next Best Actions' on your dashboard to reach at least 50% readiness before booking a session."));
    }

    const session = await requestSession({
      studentId: req.user.id,
      mentorId,
      topic,
      description,
      duration,
      scheduledAt
    });

    res.status(201).json({
      success: true,
      data: session,
      message: "Session requested successfully"
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Responds to a session request (Accept, Reschedule, or Cancel).
 */
export const respondToMentorSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status, scheduledAt, meetingUrl } = req.body;

    const session = await MentorshipSession.findById(sessionId);
    if (!session) {
      return next(createError(404, "Session not found"));
    }

    // Verify authorized user: must be the student or mentor of the session
    const isStudent = session.studentId.toString() === req.user.id;
    const isMentor = session.mentorId.toString() === req.user.id;

    if (!isStudent && !isMentor) {
      return next(createError(403, "Not authorized to update this session"));
    }

    const updated = await respondToSession(sessionId, { status, scheduledAt, meetingUrl });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Session ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Completes the session, saves feedback and triggers action items sync.
 */
export const completeMentorSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { mentorFeedback, rawNotes, actionItems } = req.body;

    const session = await MentorshipSession.findById(sessionId);
    if (!session) {
      return next(createError(404, "Session not found"));
    }

    // Only the mentor can complete a session
    if (session.mentorId.toString() !== req.user.id) {
      return next(createError(403, "Only the assigned mentor can log session completion"));
    }

    const updated = await completeSession(sessionId, { mentorFeedback, rawNotes, actionItems });

    res.status(200).json({
      success: true,
      data: updated,
      message: "Session completion logged and student prep checklist updated"
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Allows candidate to review/rate the completed session.
 */
export const rateMentorSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { rating, review } = req.body;

    const session = await MentorshipSession.findById(sessionId);
    if (!session) {
      return next(createError(404, "Session not found"));
    }

    // Only the candidate can review
    if (session.studentId.toString() !== req.user.id) {
      return next(createError(403, "Only the student candidate can rate this session"));
    }

    const updated = await rateSession(sessionId, { rating, review });

    res.status(200).json({
      success: true,
      data: updated,
      message: "Session review logged. Mentor rating updated."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches sessions for student or mentor role.
 */
export const getSessions = async (req, res, next) => {
  try {
    const { role } = req.query; // 'mentor' or 'student'

    if (role === "mentor") {
      const sessions = await getMentorSessions(req.user.id);
      return res.status(200).json({ success: true, data: sessions });
    } else {
      const sessions = await getStudentSessions(req.user.id);
      return res.status(200).json({ success: true, data: sessions });
    }
  } catch (error) {
    next(error);
  }
};
