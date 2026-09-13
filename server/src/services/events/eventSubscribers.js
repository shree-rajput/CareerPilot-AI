import { domainEvents, DOMAIN_EVENTS } from "./domainEvents.js";
import { UserSkill } from "../../models/UserSkill.js";
import { createNotification } from "../notification/notificationService.js";
import { updateUserReadinessScore } from "../career/readinessService.js";

/**
 * Registers global event subscribers for decoupled feature communication.
 */
export function registerEventSubscribers() {
  // 1. Application Interview Scheduled
  domainEvents.on(DOMAIN_EVENTS.APPLICATION_INTERVIEW_SCHEDULED, async (payload) => {
    try {
      const { userId, applicationId, company, role } = payload;
      if (!userId) return;

      // Send In-App Notification via service (idempotency + socket emit)
      // dedupeKey prevents double notification if controller already created one for this transition
      await createNotification({
        userId,
        type: "INTERVIEW",
        priority: "HIGH",
        title: `Interview Scheduled: ${company}`,
        message: `Your interview for ${role || "Software Engineer"} at ${company} has been scheduled. Check your Preparation Plan to focus on required skills!`,
        source: {
          entityType: "application",
          entityId: applicationId?.toString() || "",
          eventType: "INTERVIEW_SCHEDULED"
        },
        action: {
          route: applicationId ? `/applications/${applicationId}` : "/preparation",
          label: "View Preparation Plan"
        },
        // Deterministic: dedupeKey is the same as what the controller creates for interview transition,
        // so only ONE notification is created regardless of which path fires first.
        dedupeKey: `status-change:${applicationId}:oa:interview`
      }).catch(err => console.warn("[EventSubscriber] Interview notification failed:", err.message));

      // Recalculate candidate readiness score
      await updateUserReadinessScore(userId, `Interview scheduled at ${company}`).catch(() => { });
    } catch (err) {
      console.error("[EventSubscriber] Error handling APPLICATION_INTERVIEW_SCHEDULED:", err.message);
    }
  });

  // 2. Interview Completed
  domainEvents.on(DOMAIN_EVENTS.INTERVIEW_COMPLETED, async (payload) => {
    try {
      const { userId, sessionId, overallScore, weakTopics = [] } = payload;
      if (!userId) return;

      // Update UserSkill records for weak topics identified during interview
      for (const topic of weakTopics) {
        if (!topic) continue;
        const canonicalName = String(topic).trim();
        await UserSkill.findOneAndUpdate(
          { userId, canonicalName },
          {
            $set: {
              priority: "high",
              lastUpdated: new Date()
            },
            $push: {
              evidence: {
                description: `Depth gap detected in recent mock interview evaluation`,
                source: "interview",
                date: new Date(),
                weight: 1.5
              }
            }
          },
          { upsert: true }
        ).catch(() => { });
      }

      // Notify candidate of report availability via service (idempotency + socket emit)
      await createNotification({
        userId,
        type: "INTERVIEW",
        priority: "MEDIUM",
        title: `Interview Report Ready`,
        message: `Your mock interview evaluation is complete. Overall Score: ${overallScore || 0}/100.`,
        source: {
          entityType: "interview_session",
          entityId: sessionId?.toString() || "",
          eventType: "INTERVIEW_COMPLETED"
        },
        action: {
          route: sessionId ? `/interview/${sessionId}/report` : "/interview-history",
          label: "View Report"
        },
        dedupeKey: `interview-completed:${sessionId || userId}`
      }).catch(() => { });

      // Recalculate readiness score
      await updateUserReadinessScore(userId, "Mock interview completed").catch(() => { });
    } catch (err) {
      console.error("[EventSubscriber] Error handling INTERVIEW_COMPLETED:", err.message);
    }
  });

  // 3. Project Created
  domainEvents.on(DOMAIN_EVENTS.PROJECT_CREATED, async (payload) => {
    try {
      const { userId, name, technologies = [] } = payload;
      if (!userId) return;

      for (const tech of technologies) {
        if (!tech) continue;
        const canonicalName = String(tech).trim();
        await UserSkill.findOneAndUpdate(
          { userId, canonicalName },
          {
            $setOnInsert: {
              category: "technical",
              status: "IN_PROGRESS",
              priority: "medium",
              proficiency: 40,
              provenance: "DERIVED"
            },
            $push: {
              evidence: {
                description: `Used in project: ${name}`,
                source: "project",
                date: new Date(),
                weight: 1
              }
            }
          },
          { upsert: true }
        ).catch(() => { });
      }

      await updateUserReadinessScore(userId, `New project added: ${name}`).catch(() => { });
    } catch (err) {
      console.error("[EventSubscriber] Error handling PROJECT_CREATED:", err.message);
    }
  });

  console.log("[DomainEvents] Global event subscribers registered successfully.");
}


