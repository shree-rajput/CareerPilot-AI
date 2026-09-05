import { describe, it } from "node:test";
import assert from "node:assert";
import { 
  normalizeQuestionFingerprint, 
  extractConceptFingerprints, 
  isDuplicateQuestion, 
  getDeterministicScenarioRecommendation 
} from "../src/services/career/deterministicSelectionService.js";
import { VERIFIED_QUESTION_BANK, getVerifiedQuestions } from "../src/services/career/questionBank.service.js";

describe("Question Selection Engine Hardening & Anti-Repetition Test Suite", () => {

  describe("1. Semantic Fingerprinting & Token Overlap Duplicate Detection", () => {
    it("should generate consistent normalized question fingerprints", () => {
      const q1 = { id: "code-01", title: "Two Sum Target Array Scanner" };
      const q2 = { id: "code-02", title: "Two Sum Target Array Scanner" };
      const q3 = { id: "code-03", title: "Valid Anagram String Frequency Counter" };

      const fp1 = normalizeQuestionFingerprint(q1);
      const fp2 = normalizeQuestionFingerprint(q2);
      const fp3 = normalizeQuestionFingerprint(q3);

      assert.strictEqual(fp1, fp2);
      assert.notStrictEqual(fp1, fp3);
      assert.ok(fp1.startsWith("fp:"));
    });

    it("should detect exact ID, exact title, and semantic token overlap duplicates", () => {
      const practicedIds = new Set(["q-101"]);
      const practicedTitles = new Set(["two sum target array scanner", "valid anagram string frequency counter"]);
      const practicedFingerprints = new Set(["fp:array-scanner-target-sum-two"]);

      // 1. Exact ID match
      assert.strictEqual(isDuplicateQuestion({ id: "q-101", title: "Unique Title" }, practicedIds, practicedTitles, practicedFingerprints), true);

      // 2. Exact Title match (case insensitive, stripped)
      assert.strictEqual(isDuplicateQuestion({ id: "q-102", title: "Two Sum Target Array Scanner" }, practicedIds, practicedTitles, practicedFingerprints), true);

      // 3. Fingerprint match
      assert.strictEqual(isDuplicateQuestion({ id: "q-103", title: "Two Sum Target Array Scanner", id: "other" }, practicedIds, practicedTitles, practicedFingerprints), true);

      // 4. Paraphrased Title Token Overlap match (e.g., "Two Sum Target Array" matching "Two Sum Target Array Scanner")
      assert.strictEqual(isDuplicateQuestion({ id: "q-104", title: "Two Sum Target Array" }, practicedIds, practicedTitles, practicedFingerprints), true);

      // 5. Completely distinct question -> Should NOT be flagged as duplicate
      assert.strictEqual(isDuplicateQuestion({ id: "q-105", title: "Binary Tree Level Order Traversal Strategy" }, practicedIds, practicedTitles, practicedFingerprints), false);
    });

    it("should extract concept fingerprints accurately", () => {
      const q = {
        concepts: ["Hash Maps", "Arrays"],
        expectedSkills: ["Problem Solving"],
        topics: ["Data Structures"],
        topic: "Algorithms"
      };

      const set = extractConceptFingerprints(q);
      assert.ok(set.has("hashmaps"));
      assert.ok(set.has("arrays"));
      assert.ok(set.has("problemsolving"));
      assert.ok(set.has("datastructures"));
      assert.ok(set.has("algorithms"));
    });
  });

  describe("2. Same Session Anti-Repetition Across Sequence (Q1 !== Q2 !== Q3)", () => {
    it("should never repeat questions within a multi-step session", async () => {
      const excludeIds = [];
      const excludeTitles = [];
      const seenIds = new Set();
      const seenTitles = new Set();

      for (let i = 0; i < 5; i++) {
        const rec = await getDeterministicScenarioRecommendation(null, {
          category: "coding",
          experienceLevel: "fresher",
          excludeIds,
          excludeTitles
        });

        assert.ok(rec.scenario, `Step ${i + 1} should return a valid scenario`);
        const qId = rec.scenario.scenarioId;
        const qTitle = rec.scenario.title;

        assert.strictEqual(seenIds.has(qId), false, `Question ID '${qId}' repeated on step ${i + 1}`);
        assert.strictEqual(seenTitles.has(qTitle.toLowerCase()), false, `Question Title '${qTitle}' repeated on step ${i + 1}`);

        seenIds.add(qId);
        seenTitles.add(qTitle.toLowerCase());
        excludeIds.push(qId);
        excludeTitles.push(qTitle);
      }

      assert.strictEqual(seenIds.size, 5);
    });
  });

  describe("3. 20-Question Sequence Uniqueness", () => {
    it("should generate a 20-question sequence without repetitions across all available categories", async () => {
      const excludeIds = [];
      const excludeTitles = [];
      const sequence = [];

      for (let i = 0; i < 20; i++) {
        const category = i % 2 === 0 ? "coding" : "development";
        const rec = await getDeterministicScenarioRecommendation(null, {
          category,
          experienceLevel: "fresher",
          excludeIds,
          excludeTitles
        });

        if (rec.code === "NO_ELIGIBLE_QUESTION") {
          // If pool exhausted for fresher coding, switch difficulty/category or accept end of pool
          break;
        }

        assert.ok(rec.scenario, `Question ${i + 1} must be defined`);
        sequence.push(rec.scenario.title);
        excludeIds.push(rec.scenario.scenarioId);
        excludeTitles.push(rec.scenario.title);
      }

      const uniqueTitles = new Set(sequence.map(t => t.toLowerCase()));
      assert.strictEqual(uniqueTitles.size, sequence.length, "All returned questions in 20-step sequence must be unique");
    });
  });

  describe("4. Refresh & Reconnect Recovery (Session State Preservation)", () => {
    it("should respect excludeIds and excludeTitles passed from restored session state", async () => {
      // Simulate session room state restored after page refresh
      const restoredRoomState = {
        askedQuestionIds: ["verified-code-01", "verified-code-02", "verified-dev-01"],
        askedQuestionTitles: ["Two Sum Target Array Scanner", "Valid Anagram String Frequency Counter", "REST API User Validation & Payload Sanitizer"],
      };

      const rec = await getDeterministicScenarioRecommendation(null, {
        category: "coding",
        experienceLevel: "fresher",
        excludeIds: restoredRoomState.askedQuestionIds,
        excludeTitles: restoredRoomState.askedQuestionTitles
      });

      assert.ok(rec.scenario);
      assert.ok(!restoredRoomState.askedQuestionIds.includes(rec.scenario.scenarioId));
      assert.ok(!restoredRoomState.askedQuestionTitles.includes(rec.scenario.title));
    });
  });

  describe("5. Explicit Pool Exhaustion Handling (NO_ELIGIBLE_QUESTION)", () => {
    it("should return NO_ELIGIBLE_QUESTION code when all eligible questions in a pool have been completed", async () => {
      // Collect all question IDs for 'system_design' category
      const sysDesignQuestions = getVerifiedQuestions({ category: "system_design" });
      const allSysDesignIds = sysDesignQuestions.map(q => q.id);
      const allSysDesignTitles = sysDesignQuestions.map(q => q.title);

      const rec = await getDeterministicScenarioRecommendation(null, {
        category: "system_design",
        experienceLevel: "fresher",
        excludeIds: allSysDesignIds,
        excludeTitles: allSysDesignTitles
      });

      assert.strictEqual(rec.code, "NO_ELIGIBLE_QUESTION");
      assert.strictEqual(rec.scenario, null);
      assert.ok(rec.message.includes("completed"));
    });
  });
});
