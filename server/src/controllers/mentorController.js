import { User } from "../models/User.js";
import { MentorProfile } from "../models/MentorProfile.js";
import { MentorApplication } from "../models/MentorApplication.js";
import { MentorVerification } from "../models/MentorVerification.js";
import { MentorAvailability } from "../models/MentorAvailability.js";
import MentorshipSession from "../models/MentorshipSession.js";
import { MentorshipReview } from "../models/MentorshipReview.js";
import { MentorReport } from "../models/MentorReport.js";
import { MentorshipMessage } from "../models/MentorshipMessage.js";
import { PreparationPlan } from "../models/PreparationPlan.js";
import { createError } from "../utils/error.js";
import { createLiveKitToken } from "../utils/livekit.js";
import { createNotification } from "../services/notification/notificationService.js";
import { getCandidateIntelligenceContext } from "../services/career/candidateIntelligenceService.js";
import {
  generateAvailableSlots,
  calculateDeterministicMatch,
  recalculateMentorRating
} from "../services/career/mentorConnectService.js";

/**
 * Submits a new mentor application for admin verification review.
 */
export const applyToBecomeMentor = async (req, res, next) => {
  try {
    const {
      professionalName,
      headline,
      currentRole,
      company,
      experienceYears,
      skills,
      expertiseAreas,
      mentoringTopics,
      languages,
      bio,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      verificationNotes
    } = req.body;

    if (!professionalName || !headline || !currentRole || !company || experienceYears === undefined) {
      return next(createError(400, "Missing required mentor application fields."));
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) return next(createError(404, "User not found"));

    // Create or update pending application
    const application = await MentorApplication.findOneAndUpdate(
      { userId },
      {
        userId,
        status: "pending",
        professionalName: professionalName.trim(),
        headline: headline.trim(),
        currentRole: currentRole.trim(),
        company: company.trim(),
        experienceYears: Number(experienceYears) || 0,
        skills: Array.isArray(skills) ? skills : [],
        expertiseAreas: Array.isArray(expertiseAreas) ? expertiseAreas : [],
        mentoringTopics: Array.isArray(mentoringTopics) ? mentoringTopics : [],
        languages: Array.isArray(languages) ? languages : ["English"],
        bio: bio ? bio.trim() : "",
        portfolioUrl: portfolioUrl ? portfolioUrl.trim() : "",
        githubUrl: githubUrl ? githubUrl.trim() : "",
        linkedinUrl: linkedinUrl ? linkedinUrl.trim() : "",
        verificationNotes: verificationNotes ? verificationNotes.trim() : "",
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Initialize granular verification record
    await MentorVerification.findOneAndUpdate(
      { userId },
      { userId, identityStatus: "UNVERIFIED", employmentStatus: "UNVERIFIED", expertiseStatus: "UNVERIFIED" },
      { upsert: true, new: true }
    );

    user.mentorStatus = "pending";
    await user.save();

    await createNotification({
      userId,
      type: "SYSTEM",
      title: "Mentor Application Submitted 🚀",
      message: "Your application to join Mentor Connect has been received. Our admin team will review your professional verification details.",
      actionUrl: "/mentor/dashboard"
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: application,
      message: "Mentor application submitted successfully. Pending admin review."
    });
  } catch (error) {
    next(error);
  }
};

export const onboardMentor = applyToBecomeMentor;

/**
 * Public discovery endpoint for approved mentors with search, filter, and deterministic matching.
 */
export const discoverMentors = async (req, res, next) => {
  try {
    const { search, skill, topic, minExperience, minRating, includeDemo } = req.query;

    const query = { isActive: true };

    // Strict production filtering: exclude demo data unless explicitly requested
    if (includeDemo !== "true" && process.env.NODE_ENV === "production") {
      query.isDemo = false;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { professionalName: searchRegex },
        { company: searchRegex },
        { currentRole: searchRegex },
        { headline: searchRegex }
      ];
    }

    if (skill) {
      query.skills = { $in: [new RegExp(skill, "i")] };
    }

    if (topic) {
      query.mentoringTopics = { $in: [new RegExp(topic, "i")] };
    }

    if (minExperience) {
      query.experienceYears = { $gte: Number(minExperience) };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    const profiles = await MentorProfile.find(query)
      .populate("userId", "name email avatar mentorStatus")
      .sort({ rating: -1, reviewsCount: -1 })
      .lean();

    // Filter out mentors who are not approved or suspended
    const approvedProfiles = profiles.filter(p => p.userId && ["approved", "verified"].includes(p.userId.mentorStatus));

    // Fetch granular verification records
    const userIds = approvedProfiles.map(p => p.userId._id);
    const verifications = await MentorVerification.find({ userId: { $in: userIds } }).lean();
    const verifMap = new Map(verifications.map(v => [v.userId.toString(), v]));

    // Format output with deterministic match explanations
    const formatted = await Promise.all(
      approvedProfiles.map(async (p) => {
        const candidateId = req.user?._id || req.user?.id;
        const matchInfo = candidateId ? await calculateDeterministicMatch(candidateId, p) : { score: 50, explanation: "", matchSignals: [] };
        const verif = verifMap.get(p.userId._id.toString()) || { identityStatus: "UNVERIFIED", employmentStatus: "UNVERIFIED", expertiseStatus: "UNVERIFIED" };

        return {
          id: p._id,
          userId: p.userId._id,
          name: p.professionalName || p.userId.name,
          email: p.userId.email,
          avatar: p.userId.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.professionalName)}`,
          headline: p.headline,
          currentRole: p.currentRole,
          company: p.company,
          experienceYears: p.experienceYears,
          skills: p.skills,
          expertiseAreas: p.expertiseAreas,
          mentoringTopics: p.mentoringTopics,
          languages: p.languages,
          bio: p.bio,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          completedSessionsCount: p.completedSessionsCount,
          verification: {
            identity: verif.identityStatus,
            employment: verif.employmentStatus,
            expertise: verif.expertiseStatus
          },
          matchScore: matchInfo.score,
          matchExplanation: matchInfo.explanation,
          matchSignals: matchInfo.matchSignals,
          isDemo: p.isDemo
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets detailed public profile of a mentor by ID or userId.
 */
export const getMentorProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await MentorProfile.findOne({
      $or: [{ _id: id }, { userId: id }]
    })
      .populate("userId", "name email avatar mentorStatus")
      .lean();

    if (!profile || !profile.userId || ["suspended", "rejected"].includes(profile.userId.mentorStatus)) {
      return next(createError(404, "Mentor profile not found or unavailable."));
    }

    const verification = await MentorVerification.findOne({ userId: profile.userId._id }).lean() || {
      identityStatus: "UNVERIFIED",
      employmentStatus: "UNVERIFIED",
      expertiseStatus: "UNVERIFIED"
    };

    const candidateId = req.user?._id || req.user?.id;
    const matchInfo = candidateId ? await calculateDeterministicMatch(candidateId, profile) : { score: 50, explanation: "" };

    const reviews = await MentorshipReview.find({ mentorId: profile.userId._id })
      .populate("studentId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        id: profile._id,
        userId: profile.userId._id,
        name: profile.professionalName || profile.userId.name,
        headline: profile.headline,
        currentRole: profile.currentRole,
        company: profile.company,
        experienceYears: profile.experienceYears,
        skills: profile.skills,
        expertiseAreas: profile.expertiseAreas,
        mentoringTopics: profile.mentoringTopics,
        languages: profile.languages,
        bio: profile.bio,
        portfolioUrl: profile.portfolioUrl,
        githubUrl: profile.githubUrl,
        linkedinUrl: profile.linkedinUrl,
        rating: profile.rating,
        reviewsCount: profile.reviewsCount,
        completedSessionsCount: profile.completedSessionsCount,
        verification: {
          identity: verification.identityStatus,
          employment: verification.employmentStatus,
          expertise: verification.expertiseStatus
        },
        matchScore: matchInfo.score,
        matchExplanation: matchInfo.explanation,
        reviews: reviews.map(r => ({
          id: r._id,
          studentName: r.studentId?.name || "Candidate",
          studentAvatar: r.studentId?.avatar,
          rating: r.rating,
          reviewText: r.reviewText,
          date: r.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets computed booking slots for a mentor on a given date.
 */
export const getMentorSlots = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { date, duration } = req.query;

    if (!date) return next(createError(400, "Target date is required."));

    const slots = await generateAvailableSlots({
      mentorId,
      targetDateStr: date,
      durationMinutes: Number(duration) || 30
    });

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Configures weekly availability rules for the logged-in mentor.
 */
export const configureMentorAvailability = async (req, res, next) => {
  try {
    const { timezone, slotDurationMinutes, weeklySlots, blackoutDates } = req.body;
    const mentorId = req.user._id || req.user.id;

    const availability = await MentorAvailability.findOneAndUpdate(
      { mentorId },
      {
        mentorId,
        timezone: timezone || "UTC",
        slotDurationMinutes: Number(slotDurationMinutes) || 30,
        weeklySlots: Array.isArray(weeklySlots) ? weeklySlots : [],
        blackoutDates: Array.isArray(blackoutDates) ? blackoutDates.map(d => new Date(d)) : []
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: availability,
      message: "Availability configured successfully."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets availability configuration for a mentor.
 */
export const getMentorAvailability = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const targetMentorId = mentorId || req.user._id || req.user.id;

    const availability = await MentorAvailability.findOne({ mentorId: targetMentorId }).lean();

    res.status(200).json({
      success: true,
      data: availability || { timezone: "UTC", slotDurationMinutes: 30, weeklySlots: [], blackoutDates: [] }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Requests a new mentorship session with slot validation, overlap check & AI candidate prep brief.
 */
export const requestMentorshipSession = async (req, res, next) => {
  try {
    const { mentorId, topic, description, duration, scheduledAt } = req.body;
    const studentId = req.user._id || req.user.id;

    if (!mentorId || !topic || !scheduledAt) {
      return next(createError(400, "Missing required booking details."));
    }

    // Verify mentor status
    const mentorUser = await User.findById(mentorId);
    if (!mentorUser || !["approved", "verified"].includes(mentorUser.mentorStatus)) {
      return next(createError(403, "Target mentor is unavailable for bookings."));
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now()) {
      return next(createError(400, "Cannot book a session in the past."));
    }

    const durationMinutes = Number(duration) || 30;
    const sessionEnd = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);

    // Overlap check on existing sessions
    const existingOverlap = await MentorshipSession.findOne({
      mentorId,
      status: { $in: ["requested", "accepted", "scheduled", "live"] },
      scheduledAt: { $lt: sessionEnd },
      $expr: {
        $gt: [
          { $add: ["$scheduledAt", { $multiply: ["$duration", 60, 1000] }] },
          scheduledDate
        ]
      }
    });

    if (existingOverlap) {
      return next(createError(409, "The selected time slot is no longer available. Please select another time."));
    }

    // Build AI Prep Brief for Mentor from Candidate Intelligence
    let preSessionBrief = null;
    try {
      const intel = await getCandidateIntelligenceContext(studentId);
      const targetRole = intel.careerProfile?.targetRoles?.[0]?.title || "Software Engineer";
      const topSkillGaps = (intel.skillGaps || []).slice(0, 3).map(g => g.skill);

      preSessionBrief = {
        backgroundSummary: `${req.user.name} is preparing for ${targetRole} placement (${intel.careerProfile?.experienceLevel || "Student"}). Goal: ${description || topic}.`,
        topSkillGaps: topSkillGaps.length > 0 ? topSkillGaps : ["System Architecture", "Problem Solving"],
        suggestedQuestions: [
          `How can I best prepare for ${targetRole} technical rounds?`,
          `What key architectural patterns should I focus on?`,
          `How can I improve my project portfolio impact?`
        ]
      };
    } catch (intelErr) {
      preSessionBrief = {
        backgroundSummary: `${req.user.name} requested a mentorship session on "${topic}".`,
        topSkillGaps: [],
        suggestedQuestions: ["How can I best prepare for technical rounds?"]
      };
    }

    const session = await MentorshipSession.create({
      studentId,
      mentorId,
      topic: topic.trim(),
      description: description ? description.trim() : "",
      duration: durationMinutes,
      scheduledAt: scheduledDate,
      status: "requested",
      meetingUrl: "",
      preSessionBrief
    });

    // Notify mentor
    await createNotification({
      userId: mentorId,
      type: "MENTOR_UPDATE",
      title: "New Mentorship Request 📩",
      message: `${req.user.name} requested a ${durationMinutes}-min session on "${topic}".`,
      entityType: "mentorship_session",
      actionUrl: "/mentor/dashboard"
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: session,
      message: "Session request submitted to mentor."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Responds to a session request (Accept / Reject / Reschedule).
 */
export const respondToMentorshipRequest = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status, scheduledAt, meetingUrl } = req.body;
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId);
    if (!session) return next(createError(404, "Session not found."));

    const isStudent = session.studentId.toString() === userId;
    const isMentor = session.mentorId.toString() === userId;

    if (!isStudent && !isMentor) {
      return next(createError(403, "Not authorized to respond to this session."));
    }

    if (status === "accepted" || status === "scheduled") {
      session.status = "scheduled";
      session.meetingUrl = meetingUrl || `/mentor/sessions/${sessionId}/room`;
      if (scheduledAt) session.scheduledAt = new Date(scheduledAt);
    } else if (status === "rejected") {
      session.status = "rejected";
    } else if (status === "cancelled") {
      session.status = "cancelled";
    }

    await session.save();

    const targetUserId = isMentor ? session.studentId : session.mentorId;
    const statusMsg = session.status === "scheduled" ? "Accepted & Scheduled" : session.status.toUpperCase();

    await createNotification({
      userId: targetUserId,
      type: session.status === "scheduled" ? "MENTOR_ACCEPTED" : "MENTOR_REJECTED",
      title: `Mentorship Session ${statusMsg} 🗓️`,
      message: `Your session on "${session.topic}" has been ${session.status}.`,
      entityType: "mentorship_session",
      actionUrl: `/mentor/sessions/${sessionId}/room`
    }).catch(() => {});

    res.status(200).json({
      success: true,
      data: session,
      message: `Session ${session.status} successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates LiveKit WebRTC access token for authorized session participants.
 */
export const getLiveKitTokenController = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId).lean();
    if (!session) return next(createError(404, "Mentorship session not found."));

    const isStudent = session.studentId.toString() === userId;
    const isMentor = session.mentorId.toString() === userId;

    if (!isStudent && !isMentor) {
      return next(createError(403, "Access denied: You are not a participant in this mentorship session."));
    }

    if (["rejected", "cancelled", "completed"].includes(session.status)) {
      return next(createError(400, `Cannot join session in '${session.status}' state.`));
    }

    const roomName = `mentor-session-${sessionId}`;
    const identity = `user_${userId}`;
    const name = req.user.name || (isMentor ? "Mentor" : "Candidate");

    let token = "";
    try {
      token = await createLiveKitToken({ identity, roomName, name });
    } catch (lkErr) {
      console.warn("[LiveKit Token Warning]:", lkErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        token,
        roomName,
        sessionId: session._id,
        topic: session.topic,
        studentId: session.studentId,
        mentorId: session.mentorId,
        livekitUrl: process.env.LIVEKIT_URL || ""
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Completes session, logs mentor feedback & action items, and syncs items to candidate's PreparationPlan.
 */
export const completeMentorshipSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { mentorFeedback, actionItems } = req.body;
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId);
    if (!session) return next(createError(404, "Session not found."));

    if (session.mentorId.toString() !== userId) {
      return next(createError(403, "Only the assigned mentor can log session completion."));
    }

    session.status = "completed";
    session.mentorFeedback = mentorFeedback || "";
    const items = Array.isArray(actionItems) ? actionItems : [];

    session.actionItems = items.map(item => typeof item === "string" ? { title: item, status: "pending" } : item);
    await session.save();

    // Increment completed sessions count on profile
    await MentorProfile.findOneAndUpdate(
      { userId: session.mentorId },
      { $inc: { completedSessionsCount: 1 } }
    );

    // Sync mentor action items into candidate's active PreparationPlan
    if (items.length > 0) {
      try {
        const planItems = items.map(item => {
          const titleStr = typeof item === "string" ? item : item.title;
          return {
            title: `Mentor Advice: ${titleStr}`,
            reason: `Assigned by mentor during session on "${session.topic}"`,
            priority: "HIGH",
            estimatedTimeMinutes: 45,
            status: "pending",
            source: "mentorship_session"
          };
        });

        await PreparationPlan.findOneAndUpdate(
          { userId: session.studentId, isActive: true },
          { $push: { actionItems: { $each: planItems } } },
          { upsert: true, new: true }
        );
      } catch (planErr) {
        console.warn("[PreparationPlan Sync Warning]:", planErr.message);
      }
    }

    res.status(200).json({
      success: true,
      data: session,
      message: "Session completion logged & action items synced to candidate preparation plan."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rates a completed session and updates mentor average rating.
 */
export const rateMentorshipSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { rating, review } = req.body;
    const userId = (req.user._id || req.user.id).toString();

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return next(createError(400, "Rating must be a number between 1 and 5."));
    }

    const session = await MentorshipSession.findById(sessionId);
    if (!session) return next(createError(404, "Session not found."));

    if (session.studentId.toString() !== userId) {
      return next(createError(403, "Only the student candidate can rate this session."));
    }

    session.ratings = {
      studentRating: Number(rating),
      studentReview: review ? review.trim() : ""
    };
    await session.save();

    await MentorshipReview.findOneAndUpdate(
      { sessionId: session._id },
      {
        sessionId: session._id,
        studentId: session.studentId,
        mentorId: session.mentorId,
        rating: Number(rating),
        reviewText: review ? review.trim() : ""
      },
      { upsert: true, new: true }
    );

    await recalculateMentorRating(session.mentorId);

    res.status(200).json({
      success: true,
      data: session,
      message: "Review submitted successfully. Mentor rating updated."
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
    const userId = req.user._id || req.user.id;
    const { role } = req.query;

    const query = role === "mentor" ? { mentorId: userId } : { studentId: userId };

    const sessions = await MentorshipSession.find(query)
      .populate("studentId", "name email avatar")
      .populate("mentorId", "name email avatar mentorProfile")
      .sort({ scheduledAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Files a safety report against a mentor.
 */
export const reportMentor = async (req, res, next) => {
  try {
    const { mentorId, sessionId, category, details } = req.body;
    const reporterId = req.user._id || req.user.id;

    if (!mentorId || !category || !details) {
      return next(createError(400, "Missing required report details."));
    }

    const report = await MentorReport.create({
      reporterId,
      mentorId,
      sessionId: sessionId || null,
      category,
      details: details.trim(),
      status: "pending"
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "Report submitted securely. Admin team will investigate."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches in-session chat messages.
 */
export const getMentorshipMessages = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId).lean();
    if (!session) return next(createError(404, "Session not found."));

    if (session.studentId.toString() !== userId && session.mentorId.toString() !== userId) {
      return next(createError(403, "Access denied."));
    }

    const messages = await MentorshipMessage.find({ sessionId })
      .sort({ sentAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets practical capability challenge for mentor onboarding step.
 */
export const getCapabilityChallengeController = async (req, res, next) => {
  try {
    const { track } = req.query;
    const { getCapabilityChallenge } = await import("../services/career/capabilityAssessmentService.js");
    const challenge = await getCapabilityChallenge(track || "technical");

    res.status(200).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submits capability challenge for transparent rubric evaluation and state transition.
 */
export const submitCapabilityAssessmentController = async (req, res, next) => {
  try {
    const mentorId = req.user._id || req.user.id;
    const { track, challengeId, submissionContent } = req.body;

    const { evaluateCapabilitySubmission } = await import("../services/career/capabilityAssessmentService.js");
    const result = await evaluateCapabilitySubmission({
      mentorId,
      track: track || "technical",
      challengeId,
      submissionContent
    });

    res.status(200).json({
      success: true,
      data: result,
      message: result.passed
        ? "Congratulations! Capability assessment passed. Your account is now in Probationary Mentor state."
        : "Assessment evaluated. Review notes for improvement areas."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches multi-dimensional reputation and trust progression for logged-in mentor.
 */
export const getMentorReputationController = async (req, res, next) => {
  try {
    const mentorId = req.user._id || req.user.id;
    const { updateMentorReputation } = await import("../services/career/mentorReputationEngine.js");
    const reputation = await updateMentorReputation(mentorId);

    res.status(200).json({
      success: true,
      data: reputation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs structured session notes and syncs actionable items into candidate PreparationPlan.
 */
export const saveSessionNotesController = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { topic, studentLevel, problemsDiscussed, studentStruggles, recommendedPractice, nextSteps, actionItems } = req.body;
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId);
    if (!session) return next(createError(404, "Mentorship session not found."));

    if (session.mentorId.toString() !== userId) {
      return next(createError(403, "Only the assigned mentor can write session notes."));
    }

    session.sessionNotes = {
      topic: topic || session.topic,
      studentLevel: studentLevel || "Intermediate",
      problemsDiscussed: problemsDiscussed || "",
      studentStruggles: studentStruggles || "",
      recommendedPractice: recommendedPractice || "",
      nextSteps: nextSteps || ""
    };

    if (Array.isArray(actionItems) && actionItems.length > 0) {
      session.actionItems = actionItems.map(item =>
        typeof item === "string" ? { title: item, status: "pending" } : item
      );

      // Sync to candidate PreparationPlan
      try {
        const { PreparationPlan } = await import("../models/PreparationPlan.js");
        const planItems = actionItems.map(item => ({
          title: `Mentor Task: ${typeof item === "string" ? item : item.title}`,
          reason: `Assigned during session on "${session.topic}"`,
          priority: "HIGH",
          estimatedTimeMinutes: 45,
          status: "pending",
          source: "mentorship_session"
        }));

        await PreparationPlan.findOneAndUpdate(
          { userId: session.studentId, isActive: true },
          { $push: { actionItems: { $each: planItems } } },
          { upsert: true }
        );
      } catch (pErr) {
        console.warn("[PreparationPlan Sync Warning]:", pErr.message);
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: session,
      message: "Structured session notes saved and synced to student preparation plan."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Proposes or responds to session rescheduling.
 */
export const proposeRescheduleSessionController = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { proposedRescheduleAt, action } = req.body; // action: 'propose' | 'accept_reschedule' | 'decline_reschedule'
    const userId = (req.user._id || req.user.id).toString();

    const session = await MentorshipSession.findById(sessionId);
    if (!session) return next(createError(404, "Session not found."));

    const isStudent = session.studentId.toString() === userId;
    const isMentor = session.mentorId.toString() === userId;

    if (!isStudent && !isMentor) {
      return next(createError(403, "Unauthorized session rescheduling request."));
    }

    if (action === "propose") {
      if (!proposedRescheduleAt) return next(createError(400, "Proposed date/time required."));
      session.status = "reschedule_proposed";
      session.proposedRescheduleAt = new Date(proposedRescheduleAt);
      session.rescheduledBy = req.user._id;
    } else if (action === "accept_reschedule" && session.proposedRescheduleAt) {
      session.scheduledAt = session.proposedRescheduleAt;
      session.status = "scheduled";
      session.proposedRescheduleAt = undefined;
      session.rescheduledBy = undefined;
    } else if (action === "decline_reschedule") {
      session.status = "scheduled";
      session.proposedRescheduleAt = undefined;
      session.rescheduledBy = undefined;
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: session,
      message: `Session reschedule status updated to ${session.status}.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submits an appeal against account restriction or suspension.
 */
export const submitMentorAppealController = async (req, res, next) => {
  try {
    const mentorId = req.user._id || req.user.id;
    const { restrictionReason, policyInvolved, appealStatement, supportingLinks } = req.body;

    if (!appealStatement || appealStatement.trim().length < 20) {
      return next(createError(400, "Appeal statement must be at least 20 characters detailing your appeal rationale."));
    }

    const { MentorAppeal } = await import("../models/MentorAppeal.js");

    const appeal = await MentorAppeal.create({
      mentorId,
      restrictionReason: restrictionReason || "Account Restriction / Suspension",
      policyInvolved: policyInvolved || "Mentor Code of Conduct",
      appealStatement: appealStatement.trim(),
      supportingLinks: Array.isArray(supportingLinks) ? supportingLinks : [],
      status: "pending"
    });

    res.status(201).json({
      success: true,
      data: appeal,
      message: "Your appeal has been submitted to the Admin Exception Queue for formal review."
    });
  } catch (error) {
    next(error);
  }
};

