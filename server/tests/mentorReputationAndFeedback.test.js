import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateBayesianRating } from "../src/services/career/mentorReputationEngine.js";

describe("Mentor Reputation & Bayesian Weighting Tests", () => {
  test("Calculates Bayesian confidence-weighted rating correctly", () => {
    // 0 reviews -> prior mean (4.5)
    const score0 = calculateBayesianRating(0, 5.0, 4.5, 3);
    assert.equal(score0, 4.5);

    // 1 review with 5.0 rating -> pulled toward prior mean (4.63)
    const score1 = calculateBayesianRating(1, 5.0, 4.5, 3);
    assert.ok(score1 < 5.0, "Single perfect review should not produce 5.0 outranking 50+ reviews");
    assert.ok(score1 > 4.5, "Single 5.0 review increases rating above prior mean");

    // 50 reviews with 4.9 rating -> closely approaches 4.9
    const score50 = calculateBayesianRating(50, 4.9, 4.5, 3);
    assert.ok(score50 >= 4.87, "High sample size approaches empirical mean");
  });
});
