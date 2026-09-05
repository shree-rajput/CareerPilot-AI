import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NOT_ASSESSED, safeNumber, clampScore, safeAverage, assertFiniteScore } from "../src/utils/math.js";

describe("Career Readiness Scoring Engine - Numeric Safeties", () => {
  describe("safeNumber", () => {
    it("should return the number if valid", () => {
      assert.equal(safeNumber(85), 85);
      assert.equal(safeNumber("90"), 90);
      assert.equal(safeNumber(0), 0);
      assert.equal(safeNumber(-1), -1);
    });

    it("should return fallback for NaN or undefined", () => {
      assert.equal(safeNumber(NaN), 0);
      assert.equal(safeNumber(undefined), 0);
      assert.equal(safeNumber(null), 0);
      assert.equal(safeNumber("invalid", 10), 10);
    });
  });

  describe("clampScore", () => {
    it("should return NOT_ASSESSED untouched", () => {
      assert.equal(clampScore(NOT_ASSESSED), NOT_ASSESSED);
    });

    it("should clamp values between min and max", () => {
      assert.equal(clampScore(150), 100);
      assert.equal(clampScore(-50), 0);
      assert.equal(clampScore(50), 50);
    });

    it("should safely handle invalid values via fallback", () => {
      assert.equal(clampScore(NaN), 0);
    });
  });

  describe("safeAverage", () => {
    it("should return NOT_ASSESSED for empty arrays", () => {
      assert.equal(safeAverage([]), NOT_ASSESSED);
      assert.equal(safeAverage(null), NOT_ASSESSED);
    });

    it("should calculate average ignoring NOT_ASSESSED and invalid values", () => {
      const arr = [100, NOT_ASSESSED, 50, NaN, undefined, "not_a_number"];
      assert.equal(safeAverage(arr), 75);
    });

    it("should return NOT_ASSESSED if array has no valid values", () => {
      const arr = [NOT_ASSESSED, NaN, undefined];
      assert.equal(safeAverage(arr), NOT_ASSESSED);
    });
    
    it("should clamp the result", () => {
      const arr = [150, 200];
      assert.equal(safeAverage(arr), 100);
    });
  });

  describe("assertFiniteScore", () => {
    it("should assert a valid score", () => {
      assert.equal(assertFiniteScore(85), 85);
    });

    it("should preserve NOT_ASSESSED", () => {
      assert.equal(assertFiniteScore(NOT_ASSESSED), NOT_ASSESSED);
    });

    it("should return NOT_ASSESSED fallback for invalid inputs if specified", () => {
      assert.equal(assertFiniteScore(NaN, NOT_ASSESSED), NOT_ASSESSED);
      assert.equal(assertFiniteScore(undefined, NOT_ASSESSED), NOT_ASSESSED);
    });
  });
});
