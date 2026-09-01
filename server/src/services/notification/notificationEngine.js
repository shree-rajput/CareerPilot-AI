import MentorshipSession from "../../models/MentorshipSession.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { MatchResult } from "../../models/MatchResult.js";
import { User } from "../../models/User.js";
import { createNotification } from "./notificationService.js";

/**
 * Runs the deterministic rule engine to generate real notifications.
 */
export async function runNotificationEngine() {
  const generatedCount = {
    mentorReminders: 0,
    prepReminders: 0,
    skillGapReminders: 0
  };

  try {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    // 1. Mentorship Session Reminders (24h and 1h upcoming)
    const activeMentorSessions = await MentorshipSession.find({
      status: "scheduled",
      scheduledAt: { $gte: now }
    }).lean();

    for (const session of activeMentorSessions) {
      const scheduledTime = new Date(session.scheduledAt).getTime();
      const diffHours = (scheduledTime - now.getTime()) / (1000 * 60 * 60);

      // 24-hour reminder window (between 23h and 25h)
      if (diffHours >= 23 && diffHours <= 25) {
        // Notify Student
        await createNotification({
          userId: session.studentId,
          type: "MENTOR_SESSION_REMINDER",
          title: "Upcoming Mentorship Session",
          message: `Your session on "${session.topic}" is scheduled for tomorrow at ${new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          entityType: "mentor_session",
          entityId: session._id.toString(),
          actionUrl: `/mentor/session/${session._id}`,
          idempotencyKey: `mentor_24h_student_${session._id}_${dateKey}`
        });

        // Notify Mentor
        await createNotification({
          userId: session.mentorId,
          type: "MENTOR_SESSION_REMINDER",
          title: "Upcoming Student Session",
          message: `You have a mentorship session tomorrow regarding "${session.topic}".`,
          entityType: "mentor_session",
          entityId: session._id.toString(),
          actionUrl: `/mentor/dashboard`,
          idempotencyKey: `mentor_24h_mentor_${session._id}_${dateKey}`
        });

        generatedCount.mentorReminders += 2;
      }

      // 1-hour reminder window (between 0.5h and 1.5h)
      if (diffHours >= 0.5 && diffHours <= 1.5) {
        await createNotification({
          userId: session.studentId,
          type: "MENTOR_SESSION_REMINDER",
          title: "Mentorship Session Starting Soon",
          message: `Your session on "${session.topic}" starts in less than an hour! Click to join room.`,
          entityType: "mentor_session",
          entityId: session._id.toString(),
          actionUrl: `/mentor/session/${session._id}`,
          idempotencyKey: `mentor_1h_student_${session._id}_${dateKey}`
        });

        await createNotification({
          userId: session.mentorId,
          type: "MENTOR_SESSION_REMINDER",
          title: "Student Session Starting Soon",
          message: `Your session on "${session.topic}" starts in less than an hour! Click to view dashboard.`,
          entityType: "mentor_session",
          entityId: session._id.toString(),
          actionUrl: `/mentor/dashboard`,
          idempotencyKey: `mentor_1h_mentor_${session._id}_${dateKey}`
        });

        generatedCount.mentorReminders += 2;
      }
    }

    // 2. Incomplete Preparation Plan Reminders
    const incompletePlans = await PreparationPlan.find({
      "dailyTasks.completed": false
    }).lean();

    for (const plan of incompletePlans) {
      const pendingCount = plan.dailyTasks.filter((t) => !t.completed).length;
      if (pendingCount > 0) {
        await createNotification({
          userId: plan.userId,
          type: "PREPARATION_REMINDER",
          title: "Preparation Checklist Pending",
          message: `You have ${pendingCount} incomplete preparation tasks waiting on your dashboard.`,
          entityType: "preparation",
          entityId: plan._id.toString(),
          actionUrl: "/preparation",
          idempotencyKey: `prep_pending_${plan.userId}_${dateKey}`
        });
        generatedCount.prepReminders++;
      }
    }

    // 3. Significant Skill Gap Reminders from Job Matches
    const highMatches = await MatchResult.find({
      score: { $gte: 70 },
      "gapAnalysis.missingSkills": { $exists: true, $not: { $size: 0 } }
    }).sort({ createdAt: -1 }).limit(20).lean();

    for (const match of highMatches) {
      const topGap = match.gapAnalysis?.missingSkills?.[0];
      if (topGap) {
        await createNotification({
          userId: match.userId,
          type: "SKILL_GAP",
          title: "Target Skill Gap Identified",
          message: `Your match for target role indicates a gap in "${topGap}". Consider adding a targeted practice module.`,
          entityType: "skill",
          entityId: match.jobId ? match.jobId.toString() : "",
          actionUrl: "/preparation",
          idempotencyKey: `skill_gap_${match.userId}_${topGap}_${dateKey}`
        });
        generatedCount.skillGapReminders++;
      }
    }

    return generatedCount;
  } catch (error) {
    console.error("[NotificationEngine] Error running engine rules:", error);
    return generatedCount;
  }
}
