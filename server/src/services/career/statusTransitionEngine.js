import { STATUS_VALUES } from "../../models/Application.js";

/**
 * The only module allowed to construct application status-history entries.
 * Older data that predates this contract is repaired by the migration script.
 */

const STAGE_RANK = {
  discovered: 1,
  draft: 1,
  saved: 1,
  preparing: 2,
  ready_to_apply: 2,
  apply_started: 2,
  applied: 3,
  shortlisted: 4,
  screening: 4,
  oa: 5,
  interview: 6,
  offer: 7,
  rejected: 8,
  withdrawn: 8,
  on_hold: 5,
  stale: 1,
};

const CHANGED_BY_VALUES = new Set([
  "manual", "ai", "email", "calendar", "auto_stale", "system",
  "user_confirmation", "extension_capture", "user_manual_update",
  "trusted_external_signal",
]);

function normalizeChangedBy(source) {
  if (CHANGED_BY_VALUES.has(source)) return source;
  if (String(source || "").startsWith("extension")) return "extension_capture";
  return "system";
}

export function createInitialStatusHistory(status, metadata = {}) {
  if (!STATUS_VALUES.includes(status)) {
    throw new Error(`Invalid initial application status '${status}'.`);
  }
  const changedAt = metadata.changedAt || metadata.eventTimestamp || new Date();
  return {
    fromStatus: "",
    toStatus: status,
    changedBy: normalizeChangedBy(metadata.changedBy || metadata.source || "manual"),
    source: metadata.source || "user_manual_update",
    confidence: metadata.confidence || "high",
    evidence: metadata.evidence || "",
    note: metadata.note || `Initial status: ${status}`,
    changedAt,
    timestamp: changedAt,
  };
}

export function canTransitionStatus(currentStatus, targetStatus, source = "email", eventTimestamp = null, statusHistory = []) {
  if (!STATUS_VALUES.includes(currentStatus) || !STATUS_VALUES.includes(targetStatus)) return false;
  if (currentStatus === targetStatus) return false;

  const currentRank = STAGE_RANK[currentStatus] || 1;
  const targetRank = STAGE_RANK[targetStatus] || 1;

  // Timestamp-Aware Check: If an event occurred prior to the latest status change, reject backward/out-of-order event updates
  if (eventTimestamp && Array.isArray(statusHistory) && statusHistory.length > 0) {
    const latestHistory = statusHistory[statusHistory.length - 1];
    const latestTime = latestHistory.changedAt || latestHistory.timestamp
      ? new Date(latestHistory.changedAt || latestHistory.timestamp).getTime()
      : 0;
    const eventTime = new Date(eventTimestamp).getTime();

    if (eventTime < latestTime && targetRank < currentRank) {
      return false;
    }
  }

  // Rejection & Withdrawn can happen from active stages
  if (targetStatus === "rejected" || targetStatus === "withdrawn") {
    // If application is already in offer state, rejection via email requires explicit manual confirmation
    if (currentStatus === "offer" && (source === "email" || source === "system")) {
      return false;
    }
    return true;
  }

  // Prevent backward downgrades from advanced stages (e.g., offer -> interview, interview -> applied)
  if (currentStatus === "offer" && targetStatus !== "offer") {
    return false;
  }

  if (currentStatus === "interview" && (targetStatus === "applied" || targetStatus === "oa" || targetStatus === "saved" || targetStatus === "screening" || targetStatus === "shortlisted")) {
    return false;
  }

  if (currentStatus === "oa" && (targetStatus === "applied" || targetStatus === "saved" || targetStatus === "screening")) {
    return false;
  }

  if (currentStatus === "screening" && (targetStatus === "applied" || targetStatus === "saved")) {
    return false;
  }

  if (currentStatus === "rejected" && source !== "manual" && source !== "user_manual_update" && source !== "user_confirmation") {
    return false;
  }

  // Allow forward transitions or same-rank lateral transitions
  return targetRank >= currentRank;
}

export function transitionApplicationStatus(application, { targetStatus, source = "email", confidence = "high", evidence = "", note = "", eventTimestamp = null }) {
  if (!application || !STATUS_VALUES.includes(application.status)) {
    return { success: false, reason: "Application has an invalid current status.", application };
  }
  if (!STATUS_VALUES.includes(targetStatus)) {
    return { success: false, reason: `Invalid target status '${targetStatus}'.`, application };
  }
  const currentStatus = application.status;

  if (currentStatus === targetStatus) {
    return { success: true, changed: false, fromStatus: currentStatus, toStatus: targetStatus, application };
  }

  const isValid = canTransitionStatus(currentStatus, targetStatus, source, eventTimestamp, application.statusHistory);

  if (!isValid) {
    return {
      success: false,
      reason: `Forbidden transition from '${currentStatus}' to '${targetStatus}'.`,
      application,
    };
  }

  // Repair any legacy statusHistory items missing `toStatus`
  if (Array.isArray(application.statusHistory)) {
    application.statusHistory.forEach(historyItem => {
      if (!historyItem.toStatus && historyItem.status) {
        historyItem.toStatus = historyItem.status;
      }
    });
  }

  // Update status history
  application.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: targetStatus,
    changedBy: normalizeChangedBy(source),
    source,
    confidence,
    evidence: evidence || "",
    note: note || `Lifecycle event transition: ${targetStatus}`,
    changedAt: eventTimestamp ? new Date(eventTimestamp) : new Date(),
    timestamp: eventTimestamp ? new Date(eventTimestamp) : new Date(),
  });

  application.status = targetStatus;
  application.lastActivityAt = new Date();

  if (targetStatus === "applied" && !application.dateApplied) {
    application.dateApplied = eventTimestamp ? new Date(eventTimestamp) : new Date();
  }

  if (targetStatus === "interview" && !application.interviewDate) {
    application.interviewDate = eventTimestamp ? new Date(eventTimestamp) : new Date();
  }

  return {
    success: true,
    changed: true,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    application,
  };
}

export const validateAndApplyTransition = transitionApplicationStatus;
