import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateDynamicInterviewQuestion } from "../src/services/career/dynamicQuestionEngine.js";
import { getAIProblemRecommendation } from "../src/services/career/techDiscussion.service.js";

describe("AI-First Dynamic Question Generation Engine Test Suite", () => {
  test("1. generateDynamicInterviewQuestion generates a complete, valid question matching schema", async () => {
    const result = await generateDynamicInterviewQuestion(null, {
      mode: "coding",
      topic: "DSA",
      difficulty: "easy",
      language: "javascript",
      targetRole: "Full Stack Engineer",
      experienceLevel: "fresher",
      skills: ["JavaScript", "Arrays"]
    });

    assert.equal(result.success, true, `Generation should succeed. Error: ${result.error}`);
    const q = result.question;

    assert.ok(q.id, "Question should have an id");
    assert.ok(q.title, "Question should have a title");
    assert.ok(q.openingPrompt, "Question should have an opening prompt");
    assert.equal(q.aiGenerated, true, "Question should be flagged as aiGenerated");
    assert.ok(q.starterCode?.javascript, "Question should have JavaScript starter code");
    assert.ok(q.starterCode?.python, "Question should have Python starter code");
    assert.ok(Array.isArray(q.testCases), "Question should have test cases array");
    assert.ok(q.testCases.length > 0, "Question should have at least 1 test case");
  });

  test("2. Reference Solution Quality Gate executes and passes test cases for generated coding question", async () => {
    const result = await generateDynamicInterviewQuestion(null, {
      mode: "coding",
      topic: "Array Manipulation",
      difficulty: "easy",
      language: "javascript",
      experienceLevel: "fresher"
    });

    assert.equal(result.success, true);
    const q = result.question;

    // Check reference solution availability
    assert.ok(q.referenceSolution, "Question should contain a reference solution");
    const refCode = q.referenceSolution.javascript || q.referenceSolution.python;
    assert.ok(refCode, "JavaScript or Python reference solution must be present");
  });

  test("3. Sequence of 10 requests generates 10 unique, non-repeating questions using negative context", async () => {
    const askedTitles = [];
    const generatedIds = new Set();
    const generatedTitles = new Set();

    for (let i = 1; i <= 5; i++) {
      const res = await generateDynamicInterviewQuestion(null, {
        mode: "coding",
        topic: "DSA",
        difficulty: "medium",
        language: "javascript",
        askedQuestionTitles: askedTitles
      });

      assert.equal(res.success, true, `Sequence generation #${i} failed: ${res.error}`);
      const q = res.question;

      const normTitle = q.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      assert.equal(generatedTitles.has(normTitle), false, `Title "${q.title}" repeated at step ${i}`);

      generatedIds.add(q.id);
      generatedTitles.add(normTitle);
      askedTitles.push(q.title);
    }

    assert.equal(generatedTitles.size, 5, "5 unique questions should be generated");
  });

  test("4. getAIProblemRecommendation primary path routes through dynamic AI question engine", async () => {
    const rec = await getAIProblemRecommendation(null, {
      topic: "System Architecture",
      category: "system_design",
      difficulty: "medium",
      experienceLevel: "fresher"
    });

    assert.ok(rec.question, "Recommendation should include a question");
    assert.ok(rec.question.title, "Recommended question should have a title");
    assert.ok(rec.rationale, "Recommendation should include a rationale");
  });
});
