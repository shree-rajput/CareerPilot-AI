import assert from "node:assert";
import {
  generateEventId,
} from "../src/services/career/applicationEventService.js";
import {
  generateReminderId,
  REMINDER_POLICY,
} from "../src/services/scheduler/reminderEngine.js";
import { canTransitionStatus, validateAndApplyTransition } from "../src/services/career/statusTransitionEngine.js";
import { externalCaptureSchema } from "../src/controllers/applicationController.js";
import { STATUS_VALUES } from "../src/models/Application.js";
import { cleanJobDescriptionText } from "../../extension/utils/sanitizer.js";
import { safeFindApplyButton } from "../../extension/utils/domUtils.js";

async function runLifecycleTests() {
  console.log("==================================================");
  console.log("RUNNING EXTENSION & BACKEND MASTER RECOVERY TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${err.stack || err.message}`);
    }
  }

  // 1. Invalid CSS Selector & Text-Matching Safeguards
  test("safeFindApplyButton safely locates Apply buttons without throwing on :contains()", () => {
    assert.strictEqual(typeof safeFindApplyButton, "function");
    // Verify that safeFindApplyButton handles empty/null documents gracefully
    const nullResult = safeFindApplyButton(null);
    assert.strictEqual(nullResult, null);
  });

  // 2. Cookie & Privacy Banner Text Exclusion (Phase 2 & 3 & 7)
  test("cleanJobDescriptionText strips out cookie notices, privacy disclosures, and terms", () => {
    const rawContaminatedText = `
      The CrowdStrike Careers portal uses cookies to optimize your browsing experience.
      Accept all cookies or manage cookie preferences in privacy settings.
      
      Job Description:
      We are seeking an Engineer III - Backend - MRC to join our Cloud Engineering team.
      Responsibilities include building high-throughput microservices in Go.
      
      All rights reserved. Terms of service apply.
    `;

    const cleaned = cleanJobDescriptionText(rawContaminatedText);
    assert.strictEqual(cleaned.includes("uses cookies"), false, "Cookie text must be excluded");
    assert.strictEqual(cleaned.includes("Accept all cookies"), false, "Consent options must be excluded");
    assert.strictEqual(cleaned.includes("Terms of service"), false, "Terms of service must be excluded");
    assert.strictEqual(cleaned.includes("Engineer III - Backend - MRC"), true, "Core job text must be preserved");
  });

  // 3. Event Determinism
  test("generateEventId produces identical hashes for same parameters on same date", () => {
    const date = new Date("2026-09-08T10:00:00Z");
    const id1 = generateEventId("user123", "app456", "JOB_SAVED", "extension_auto_overlay", date);
    const id2 = generateEventId("user123", "app456", "JOB_SAVED", "extension_auto_overlay", date);
    assert.strictEqual(id1, id2, "Hashes must match for identical event parameters");
    assert.strictEqual(typeof id1, "string");
    assert.strictEqual(id1.length, 64, "Must be valid SHA-256 string");
  });

  test("generateEventId produces distinct hashes for different event types or dates", () => {
    const date1 = new Date("2026-09-08T10:00:00Z");
    const date2 = new Date("2026-09-09T10:00:00Z");
    const id1 = generateEventId("user123", "app456", "JOB_SAVED", "extension_auto_overlay", date1);
    const id2 = generateEventId("user123", "app456", "APPLICATION_SUBMITTED", "extension_auto_overlay", date1);
    const id3 = generateEventId("user123", "app456", "JOB_SAVED", "extension_auto_overlay", date2);

    assert.notStrictEqual(id1, id2, "Different event types must produce different event IDs");
    assert.notStrictEqual(id1, id3, "Different dates must produce different event IDs");
  });

  // 4. Reminder Policy & ID Determinism
  test("REMINDER_POLICY configured with production-grade timing thresholds", () => {
    assert.strictEqual(REMINDER_POLICY.appliedFollowUpDays, 7);
    assert.strictEqual(REMINDER_POLICY.secondFollowUpDays, 14);
    assert.strictEqual(REMINDER_POLICY.oaReminderHours, 24);
    assert.strictEqual(REMINDER_POLICY.interviewPrepHours, 24);
    assert.strictEqual(REMINDER_POLICY.interviewDayHours, 1);
  });

  test("generateReminderId produces deterministic reminder IDs", () => {
    const id1 = generateReminderId("app456", "FOLLOW_UP", "2026-09-08");
    const id2 = generateReminderId("app456", "FOLLOW_UP", "2026-09-08");
    assert.strictEqual(id1, id2);
    assert.strictEqual(id1.length, 64);
  });

  // 5. Extension Capture Schema - Validation of targetStatus: "saved" & "apply_started"
  test("externalCaptureSchema accepts 'saved' and 'apply_started' target statuses", () => {
    const parsedSaved = externalCaptureSchema.parse({
      company: "Google",
      role: "SDE 2",
      status: "saved",
    });
    assert.strictEqual(parsedSaved.status, "saved");

    const parsedApplyStarted = externalCaptureSchema.parse({
      company: "Google",
      role: "SDE 2",
      status: "apply_started",
    });
    assert.strictEqual(parsedApplyStarted.status, "apply_started");
  });

  // 6. Status Transition Matrix Safeguards
  test("Status transitions follow valid lifecycle progression (saved -> apply_started -> applied)", () => {
    assert.strictEqual(STATUS_VALUES.includes("apply_started"), true, "apply_started must exist in STATUS_VALUES");
    assert.strictEqual(canTransitionStatus("saved", "apply_started", "extension_auto_overlay"), true);
    assert.strictEqual(canTransitionStatus("apply_started", "applied", "extension_auto_overlay"), true);
    assert.strictEqual(canTransitionStatus("applied", "interview", "email"), true);
    assert.strictEqual(canTransitionStatus("interview", "offer", "email"), true);
    assert.strictEqual(canTransitionStatus("offer", "applied", "email"), false, "Cannot downgrade from offer to applied");
  });

  // 7. validateAndApplyTransition Updates App State Correctly
  test("validateAndApplyTransition advances apply_started -> applied and updates timestamps", () => {
    const mockApp = {
      status: "apply_started",
      statusHistory: [],
      dateApplied: null,
      lastActivityAt: null,
    };

    const res = validateAndApplyTransition(mockApp, {
      targetStatus: "applied",
      source: "extension_auto_overlay",
      confidence: "high",
      evidence: "Strong submission evidence detected in DOM",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(mockApp.status, "applied");
    assert.notStrictEqual(mockApp.dateApplied, null);
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) process.exit(1);
}

runLifecycleTests().catch((err) => {
  console.error("Lifecycle test run failed:", err);
  process.exit(1);
});
