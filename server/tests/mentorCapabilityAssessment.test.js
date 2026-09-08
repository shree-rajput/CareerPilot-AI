import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCapabilityChallenge } from "../src/services/career/capabilityAssessmentService.js";

describe("Capability Assessment Engine Tests", () => {
  test("Fetches practical challenge by track", async () => {
    const techChallenge = await getCapabilityChallenge("technical");
    assert.ok(techChallenge, "Technical challenge returned");
    assert.ok(techChallenge.challengeId, "Has challenge ID");
    assert.ok(techChallenge.scenarioPrompt, "Has scenario prompt");

    const careerChallenge = await getCapabilityChallenge("career");
    assert.ok(careerChallenge, "Career challenge returned");
  });
});
