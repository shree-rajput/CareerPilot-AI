/**
 * CareerPilot AI - Status Transition Matrix & Safeguards Test Suite
 * Comprehensive matrix verification for forward transitions, forbidden downgrades,
 * timestamp ordering, and anti-downgrade protections.
 */

import assert from "node:assert";
import { canTransitionStatus, validateAndApplyTransition } from "../src/services/career/statusTransitionEngine.js";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING STATUS TRANSITION MATRIX TEST SUITE");
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
      console.error(`       Error: ${err.message}`);
    }
  }

  // 1. Valid Forward Lifecycle Sequence
  test("Valid Production Lifecycle Flow: saved -> applied -> screening -> oa -> interview -> offer", () => {
    assert.strictEqual(canTransitionStatus("saved", "applied", "manual"), true);
    assert.strictEqual(canTransitionStatus("applied", "screening", "email"), true);
    assert.strictEqual(canTransitionStatus("screening", "oa", "email"), true);
    assert.strictEqual(canTransitionStatus("oa", "interview", "email"), true);
    assert.strictEqual(canTransitionStatus("interview", "offer", "email"), true);
  });

  // 2. Terminal Rejection & Withdrawal
  test("Rejection allowed from active stages except offer via email", () => {
    assert.strictEqual(canTransitionStatus("saved", "rejected", "email"), true);
    assert.strictEqual(canTransitionStatus("applied", "rejected", "email"), true);
    assert.strictEqual(canTransitionStatus("interview", "rejected", "email"), true);
    assert.strictEqual(canTransitionStatus("offer", "rejected", "email"), false, "Offer -> Rejected via email requires manual confirmation");
    assert.strictEqual(canTransitionStatus("offer", "rejected", "user_confirmation"), true, "Offer -> Rejected via explicit user confirmation is allowed");
  });

  // 3. Forbidden Downgrade Matrix
  test("Forbidden Status Downgrade Protection Matrix", () => {
    assert.strictEqual(canTransitionStatus("offer", "interview", "email"), false, "Offer -> Interview forbidden");
    assert.strictEqual(canTransitionStatus("offer", "applied", "email"), false, "Offer -> Applied forbidden");
    assert.strictEqual(canTransitionStatus("interview", "applied", "email"), false, "Interview -> Applied forbidden");
    assert.strictEqual(canTransitionStatus("interview", "oa", "email"), false, "Interview -> OA forbidden");
    assert.strictEqual(canTransitionStatus("interview", "screening", "email"), false, "Interview -> Screening forbidden");
    assert.strictEqual(canTransitionStatus("oa", "applied", "email"), false, "OA -> Applied forbidden");
    assert.strictEqual(canTransitionStatus("rejected", "applied", "email"), false, "Rejected -> Applied via email forbidden");
  });

  // 4. Timestamp-Aware Guard Against Out-of-Order Emails
  test("Timestamp-Aware Guard: Old Monday Interview Email processed after Friday Offer", () => {
    const monday = new Date("2026-09-01T10:00:00Z").toISOString();
    const friday = new Date("2026-09-05T10:00:00Z").toISOString();

    const history = [
      { fromStatus: "applied", toStatus: "interview", timestamp: monday },
      { fromStatus: "interview", toStatus: "offer", timestamp: friday },
    ];

    const isAllowed = canTransitionStatus("offer", "interview", "email", monday, history);
    assert.strictEqual(isAllowed, false, "Older interview email timestamp must not downgrade offer");
  });

  // 5. validateAndApplyTransition helper application
  test("validateAndApplyTransition applies valid state change & updates history", () => {
    const mockApp = {
      status: "saved",
      statusHistory: [],
      dateApplied: null,
      interviewDate: null,
      lastActivityAt: null,
    };

    const result = validateAndApplyTransition(mockApp, {
      targetStatus: "applied",
      source: "extension_manual_action",
      confidence: "high",
      evidence: "Clicked Applied",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(mockApp.status, "applied");
    assert.strictEqual(mockApp.statusHistory.length, 1);
    assert.strictEqual(mockApp.statusHistory[0].toStatus, "applied");
    assert.notStrictEqual(mockApp.dateApplied, null);
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} TRANSITION TESTS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
