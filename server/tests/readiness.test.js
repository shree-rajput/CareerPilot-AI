import { NOT_ASSESSED, safeNumber, clampScore, safeAverage, assertFiniteScore } from "../src/utils/math.js";

describe("Career Readiness Scoring Engine - Numeric Safeties", () => {
  describe("safeNumber", () => {
    it("should return the number if valid", () => {
      expect(safeNumber(85)).toBe(85);
      expect(safeNumber("90")).toBe(90);
      expect(safeNumber(0)).toBe(0);
      expect(safeNumber(-1)).toBe(-1);
    });

    it("should return fallback for NaN or undefined", () => {
      expect(safeNumber(NaN)).toBe(0);
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber(null)).toBe(0);
      expect(safeNumber("invalid", 10)).toBe(10);
    });
  });

  describe("clampScore", () => {
    it("should return NOT_ASSESSED untouched", () => {
      expect(clampScore(NOT_ASSESSED)).toBe(NOT_ASSESSED);
    });

    it("should clamp values between min and max", () => {
      expect(clampScore(150)).toBe(100);
      expect(clampScore(-50)).toBe(0); // Note: NOT_ASSESSED is -1, but passing -50 is clamped to 0 since it's not strictly -1
      expect(clampScore(50)).toBe(50);
    });

    it("should safely handle invalid values via fallback", () => {
      expect(clampScore(NaN)).toBe(0); // default fallback for safeNumber is 0
    });
  });

  describe("safeAverage", () => {
    it("should return NOT_ASSESSED for empty arrays", () => {
      expect(safeAverage([])).toBe(NOT_ASSESSED);
      expect(safeAverage(null)).toBe(NOT_ASSESSED);
    });

    it("should calculate average ignoring NOT_ASSESSED and invalid values", () => {
      const arr = [100, NOT_ASSESSED, 50, NaN, undefined, "not_a_number"];
      expect(safeAverage(arr)).toBe(75); // (100 + 50) / 2
    });

    it("should return NOT_ASSESSED if array has no valid values", () => {
      const arr = [NOT_ASSESSED, NaN, undefined];
      expect(safeAverage(arr)).toBe(NOT_ASSESSED);
    });
    
    it("should clamp the result", () => {
      const arr = [150, 200];
      expect(safeAverage(arr)).toBe(100); // Average is 175, clamped to 100
    });
  });

  describe("assertFiniteScore", () => {
    it("should assert a valid score", () => {
      expect(assertFiniteScore(85)).toBe(85);
    });

    it("should preserve NOT_ASSESSED", () => {
      expect(assertFiniteScore(NOT_ASSESSED)).toBe(NOT_ASSESSED);
    });

    it("should return NOT_ASSESSED fallback for invalid inputs if specified", () => {
      expect(assertFiniteScore(NaN, NOT_ASSESSED)).toBe(NOT_ASSESSED);
      expect(assertFiniteScore(undefined, NOT_ASSESSED)).toBe(NOT_ASSESSED);
    });
  });
});
