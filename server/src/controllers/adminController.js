import { User } from "../models/User.js";
import { MentorApplication } from "../models/MentorApplication.js";
import { MentorProfile } from "../models/MentorProfile.js";
import { MentorVerification } from "../models/MentorVerification.js";
import { MentorReport } from "../models/MentorReport.js";
import { ModerationAction } from "../models/ModerationAction.js";
import MentorshipSession from "../models/MentorshipSession.js";
import { createError } from "../utils/error.js";
import { createNotification } from "../services/notification/notificationService.js";

/**
 * Gets list of pending/under-review mentor applications for admin review.
 */
export async function getPendingMentors(req, res, next) {
  try {
    const applications = await MentorApplication.find({
      status: { $in: ["pending", "under_review", "more_info_required"] }
    })
      .populate("userId", "name email avatar createdAt")
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin reviews a mentor application (approve, reject, or request more info).
 * Creates an immutable ModerationAction audit record.
 */
export async function reviewMentorApplication(req, res, next) {
  try {
    const { applicationId } = req.params;
    const { action, notes, reason } = req.body; // action: 'approve' | 'reject' | 'request_more_info'
    const adminId = req.user._id || req.user.id;

    const application = await MentorApplication.findById(applicationId);
    if (!application) {
      return next(createError(404, "Mentor application not found."));
    }

    const mentorUser = await User.findById(application.userId);
    if (!mentorUser) {
      return next(createError(404, "Associated applicant user not found."));
    }

    if (action === "approve") {
      application.status = "approved";
      application.reviewedAt = new Date();
      application.reviewedBy = adminId;
      application.reviewNotes = notes || "Approved by admin review";
      await application.save();

      mentorUser.mentorStatus = "approved";
      mentorUser.role = "mentor";
      await mentorUser.save();

      // Create or activate MentorProfile
      const profile = await MentorProfile.findOneAndUpdate(
        { userId: mentorUser._id },
        {
          userId: mentorUser._id,
          professionalName: application.professionalName,
          headline: application.headline,
          currentRole: application.currentRole,
          company: application.company,
          experienceYears: application.experienceYears,
          skills: application.skills,
          expertiseAreas: application.expertiseAreas,
          mentoringTopics: application.mentoringTopics,
          languages: application.languages,
          bio: application.bio,
          portfolioUrl: application.portfolioUrl,
          githubUrl: application.githubUrl,
          linkedinUrl: application.linkedinUrl,
          isActive: true
        },
        { upsert: true, new: true }
      );

      mentorUser.mentorProfileId = profile._id;
      await mentorUser.save();

      // Log Moderation Audit Action
      await ModerationAction.create({
        adminId,
        targetUserId: mentorUser._id,
        actionType: "approve_application",
        reason: reason || notes || "Application approved after credentials review",
        metadata: { applicationId, mentorProfileId: profile._id }
      });

      await createNotification({
        userId: mentorUser._id,
        type: "MENTOR_ACCEPTED",
        title: "Mentor Application Approved! 🎉",
        message: `Congratulations ${application.professionalName}! Your application to join Mentor Connect has been approved. You can now accept student bookings.`,
        actionUrl: "/mentor/dashboard"
      }).catch(() => {});

    } else if (action === "reject") {
      application.status = "rejected";
      application.reviewedAt = new Date();
      application.reviewedBy = adminId;
      application.reviewNotes = notes || reason || "Application rejected";
      await application.save();

      mentorUser.mentorStatus = "rejected";
      await mentorUser.save();

      await ModerationAction.create({
        adminId,
        targetUserId: mentorUser._id,
        actionType: "reject_application",
        reason: reason || notes || "Application rejected after evaluation",
        metadata: { applicationId }
      });

      await createNotification({
        userId: mentorUser._id,
        type: "MENTOR_REJECTED",
        title: "Mentor Application Status Update",
        message: `Your application status has been updated to rejected. Notes: ${notes || "Does not meet current verification criteria."}`,
        actionUrl: "/mentor/dashboard"
      }).catch(() => {});

    } else if (action === "request_more_info") {
      application.status = "more_info_required";
      application.moreInfoReason = reason || notes || "";
      await application.save();

      await ModerationAction.create({
        adminId,
        targetUserId: mentorUser._id,
        actionType: "request_more_info",
        reason: reason || notes || "Additional credentials requested",
        metadata: { applicationId }
      });
    }

    res.status(200).json({
      success: true,
      data: application,
      message: `Mentor application ${action}d successfully.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates granular verification signals (identity, employment, expertise).
 */
export async function updateMentorVerification(req, res, next) {
  try {
    const { mentorId } = req.params;
    const { identityStatus, employmentStatus, expertiseStatus, notes } = req.body;
    const adminId = req.user._id || req.user.id;

    const mentorUser = await User.findById(mentorId);
    if (!mentorUser) return next(createError(404, "Mentor user not found."));

    const updateObj = { verifiedBy: adminId, lastVerifiedAt: new Date() };
    if (identityStatus) updateObj.identityStatus = identityStatus;
    if (employmentStatus) updateObj.employmentStatus = employmentStatus;
    if (expertiseStatus) updateObj.expertiseStatus = expertiseStatus;

    const verif = await MentorVerification.findOneAndUpdate(
      { userId: mentorId },
      updateObj,
      { upsert: true, new: true }
    );

    // Audit log
    await ModerationAction.create({
      adminId,
      targetUserId: mentorId,
      actionType: "verify_identity",
      reason: notes || "Updated granular verification signals",
      metadata: updateObj
    });

    res.status(200).json({
      success: true,
      data: verif,
      message: "Granular verification signals updated."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Suspends a mentor, deactivates profile, and auto-cancels upcoming sessions.
 */
export async function suspendMentor(req, res, next) {
  try {
    const { mentorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id || req.user.id;

    if (!reason) return next(createError(400, "Reason for suspension is required."));

    const mentorUser = await User.findById(mentorId);
    if (!mentorUser) return next(createError(404, "Mentor user not found."));

    mentorUser.mentorStatus = "suspended";
    await mentorUser.save();

    await MentorProfile.findOneAndUpdate({ userId: mentorId }, { isActive: false });

    // Cancel future active sessions
    const cancelledSessions = await MentorshipSession.updateMany(
      { mentorId, status: { $in: ["requested", "accepted", "scheduled"] } },
      { status: "cancelled", cancellationReason: `Session cancelled due to mentor account suspension: ${reason}` }
    );

    await ModerationAction.create({
      adminId,
      targetUserId: mentorId,
      actionType: "suspend_mentor",
      reason,
      metadata: { cancelledSessionsCount: cancelledSessions.modifiedCount }
    });

    await createNotification({
      userId: mentorId,
      type: "SYSTEM",
      title: "Mentor Account Suspended",
      message: `Your mentor status has been suspended. Reason: ${reason}`,
      actionUrl: "/mentor/dashboard"
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Mentor suspended successfully. ${cancelledSessions.modifiedCount} future sessions cancelled.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets student reports against mentors.
 */
export async function getMentorReports(req, res, next) {
  try {
    const reports = await MentorReport.find()
      .populate("reporterId", "name email")
      .populate("mentorId", "name email mentorProfile")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolves or dismisses a student report.
 */
export async function resolveMentorReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const { status, actionTaken } = req.body;
    const adminId = req.user._id || req.user.id;

    const report = await MentorReport.findById(reportId);
    if (!report) return next(createError(404, "Report not found."));

    report.status = status || "resolved";
    report.actionTaken = actionTaken || "Reviewed by admin";
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    await report.save();

    await ModerationAction.create({
      adminId,
      targetUserId: report.mentorId,
      actionType: status === "dismissed" ? "dismiss_report" : "resolve_report",
      reason: actionTaken || "Report resolved by moderation team",
      metadata: { reportId }
    });

    res.status(200).json({
      success: true,
      data: report,
      message: `Report ${report.status} successfully.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin endpoint to manually trigger Daily Career Reminders scheduler for testing.
 */
export async function triggerDailyReminders(req, res, next) {
  try {
    const { runDailyCareerReminders } = await import("../services/scheduler/cronScheduler.js");
    const result = await runDailyCareerReminders();
    res.status(200).json({
      success: true,
      message: "Daily career reminders job executed manually.",
      result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin endpoint to manually trigger Auto-Stale Application check for testing.
 */
export async function triggerAutoStaleCheck(req, res, next) {
  try {
    const { runAutoStaleCheck } = await import("../services/scheduler/cronScheduler.js");
    const result = await runAutoStaleCheck();
    res.status(200).json({
      success: true,
      message: "Auto-stale application check executed manually.",
      result
    });
  } catch (error) {
    next(error);
  }
}
