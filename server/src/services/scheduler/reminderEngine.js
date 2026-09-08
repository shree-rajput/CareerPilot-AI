import crypto from "crypto";
import { Application } from "../../models/Application.js";
import { ReminderRecord } from "../../models/ReminderRecord.js";
import { createNotification } from "../notification/notificationService.js";

export const REMINDER_POLICY = {
  appliedFollowUpDays: 7,
  secondFollowUpDays: 14,
  oaReminderHours: 24,
  interviewPrepHours: 24,
  interviewDayHours: 1,
  offerActionDays: 3,
};

export function generateReminderId(applicationId, reminderType, dateStr) {
  const payload = `${applicationId.toString()}_${reminderType}_${dateStr}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function cancelObsoleteReminders(applicationId, newStatus) {
  const obsoleteTypes = [];
  if (["interview", "offer", "rejected", "withdrawn"].includes(newStatus)) {
    obsoleteTypes.push("FOLLOW_UP", "SECOND_FOLLOW_UP", "OA_DEADLINE");
  }
  if (["offer", "rejected", "withdrawn"].includes(newStatus)) {
    obsoleteTypes.push("INTERVIEW_PREP", "INTERVIEW_DAY");
  }
  if (["rejected", "withdrawn"].includes(newStatus)) {
    obsoleteTypes.push("OFFER_ACTION");
  }

  if (obsoleteTypes.length > 0) {
    await ReminderRecord.updateMany(
      {
        applicationId,
        reminderType: { $in: obsoleteTypes },
        status: { $in: ["pending", "scheduled", "snoozed"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelReason: `Application status transitioned to '${newStatus}'`,
        },
      }
    );
  }
}

export async function evaluateAndScheduleReminders(userId) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const query = userId ? { userId, status: { $nin: ["rejected", "withdrawn"] } } : { status: { $nin: ["rejected", "withdrawn"] } };
  const applications = await Application.find(query);

  let createdCount = 0;
  let deliveredCount = 0;

  for (const app of applications) {
    const lastActivity = app.lastActivityAt ? new Date(app.lastActivityAt) : new Date(app.updatedAt);
    const company = app.company || "Company";
    const role = app.role || "Role";
    const appUserId = app.userId;

    await cancelObsoleteReminders(app._id, app.status);

    const candidates = [];

    // Rule 1: APPLIED -> FOLLOW_UP (after 7 days without update)
    if (app.status === "applied") {
      const daysInactive = (now - lastActivity) / (1000 * 60 * 60 * 24);
      if (daysInactive >= REMINDER_POLICY.appliedFollowUpDays && daysInactive < REMINDER_POLICY.secondFollowUpDays) {
        candidates.push({
          type: "FOLLOW_UP",
          priority: "MEDIUM",
          reason: `No update on application for ${Math.floor(daysInactive)} days`,
          title: `Follow Up: ${role} at ${company}`,
          message: `Your application for ${role} at ${company} has had no update for ${Math.floor(daysInactive)} days. Consider sending a concise follow-up.`,
          actionRoute: `/applications/${app._id}`,
          actionLabel: "View Application & Follow Up",
        });
      } else if (daysInactive >= REMINDER_POLICY.secondFollowUpDays) {
        candidates.push({
          type: "SECOND_FOLLOW_UP",
          priority: "HIGH",
          reason: `No update on application for ${Math.floor(daysInactive)} days (2nd follow up)`,
          title: `2nd Follow Up: ${role} at ${company}`,
          message: `Your application for ${role} at ${company} has been pending for over 2 weeks. Time for a 2nd check-in or status update.`,
          actionRoute: `/applications/${app._id}`,
          actionLabel: "View Application & Follow Up",
        });
      }
    }

    // Rule 2: OA -> OA_DEADLINE
    if (app.status === "oa") {
      candidates.push({
        type: "OA_DEADLINE",
        priority: "URGENT",
        reason: `Pending Online Assessment for ${company}`,
        title: `Online Assessment: ${role} at ${company}`,
        message: `Online Assessment pending for ${role} at ${company}. Allocate focused time today to complete it.`,
        actionRoute: `/applications/${app._id}`,
        actionLabel: "Open Assessment Details",
      });
    }

    // Rule 3: INTERVIEW -> INTERVIEW_PREP / INTERVIEW_DAY
    if (app.status === "interview") {
      const interviewDate = app.interviewDate ? new Date(app.interviewDate) : null;
      if (interviewDate) {
        const hoursUntilInterview = (interviewDate - now) / (1000 * 60 * 60);
        if (hoursUntilInterview > 0 && hoursUntilInterview <= REMINDER_POLICY.interviewPrepHours) {
          if (hoursUntilInterview <= REMINDER_POLICY.interviewDayHours) {
            candidates.push({
              type: "INTERVIEW_DAY",
              priority: "URGENT",
              reason: `Interview scheduled in ${Math.round(hoursUntilInterview * 60)} minutes`,
              title: `Interview Today: ${role} at ${company}`,
              message: `Your interview for ${role} at ${company} is starting soon! Get ready.`,
              actionRoute: `/preparation`,
              actionLabel: "Open Interview Dashboard",
            });
          } else {
            candidates.push({
              type: "INTERVIEW_PREP",
              priority: "HIGH",
              reason: `Interview scheduled within 24 hours`,
              title: `Interview Prep: ${role} at ${company}`,
              message: `Upcoming interview for ${role} at ${company} tomorrow. Spend 45 minutes practicing.`,
              actionRoute: `/preparation`,
              actionLabel: "Launch AI Mock Interview",
            });
          }
        }
      } else {
        candidates.push({
          type: "INTERVIEW_PREP",
          priority: "HIGH",
          reason: `Interview scheduled without fixed date`,
          title: `Interview Prep: ${role} at ${company}`,
          message: `Interview upcoming for ${role} at ${company}. Review DSA trade-offs and project architecture.`,
          actionRoute: `/preparation`,
          actionLabel: "Launch AI Mock Interview",
        });
      }
    }

    // Rule 4: OFFER -> OFFER_ACTION
    if (app.status === "offer") {
      const daysSinceOffer = (now - lastActivity) / (1000 * 60 * 60 * 24);
      if (daysSinceOffer >= REMINDER_POLICY.offerActionDays) {
        candidates.push({
          type: "OFFER_ACTION",
          priority: "HIGH",
          reason: `Offer pending response for ${Math.floor(daysSinceOffer)} days`,
          title: `Pending Offer Decision: ${role} at ${company}`,
          message: `You received an offer from ${company}. Review terms and prepare your response.`,
          actionRoute: `/applications/${app._id}`,
          actionLabel: "Review Offer Details",
        });
      }
    }

    // Process candidate reminders
    for (const cand of candidates) {
      const reminderId = generateReminderId(app._id, cand.type, todayStr);

      let record = await ReminderRecord.findOne({ reminderId });
      if (!record) {
        record = await ReminderRecord.create({
          reminderId,
          userId: appUserId,
          applicationId: app._id,
          reminderType: cand.type,
          scheduledAt: now,
          status: "scheduled",
          priority: cand.priority,
          reason: cand.reason,
          metadata: {
            company,
            role,
            actionRoute: cand.actionRoute,
            actionLabel: cand.actionLabel,
          },
        });
        createdCount++;
      }

      if (record.status === "snoozed" && record.snoozedUntil && new Date(record.snoozedUntil) > now) {
        continue;
      }

      if (["scheduled", "pending", "snoozed"].includes(record.status)) {
        const notif = await createNotification({
          userId: appUserId,
          type: "APPLICATION_REMINDER",
          priority: cand.priority,
          title: cand.title,
          message: cand.message,
          source: {
            entityType: "application",
            entityId: app._id.toString(),
            eventType: cand.type,
          },
          action: {
            route: cand.actionRoute,
            label: cand.actionLabel,
          },
          dedupeKey: `REMINDER:${reminderId}`,
        }).catch(() => null);

        record.status = "delivered";
        record.deliveredAt = new Date();
        if (notif?._id) record.notificationId = notif._id;
        await record.save();

        app.nextActionAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        app.reminderState = cand.type.toLowerCase().includes("follow")
          ? "follow_up_pending"
          : cand.type.toLowerCase().includes("oa")
          ? "oa_reminded"
          : "interview_reminded";
        await app.save();

        deliveredCount++;
      }
    }
  }

  return { checked: applications.length, createdCount, deliveredCount };
}

export const runSmartApplicationReminders = evaluateAndScheduleReminders;
