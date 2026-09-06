import MentorshipSession from "../../models/MentorshipSession.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { MatchResult } from "../../models/MatchResult.js";
import { Application } from "../../models/Application.js";
import { User } from "../../models/User.js";
import { createNotification } from "./notificationService.js";

/**
 * Runs the deterministic rule engine to generate real notifications.
 */
export async function runNotificationEngine() {
  const generatedCount = {
    actionRequired: 0,
    opportunity: 0,
    interview: 0,
    learning: 0,
    progress: 0
  };

  try {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    // -------------------------------------------------------------------------
    // 1. ACTION REQUIRED
    // Rule: Application in 'applied' status with no activity for > 8 days.
    // -------------------------------------------------------------------------
    const staleApplications = await Application.find({
      status: "applied",
      $or: [
        { lastActivityAt: { $lt: eightDaysAgo } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: eightDaysAgo } }
      ]
    }).populate("jobId").lean();

    for (const app of staleApplications) {
      const companyName = app.jobId?.company || app.company || "a company";
      const ruleVersion = "v1";
      await createNotification({
        userId: app.userId,
        type: "ACTION_REQUIRED",
        priority: "HIGH",
        title: "Application Follow-up Required",
        message: `Your application at ${companyName} has been in 'Applied' status for over 8 days. Consider following up.`,
        source: {
          entityType: "application",
          entityId: app._id.toString(),
          eventType: "APPLICATION_STALE"
        },
        action: {
          route: `/applications/${app._id}`,
          label: "Review Application"
        },
        dedupeKey: `ACTION_REQUIRED:APPLICATION_STALE:${app._id}:${ruleVersion}`
      });
      generatedCount.actionRequired++;
    }

    // -------------------------------------------------------------------------
    // 2. OPPORTUNITY
    // Rule: Job match score >= 85 (or existing 'highMatch' logic)
    // -------------------------------------------------------------------------
    // Instead of querying every single job, we query recently generated match results.
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const highMatches = await MatchResult.find({
      overallScore: { $gte: 85 },
      createdAt: { $gte: twoDaysAgo }
    }).populate("jobId").lean();

    for (const match of highMatches) {
      if (!match.jobId) continue;
      await createNotification({
        userId: match.userId,
        type: "OPPORTUNITY",
        priority: "MEDIUM",
        title: "New Job Match Found",
        message: `We found a strong (${match.overallScore}%) match for you: ${match.jobId.title} at ${match.jobId.company}.`,
        source: {
          entityType: "job_match",
          entityId: match._id.toString(),
          eventType: "HIGH_MATCH_FOUND"
        },
        action: {
          route: `/jobs/${match.jobId._id}`,
          label: "View Job"
        },
        dedupeKey: `OPPORTUNITY:HIGH_MATCH:${match.userId}:${match.jobId._id}`
      });
      generatedCount.opportunity++;
    }

    // -------------------------------------------------------------------------
    // 3. INTERVIEW
    // Rule: Interview / Mentorship session starting soon (24h or 1h)
    // -------------------------------------------------------------------------
    const activeMentorSessions = await MentorshipSession.find({
      status: "scheduled",
      scheduledAt: { $gte: now }
    }).lean();

    for (const session of activeMentorSessions) {
      const scheduledTime = new Date(session.scheduledAt).getTime();
      const diffHours = (scheduledTime - now.getTime()) / (1000 * 60 * 60);
      
      let windowLabel = null;
      if (diffHours >= 23 && diffHours <= 25) windowLabel = "24h";
      else if (diffHours >= 0.5 && diffHours <= 1.5) windowLabel = "1h";

      if (windowLabel) {
        // Notify Student
        await createNotification({
          userId: session.studentId,
          type: "INTERVIEW",
          priority: "HIGH",
          title: `Upcoming Session in ${windowLabel}`,
          message: `Your session on "${session.topic}" is scheduled to start in approx ${windowLabel}.`,
          source: {
            entityType: "mentor_session",
            entityId: session._id.toString(),
            eventType: "SESSION_REMINDER"
          },
          action: {
            route: `/mentor/session/${session._id}`,
            label: "View Session"
          },
          dedupeKey: `INTERVIEW:REMINDER:${session._id}:student:${windowLabel}`
        });

        // Notify Mentor
        await createNotification({
          userId: session.mentorId,
          type: "INTERVIEW",
          priority: "MEDIUM",
          title: `Upcoming Mentorship Session in ${windowLabel}`,
          message: `You have a mentorship session in approx ${windowLabel} regarding "${session.topic}".`,
          source: {
            entityType: "mentor_session",
            entityId: session._id.toString(),
            eventType: "SESSION_REMINDER"
          },
          action: {
            route: `/mentor/dashboard`,
            label: "View Dashboard"
          },
          dedupeKey: `INTERVIEW:REMINDER:${session._id}:mentor:${windowLabel}`
        });

        generatedCount.interview += 2;
      }
    }

    // -------------------------------------------------------------------------
    // 4. LEARNING
    // Rule: Detected a recurring skill gap from a recent match or prep plan
    // -------------------------------------------------------------------------
    const incompletePlans = await PreparationPlan.find({ isActive: true }).lean();
    for (const plan of incompletePlans) {
      const items = plan.actionItems || [];
      const pendingCount = items.filter((t) => t.status === "pending" || t.completed === false).length;
      if (pendingCount > 0) {
        await createNotification({
          userId: plan.userId,
          type: "LEARNING",
          priority: "LOW",
          title: "Preparation Tasks Pending",
          message: `You have ${pendingCount} incomplete preparation tasks. Spending 15 minutes today can boost your readiness.`,
          source: {
            entityType: "preparation_plan",
            entityId: plan._id.toString(),
            eventType: "PENDING_TASKS"
          },
          action: {
            route: "/preparation",
            label: "Resume Preparation"
          },
          dedupeKey: `LEARNING:PREP_PENDING:${plan.userId}:${dateKey}` // Daily trigger if still pending
        });
        generatedCount.learning++;
      }
    }

    // We can also reuse the skill gap from matches
    for (const match of highMatches) {
      const missing = match.missingSkills || match.criticalGaps || [];
      const topGap = missing[0];
      if (topGap) {
        await createNotification({
          userId: match.userId,
          type: "LEARNING",
          priority: "MEDIUM",
          title: "Skill Gap Detected",
          message: `Your recent job match revealed a potential gap in "${topGap}". Consider practicing this topic.`,
          source: {
            entityType: "skill_gap",
            entityId: match._id.toString(),
            eventType: "SKILL_GAP_DETECTED"
          },
          action: {
            route: "/preparation",
            label: "Practice Skill"
          },
          dedupeKey: `LEARNING:SKILL_GAP:${match.userId}:${topGap.toLowerCase().replace(/\s+/g, "_")}`
        });
        generatedCount.learning++;
      }
    }

    // -------------------------------------------------------------------------
    // 5. PROGRESS
    // Rule: User's readinessScore history shows a recent improvement.
    // -------------------------------------------------------------------------
    // Find users with recent readinessScore changes. This is a naive check; 
    // a real production scenario might run a dedicated aggregation job.
    // We'll simulate fetching users who had a readinessHistory update in the last 2 days.
    const recentProgressUsers = await User.find({
      "readinessHistory.date": { $gte: twoDaysAgo }
    }).select("readinessScore readinessHistory").lean();

    for (const user of recentProgressUsers) {
      if (!user.readinessHistory || user.readinessHistory.length < 2) continue;
      
      const history = user.readinessHistory.sort((a, b) => b.date - a.date);
      const latest = history[0].score;
      const previous = history[1].score;

      // Only notify if there is a meaningful improvement (e.g. >= 5 points)
      if (latest - previous >= 5) {
        await createNotification({
          userId: user._id,
          type: "PROGRESS",
          priority: "LOW",
          title: "Readiness Score Improved!",
          message: `Great job! Your readiness score has improved from ${previous}% to ${latest}% due to your recent activity.`,
          source: {
            entityType: "user_readiness",
            entityId: user._id.toString(),
            eventType: "READINESS_IMPROVED"
          },
          metadata: {
            metric: "readinessScore",
            previousValue: previous,
            currentValue: latest,
            period: "recent"
          },
          action: {
            route: "/dashboard",
            label: "View Dashboard"
          },
          dedupeKey: `PROGRESS:READINESS:${user._id}:${latest}`
        });
        generatedCount.progress++;
      }
    }

    return generatedCount;
  } catch (error) {
    console.error("[NotificationEngine] Error running engine rules:", error);
    return generatedCount;
  }
}
