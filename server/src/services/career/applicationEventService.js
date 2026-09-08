import crypto from "crypto";
import { ApplicationEvent } from "../../models/ApplicationEvent.js";

/**
 * Generate deterministic eventId to ensure idempotency.
 */
export function generateEventId(userId, applicationId, type, source, timestampDate = new Date()) {
  const dateStr = (timestampDate instanceof Date ? timestampDate : new Date(timestampDate)).toISOString().split("T")[0];
  const payload = `${userId.toString()}_${applicationId.toString()}_${type}_${source}_${dateStr}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Normalize and record an event.
 */
export async function normalizeAndRecordEvent({
  userId,
  applicationId,
  type,
  source,
  timestamp = new Date(),
  confidence = 1.0,
  evidence = "",
  metadata = {}
}) {
  const eventId = generateEventId(userId, applicationId, type, source, new Date(timestamp));

  const existing = await ApplicationEvent.findOne({ eventId });
  if (existing) {
    return { event: existing, created: false };
  }

  const event = await ApplicationEvent.create({
    eventId,
    userId,
    applicationId,
    type,
    source,
    timestamp,
    confidence,
    evidence,
    metadata
  });

  return { event, created: true };
}

/**
 * Get ordered timeline of events for an application.
 */
export async function getApplicationEvents(userId, applicationId) {
  return ApplicationEvent.find({ userId, applicationId }).sort({ timestamp: -1 });
}
