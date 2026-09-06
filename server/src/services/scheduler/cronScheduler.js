import cron from "node-cron";
import { CronLock } from "../../models/CronLock.js";
import { User } from "../../models/User.js";
import { Application } from "../../models/Application.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { createNotification } from "../notification/notificationService.js";
import { runNotificationEngine } from "../notification/notificationEngine.js";

/**
 * Acquires an idempotent cron execution lock to ensure safe multi-instance deployment.
 */
async function acquireCronLock(jobName, ttlMs = 15 * 60 * 1000) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Remove expired locks for this job
    await CronLock.deleteOne({ jobName, expiresAt: { $lt: now } });

    const lock = new CronLock({
      jobName,
      lockedAt: now,
      expiresAt,
      nodeId: process.env.NODE_ID || "node_primary"
    });

    await lock.save();
    return true; // Lock acquired successfully
  } catch (err) {
    if (err.code === 11000) {
      // Lock already held by another active node
      return false;
    }
    console.warn(`[CronLock Warning] Lock acquisition error for ${jobName}:`, err.message);
    return true; // Fallback to proceed if database lock check fails
  }
}

/**
 * Auto-Stale Application Scanner
 * Finds applications with no activity for 21+ days and queues stale suggestions.
 */
export async function runAutoStaleCheck() {
  const isLocked = await acquireCronLock("AUTO_STALE_CHECK", 60 * 60 * 1000);
  if (!isLocked) {
    console.log("[Auto-Stale Scheduler] Skipping execution (lock held by another instance).");
    return { checked: 0, queued: 0, status: "locked" };
  }

  try {
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    const inactiveApplications = await Application.find({
      status: { $nin: ["offer", "rejected", "withdrawn", "stale"] },
      $or: [
        { lastActivityAt: { $lt: twentyOneDaysAgo } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: twentyOneDaysAgo } }
      ]
    });

    let queuedCount = 0;

    for (const app of inactiveApplications) {
      const hasPendingStale = app.pendingStatusSuggestions?.some(
        (s) => s.source === "auto_stale" && s.status === "pending"
      );

      if (!hasPendingStale) {
        if (!app.pendingStatusSuggestions) app.pendingStatusSuggestions = [];
        app.pendingStatusSuggestions.push({
          suggestedStatus: "stale",
          reason: "No activity or status update recorded for 21+ days",
          source: "auto_stale",
          status: "pending",
          createdAt: new Date()
        });
        await app.save();
        queuedCount++;
      }
    }

    console.log(`[Auto-Stale Scheduler] Checked ${inactiveApplications.length} apps, queued ${queuedCount} stale suggestions.`);
    return { checked: inactiveApplications.length, queued: queuedCount };
  } catch (err) {
    console.error("[Auto-Stale Scheduler Error]:", err);
    return { error: err.message };
  }
}

/**
 * Daily Personalized Career Reminders Dispatcher
 * Sends daily actionable summary notifications to users based on their target preparation and reminders.
 */
export async function runDailyCareerReminders() {
  const isLocked = await acquireCronLock("DAILY_CAREER_REMINDERS", 30 * 60 * 1000);
  if (!isLocked) {
    console.log("[Daily Reminder Scheduler] Skipping execution (lock held by another instance).");
    return { processed: 0, sent: 0, status: "locked" };
  }

  try {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    // Fetch active users with email notifications enabled
    const activeUsers = await User.find({
      role: "student",
      "notificationPreferences.emailEnabled": { $ne: false }
    }).select("_id name email targetRoles prepReminderTime notificationPreferences").lean();

    let sentCount = 0;

    for (const user of activeUsers) {
      const plan = await PreparationPlan.findOne({ userId: user._id, isActive: true }).lean();
      const pendingTasks = (plan?.actionItems || []).filter(t => t.status === "pending" || t.completed === false);

      if (pendingTasks.length > 0) {
        const topTask = pendingTasks[0];
        const targetRole = user.targetRoles?.[0]?.title || "Software Engineer";

        await createNotification({
          userId: user._id,
          type: "PREPARATION_REMINDER",
          priority: "HIGH",
          title: "Daily Career Focus & Preparation",
          message: `Good morning! Your top priority today for ${targetRole} is: "${topTask.title}". Spend 15 minutes to stay on track.`,
          source: {
            entityType: "preparation_plan",
            entityId: plan._id.toString(),
            eventType: "DAILY_REMINDER"
          },
          action: {
            route: "/preparation",
            label: "Open Preparation Center"
          },
          dedupeKey: `PREPARATION_REMINDER:DAILY:${user._id}:${dateKey}`
        });

        sentCount++;
      }
    }

    console.log(`[Daily Reminder Scheduler] Processed ${activeUsers.length} users. Dispatched ${sentCount} daily reminders.`);
    return { processed: activeUsers.length, sent: sentCount };
  } catch (err) {
    console.error("[Daily Reminder Scheduler Error]:", err);
    return { error: err.message };
  }
}

/**
 * Initializes all central cron schedules.
 */
export function initCronScheduler() {
  console.log("[Cron Scheduler] Initializing platform background jobs...");

  // 1. Daily Auto-Stale Application Scanner (02:00 AM)
  cron.schedule("0 2 * * *", () => {
    console.log("[Cron Scheduler] Triggering daily Auto-Stale check...");
    runAutoStaleCheck();
  });

  // 2. Hourly Notification Engine Scan
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron Scheduler] Triggering hourly Notification Engine scan...");
    const stats = await runNotificationEngine();
    console.log("[Cron Scheduler] Notification Engine output:", stats);
  });

  // 3. Daily Career Reminder Dispatcher (08:00 AM)
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron Scheduler] Triggering daily career reminder dispatcher...");
    runDailyCareerReminders();
  });

  console.log("[Cron Scheduler] Active schedules: Auto-Stale (02:00 AM), Notifications (Hourly), Daily Reminders (08:00 AM).");
}
