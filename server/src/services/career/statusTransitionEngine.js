/**
 * Status Transition Engine
 * Validates forward lifecycle transitions and prevents accidental status downgrades.
 */

const STAGE_RANK = {
  discovered: 1,
  draft: 1,
  saved: 1,
  preparing: 2,
  ready_to_apply: 2,
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

export function canTransitionStatus(currentStatus, targetStatus, source = "email") {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return false;

  const currentRank = STAGE_RANK[currentStatus] || 1;
  const targetRank = STAGE_RANK[targetStatus] || 1;

  // Rejection & Withdrawn can happen from active stages
  if (targetStatus === "rejected" || targetStatus === "withdrawn") {
    // If application is already in offer state, rejection requires explicit manual confirmation
    if (currentStatus === "offer" && source === "email") {
      return false;
    }
    return true;
  }

  // Prevent backward downgrades from advanced stages (e.g., offer -> interview, interview -> applied)
  if (currentStatus === "offer" && targetStatus !== "offer") {
    return false;
  }

  if (currentStatus === "interview" && (targetStatus === "applied" || targetStatus === "oa" || targetStatus === "saved" || targetStatus === "screening")) {
    return false;
  }

  if (currentStatus === "oa" && (targetStatus === "applied" || targetStatus === "saved")) {
    return false;
  }

  if (currentStatus === "rejected" && source !== "manual" && source !== "user_manual_update") {
    return false;
  }

  // Allow forward transitions or same-rank lateral transitions
  return targetRank >= currentRank;
}

export function validateAndApplyTransition(application, { targetStatus, source = "email", confidence = "high", evidence = "", note = "" }) {
  const currentStatus = application.status;

  const isValid = canTransitionStatus(currentStatus, targetStatus, source);

  if (!isValid) {
    return {
      success: false,
      reason: `Forbidden transition from '${currentStatus}' to '${targetStatus}'.`,
      application,
    };
  }

  // Update status history
  application.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: targetStatus,
    changedBy: source,
    source,
    confidence,
    evidence: evidence || "",
    note: note || `Email event detected: ${targetStatus}`,
    timestamp: new Date(),
  });

  application.status = targetStatus;
  application.lastActivityAt = new Date();

  if (targetStatus === "applied" && !application.dateApplied) {
    application.dateApplied = new Date();
  }

  if (targetStatus === "interview" && !application.interviewDate) {
    application.interviewDate = new Date();
  }

  return {
    success: true,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    application,
  };
}
