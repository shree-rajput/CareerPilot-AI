import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAllStarterCodes } from "../src/services/codeExecution/starterCodeGenerator.js";
import { normalizeCodingQuestion } from "../src/services/codeExecution/questionNormalizationService.js";
import { executeCode } from "../src/services/codeExecution/executionService.js";

describe("Question & Language Switching State Reset Suite", () => {
  describe("1. Question Switching State Reset", () => {
    it("should atomically reset metadata and starter codes when switching from Question A to Question B to Question C", () => {
      // Question A: Array Length
      const rawQuestionA = {
        title: "Find Array Length",
        testCases: [{ input: [1, 2, 3], expectedOutput: 3 }]
      };
      const questionA = normalizeCodingQuestion(rawQuestionA);

      assert.equal(questionA.functionName, "findArrayLength");
      assert.equal(questionA.parameters.length, 1);
      assert.equal(questionA.parameters[0].name, "arr");
      assert.ok(questionA.starterCode.java.includes("public int findArrayLength(int[] arr)"));
      assert.ok(questionA.starterCode.python.includes("def findArrayLength(arr):"));

      // Question B: Add Two Integers
      const rawQuestionB = {
        title: "Add Two Integers",
        functionName: "add",
        parameters: [{ name: "a", type: "integer" }, { name: "b", type: "integer" }],
        returnType: "integer",
        testCases: [{ input: [2, 3], expectedOutput: 5 }]
      };
      const questionB = normalizeCodingQuestion(rawQuestionB);

      assert.equal(questionB.functionName, "add");
      assert.equal(questionB.parameters.length, 2);
      assert.equal(questionB.parameters[0].name, "a");
      assert.equal(questionB.parameters[1].name, "b");
      assert.ok(questionB.starterCode.java.includes("public int add(int a, int b)"));
      assert.ok(questionB.starterCode.python.includes("def add(a, b):"));

      // Verify ZERO stale state from Question A in Question B
      assert.equal(questionB.starterCode.java.includes("findArrayLength"), false);
      assert.equal(questionB.starterCode.java.includes("arr"), false);

      // Question C: String Length
      const rawQuestionC = {
        title: "String Length",
        functionName: "stringLength",
        parameters: [{ name: "s", type: "string" }],
        returnType: "integer",
        testCases: [{ input: "hello", expectedOutput: 5 }]
      };
      const questionC = normalizeCodingQuestion(rawQuestionC);

      assert.equal(questionC.functionName, "stringLength");
      assert.equal(questionC.parameters[0].name, "s");
      assert.ok(questionC.starterCode.java.includes("public int stringLength(String s)"));
      assert.ok(questionC.starterCode.cpp.includes("int stringLength(const string& s)"));

      // Verify ZERO stale state from Question B in Question C
      assert.equal(questionC.starterCode.java.includes("add"), false);
    });
  });

  describe("2. Language Switching Semantics Preservation", () => {
    it("should preserve question contract across JS, Python, Java, and C++ for the same question", async () => {
      const questionContract = {
        functionName: "add",
        parameters: [
          { name: "a", type: "integer" },
          { name: "b", type: "integer" }
        ],
        returnType: "integer"
      };

      const starters = generateAllStarterCodes(questionContract);

      assert.ok(starters.javascript.includes("function add(a, b)"));
      assert.ok(starters.python.includes("def add(a, b):"));
      assert.ok(starters.java.includes("public int add(int a, int b)"));
      assert.ok(starters.cpp.includes("int add(int a, int b)"));

      const testCases = [
        { input: [3, 4], expectedOutput: 7 }
      ];

      // Execute across all languages
      const jsRes = await executeCode({
        language: "javascript",
        code: "function add(a, b) { return a + b; }",
        testCases,
        executionContract: questionContract
      });
      assert.equal(jsRes.allPassed, true);

      const pyRes = await executeCode({
        language: "python",
        code: "def add(a, b):\n    return a + b",
        testCases,
        executionContract: questionContract
      });
      assert.equal(pyRes.allPassed, true);

      const javaRes = await executeCode({
        language: "java",
        code: "class Solution {\n    public int add(int a, int b) {\n        return a + b;\n    }\n}",
        testCases,
        executionContract: questionContract
      });
      assert.equal(javaRes.allPassed, true);

      const cppRes = await executeCode({
        language: "cpp",
        code: "class Solution {\npublic:\n    int add(int a, int b) {\n        return a + b;\n    }\n};",
        testCases,
        executionContract: questionContract
      });
      assert.equal(cppRes.allPassed, true);
    });
  });
});
