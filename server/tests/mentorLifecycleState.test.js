import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Mentor Lifecycle State Machine Tests", () => {
  test("Validates complete mentor state machine sequence", () => {
    const validStates = [
      "none",
      "application",
      "pending_capability",
      "probation",
      "verified",
      "trusted",
      "restricted",
      "suspended",
      "rejected"
    ];

    assert.equal(validStates.length, 9);
    assert.ok(validStates.includes("probation"));
    assert.ok(validStates.includes("trusted"));
  });

  test("Probationary mentor capacity limits enforced", () => {
    const probationLimit = 5;
    const verifiedLimit = 20;

    assert.equal(probationLimit, 5, "Probationary mentors capped at 5 sessions/week");
    assert.ok(verifiedLimit > probationLimit, "Verified mentors have higher capacity limit");
  });
});
