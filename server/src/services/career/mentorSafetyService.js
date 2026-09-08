import { MentorReport } from "../../models/MentorReport.js";
import MentorshipSession from "../../models/MentorshipSession.js";
import { MentorshipReview } from "../../models/MentorshipReview.js";
import { User } from "../../models/User.js";
import { MentorProfile } from "../../models/MentorProfile.js";
import { ModerationAction } from "../../models/ModerationAction.js";
import { createNotification } from "../notification/notificationService.js";

/**
 * Runs automated safety audit for a mentor.
 * Detects anomalies: cancellation spike, no-shows, negative review clusters, or student complaints.
 * ENFORCES MANDATORY AI SAFETY RULE:
 * AI / Automated system creates REVIEW_REQUIRED flag for Admin Exception Queue; NEVER deletes account automatically.
 */
export async function runMentorSafetyAudit(mentorUserId) {
  const mentorUser = await User.findById(mentorUserId);
  if (!mentorUser || ["suspended", "rejected"].includes(mentorUser.mentorStatus)) {
    return { status: "CLEAN", anomalies: [] };
  }

  const anomalies = [];

  // 1. Check Student Complaints
  const pendingReportsCount = await MentorReport.countDocuments({
    mentorId: mentorUserId,
    status: { $in: ["pending", "under_investigation"] }
  });
  if (pendingReportsCount >= 2) {
    anomalies.push({
      type: "MULTIPLE_COMPLAINTS",
      severity: "HIGH",
      details: `${pendingReportsCount} pending student reports filed against this mentor.`
    });
  }

  // 2. Check Session Cancellation Rate
  const totalSessions = await MentorshipSession.countDocuments({ mentorId: mentorUserId });
  if (totalSessions >= 5) {
    const cancelledByMentor = await MentorshipSession.countDocuments({
      mentorId: mentorUserId,
      status: "cancelled",
      cancelledBy: mentorUserId
    });
    const cancelRate = (cancelledByMentor / totalSessions) * 100;
    if (cancelRate > 30) {
      anomalies.push({
        type: "HIGH_CANCELLATION_RATE",
        severity: "MEDIUM",
        details: `Mentor cancelled ${cancelledByMentor}/${totalSessions} sessions (${cancelRate.toFixed(1)}%).`
      });
    }

    // 3. Check No-Show Rate
    const missedByMentor = await MentorshipSession.countDocuments({
      mentorId: mentorUserId,
      isNoShow: "mentor"
    });
    const noShowRate = (missedByMentor / totalSessions) * 100;
    if (noShowRate > 15 || missedByMentor >= 2) {
      anomalies.push({
        type: "MENTOR_NO_SHOW_SPIKE",
        severity: "HIGH",
        details: `Mentor missed ${missedByMentor} sessions without prior notice (${noShowRate.toFixed(1)}%).`
      });
    }
  }

  // 4. Check Low Review Clusters
  const recentReviews = await MentorshipReview.find({ mentorId: mentorUserId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const lowReviews = recentReviews.filter(r => r.rating <= 2);
  if (lowReviews.length >= 2) {
    anomalies.push({
      type: "LOW_RATING_CLUSTER",
      severity: "MEDIUM",
      details: `${lowReviews.length} of recent 5 reviews rated 2 stars or lower.`
    });
  }

  // Action Logic
  if (anomalies.length > 0) {
    const hasHighSeverity = anomalies.some(a => a.severity === "HIGH");

    if (hasHighSeverity && mentorUser.mentorStatus !== "restricted") {
      mentorUser.mentorStatus = "restricted";
      await mentorUser.save();

      await MentorProfile.findOneAndUpdate(
        { userId: mentorUserId },
        { reputationStatus: "restricted" }
      );

      // Audit Log for Exception Queue
      await ModerationAction.create({
        adminId: mentorUserId, // Automated system entry
        targetUserId: mentorUserId,
        actionType: "suspend_mentor", // Flagged for review
        reason: `Automated Safety System flagged anomalies: ${anomalies.map(a => a.type).join(", ")}. Status set to RESTRICTED for Admin Exception Review.`,
        metadata: { anomalies, requiresAdminReview: true }
      });

      await createNotification({
        userId: mentorUserId,
        type: "SYSTEM",
        title: "Account Status Update: Restricted for Review ⚠️",
        message: "Your mentor account has been temporarily restricted due to session anomalies or complaints. An admin will review your profile.",
        actionUrl: "/mentor/appeals"
      }).catch(() => {});
    }

    return {
      status: "REVIEW_REQUIRED",
      anomalies,
      restricted: hasHighSeverity
    };
  }

  return { status: "CLEAN", anomalies: [] };
}
