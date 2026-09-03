import cron from "node-cron";
import { Application } from "../models/Application.js";

/**
 * Auto-Stale Scheduler
 * Runs daily at 02:00 AM server time.
 * Finds active applications with no activity for 21+ days.
 * Pushes a suggestion to `pendingStatusSuggestions` (NEVER auto-applies silently).
 */

export async function runAutoStaleCheck() {
  try {
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    const inactiveApplications = await Application.find({
      status: { $nin: ["offer", "rejected", "withdrawn", "stale"] },
      $or: [
        { lastActivityAt: { $lt: twentyOneDaysAgo } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: twentyOneDaysAgo } },
      ],
    });

    let queuedCount = 0;

    for (const app of inactiveApplications) {
      // Check if there is already an unhandled auto_stale suggestion
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
          createdAt: new Date(),
        });
        await app.save();
        queuedCount++;
      }
    }

    console.log(`[Auto-Stale Scheduler] Checked ${inactiveApplications.length} applications. Queued ${queuedCount} stale suggestions.`);
    return { checked: inactiveApplications.length, queued: queuedCount };
  } catch (err) {
    console.error("[Auto-Stale Scheduler Error]:", err);
  }
}

export function initStaleScheduler() {
  // Schedule daily at 2:00 AM
  cron.schedule("0 2 * * *", () => {
    console.log("[Auto-Stale Scheduler] Running scheduled daily check...");
    runAutoStaleCheck();
  });
  console.log("[Auto-Stale Scheduler] Cron job initialized (runs daily at 02:00 AM).");
}
