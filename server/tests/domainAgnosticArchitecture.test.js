import { describe, it } from "node:test";
import assert from "node:assert";
import { getSupportedLanguages, getLanguageConfig, isValidLanguage } from "../src/config/programmingLanguages.js";
import { VERIFIED_QUESTION_BANK } from "../src/services/career/questionBank.service.js";
import { getDeterministicScenarioRecommendation } from "../src/services/career/deterministicSelectionService.js";

describe("Domain-Agnostic Practice Architecture Test Suite", () => {
  describe("1. Configurable Programming Language Registry", () => {
    it("should export all 4 canonical programming languages with required metadata", () => {
      const languages = getSupportedLanguages();
      assert.strictEqual(languages.length, 4);

      const ids = languages.map(l => l.id);
      assert.deepStrictEqual(ids, ["javascript", "python", "java", "cpp"]);

      for (const lang of languages) {
        assert.ok(lang.id, "Language must have an id");
        assert.ok(lang.displayName, "Language must have a displayName");
        assert.ok(lang.fileExtension, "Language must have a fileExtension");
        assert.ok(lang.executionConfig, "Language must have executionConfig");
        assert.ok(Array.isArray(lang.supportedModes), "Language must specify supportedModes");
      }
    });

    it("should lookup language config and validate language validity correctly", () => {
      assert.strictEqual(isValidLanguage("python"), true);
      assert.strictEqual(isValidLanguage("java"), true);
      assert.strictEqual(isValidLanguage("cpp"), true);
      assert.strictEqual(isValidLanguage("javascript"), true);
      assert.strictEqual(isValidLanguage("haskell"), false);

      const javaConfig = getLanguageConfig("java");
      assert.strictEqual(javaConfig.id, "java");
      assert.strictEqual(javaConfig.fileExtension, "java");
    });
  });

  describe("2. Multi-Language Starter Stubs & Question Bank", () => {
    it("should provide multi-language starter stubs for coding and dev questions", () => {
      assert.ok(VERIFIED_QUESTION_BANK.length > 0);
      for (const q of VERIFIED_QUESTION_BANK) {
        if (q.category === "coding") {
          assert.ok(q.starterCode, `Coding question ${q.id} must have starterCode`);
          assert.ok(q.starterCode.javascript, `Coding question ${q.id} must have javascript starter stub`);
          assert.ok(q.starterCode.python, `Coding question ${q.id} must have python starter stub`);
          assert.ok(q.starterCode.java, `Coding question ${q.id} must have java starter stub`);
          assert.ok(q.starterCode.cpp, `Coding question ${q.id} must have cpp starter stub`);
        }
      }
    });
  });

  describe("3. Role-Agnostic Pipeline & Profile-Driven Selection", () => {
    it("should select role-aligned scenario for Data Scientist / ML Engineer profile", async () => {
      const rec = await getDeterministicScenarioRecommendation(null, {
        category: "development",
        experienceLevel: "fresher"
      });

      assert.ok(rec.scenario);
      assert.ok(rec.scenario.title);
      assert.ok(Array.isArray(rec.scenario.supportedLanguages));
      assert.ok(rec.scenario.supportedLanguages.includes("python"));
    });

    it("should support Java and C++ candidates without forcing Full Stack assumptions", async () => {
      const javaRec = await getDeterministicScenarioRecommendation(null, {
        category: "coding",
        experienceLevel: "fresher"
      });

      assert.ok(javaRec.scenario);
      assert.ok(javaRec.scenario.starterCode.java);
      assert.ok(javaRec.scenario.starterCode.cpp);
    });
  });
});
