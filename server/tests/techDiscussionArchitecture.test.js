import { describe, it } from "node:test";
import assert from "node:assert";
import { executeCode } from "../src/services/codeExecution/executionService.js";
import { VERIFIED_QUESTION_BANK, getVerifiedQuestions } from "../src/services/career/questionBank.service.js";
import { getDeterministicScenarioRecommendation } from "../src/services/career/deterministicSelectionService.js";

describe("Tech Discussion Architecture & Security Test Suite", () => {
  describe("1. Code Execution & Error Classification", () => {
    it("should execute valid JavaScript code safely and return execution details", async () => {
      const result = await executeCode({
        language: "javascript",
        code: "function solution(n) { return n * 2; }",
        testCases: [{ _id: "t1", input: 5, expectedOutput: 10 }]
      });

      assert.strictEqual(result.allPassed, true);
      assert.strictEqual(result.passedTests, 1);
      assert.strictEqual(result.results[0].actualOutput, 10);
      assert.strictEqual(result.results[0].passed, true);
    });

    it("should handle invalid code execution with clean stderr and exitCode", async () => {
      const result = await executeCode({
        language: "javascript",
        code: "throw new Error('Custom execution error');",
        testCases: [{ _id: "t1", input: 1, expectedOutput: 1 }]
      });

      assert.strictEqual(result.allPassed, false);
      assert.strictEqual(result.passedTests, 0);
      assert.ok(result.results[0].error.includes("Custom execution error"));
    });

    it("should reject unsupported languages with clean error", async () => {
      await assert.rejects(
        async () => {
          await executeCode({
            language: "unsupported_lang",
            code: "print('hello')",
            testCases: []
          });
        },
        /Unsupported language/
      );
    });
  });

  describe("2. Question Bank & Metadata Integrity", () => {
    it("should guarantee every question has verified source metadata and required schema fields", () => {
      assert.ok(VERIFIED_QUESTION_BANK.length > 0);
      for (const q of VERIFIED_QUESTION_BANK) {
        assert.ok(q.id, "Question must have an ID");
        assert.ok(q.title, "Question must have a title");
        assert.ok(q.description, "Question must have a description");
        assert.ok(["coding", "development", "system_design", "interview"].includes(q.category), `Category must be one of 4 modes: ${q.category}`);
        assert.ok(["easy", "medium", "hard"].includes(q.difficulty), "Difficulty must be valid");
        assert.ok(Array.isArray(q.prerequisites), "Must specify prerequisites array");
        assert.ok(Array.isArray(q.expectedSkills), "Must specify expectedSkills array");
        assert.ok(["CURATED", "OFFICIAL", "COMMUNITY_REPORTED", "AI_GENERATED"].includes(q.source), "Must have valid source");
        assert.strictEqual(typeof q.verified, "boolean", "Verified must be boolean");
        assert.strictEqual(typeof q.fresherAppropriate, "boolean", "fresherAppropriate must be boolean");
      }
    });

    it("should return verified questions for all 4 practice modes", () => {
      const modes = ["coding", "development", "system_design", "interview"];
      for (const mode of modes) {
        const questions = getVerifiedQuestions({ category: mode });
        assert.ok(questions.length > 0, `Mode '${mode}' should have verified questions`);
      }
    });

    it("should enforce starter code is empty stub without pre-filled solution", () => {
      for (const q of VERIFIED_QUESTION_BANK) {
        if (q.starterCode) {
          for (const [lang, code] of Object.entries(q.starterCode)) {
            assert.ok(!code.includes("return [0, 1]"), `Question ${q.id} starter code should not contain hardcoded solution`);
            assert.ok(!code.includes("Map()"), `Question ${q.id} starter code should not contain full solution logic`);
          }
        }
      }
    });

    it("should reject mismatched categories via validateCategoryIntegrity", async () => {
      const { validateCategoryIntegrity, normalizeCategory } = await import("../src/config/techDiscussionTaxonomy.js");
      assert.strictEqual(validateCategoryIntegrity("coding", "coding"), true);
      assert.strictEqual(validateCategoryIntegrity("coding", "development"), false);
      assert.strictEqual(validateCategoryIntegrity("system_design", "interview"), false);
      assert.strictEqual(normalizeCategory("Software Engineering"), "development");
      assert.strictEqual(normalizeCategory("Architecture"), "system_design");
    });
  });

  describe("3. Deterministic Pipeline & Fresher Progression", () => {
    it("should select fresher-appropriate easy question for a fresher candidate", async () => {
      const rec = await getDeterministicScenarioRecommendation(null, {
        category: "coding",
        experienceLevel: "fresher"
      });

      assert.ok(rec.scenario);
      assert.strictEqual(rec.scenario.difficulty, "easy");
      assert.strictEqual(rec.experienceLevel, "fresher");
      assert.ok(rec.rationale.includes("FRESHER"));
    });

    it("should exclude previously practiced question IDs via anti-repetition filter", async () => {
      const firstRec = await getDeterministicScenarioRecommendation(null, {
        category: "coding",
        experienceLevel: "fresher"
      });

      const secondRec = await getDeterministicScenarioRecommendation(null, {
        category: "coding",
        experienceLevel: "fresher",
        excludeIds: [firstRec.scenario.scenarioId]
      });

      assert.ok(secondRec.scenario);
      assert.notStrictEqual(secondRec.scenario.scenarioId, firstRec.scenario.scenarioId);
    });

    it("should generate a series of unique questions without repeating previous questions", async () => {
      const excludeIds = [];
      const titles = new Set();

      for (let i = 0; i < 4; i++) {
        const rec = await getDeterministicScenarioRecommendation(null, {
          category: "coding",
          experienceLevel: "fresher",
          excludeIds
        });

        assert.ok(rec.scenario);
        assert.ok(!titles.has(rec.scenario.title.toLowerCase()), `Question '${rec.scenario.title}' was repeated in sequence`);

        excludeIds.push(rec.scenario.scenarioId);
        titles.add(rec.scenario.title.toLowerCase());
      }

      assert.strictEqual(titles.size, 4);
    });
  });
});


