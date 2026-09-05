import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAllStarterCodes } from "../src/services/codeExecution/starterCodeGenerator.js";
import { normalizeCodingQuestion } from "../src/services/codeExecution/questionNormalizationService.js";
import { unpackTestCaseArguments, serializeValue } from "../src/services/codeExecution/serializers.js";
import { executeCode } from "../src/services/codeExecution/executionService.js";

describe("AI Interview Coding Engine — Production Reliability Suite", () => {

  describe("1. Question-Aware Starter Code Generator", () => {
    it("should generate question-specific function signatures for JS, TS, Python, Java, and C++", () => {
      const metadata = {
        functionName: "twoSum",
        parameters: [
          { name: "nums", type: "integer[]" },
          { name: "target", type: "integer" }
        ],
        returnType: "integer[]"
      };

      const starters = generateAllStarterCodes(metadata);

      assert.ok(starters.javascript.includes("function twoSum(nums, target)"), `JS starter should include function signature: ${starters.javascript}`);
      assert.ok(starters.typescript.includes("function twoSum(nums: number[], target: number): number[]"), `TS starter should include signature: ${starters.typescript}`);
      assert.ok(starters.python.includes("def twoSum(nums, target):"), `Python starter should include signature: ${starters.python}`);
      assert.ok(starters.java.includes("public int[] twoSum(int[] nums, int target)"), `Java starter should include signature: ${starters.java}`);
      assert.ok(starters.cpp.includes("vector<int> twoSum(vector<int>& nums, int target)"), `C++ starter should include signature: ${starters.cpp}`);
    });

    it("should generate appropriate 1-parameter array starter code for max element problem", () => {
      const metadata = {
        functionName: "findMax",
        parameters: [{ name: "arr", type: "integer[]" }],
        returnType: "integer"
      };

      const starters = generateAllStarterCodes(metadata);

      assert.ok(starters.javascript.includes("function findMax(arr)"), `JS: ${starters.javascript}`);
      assert.ok(starters.python.includes("def findMax(arr):"), `Python: ${starters.python}`);
      assert.ok(starters.java.includes("public int findMax(int[] arr)"), `Java: ${starters.java}`);
      assert.ok(starters.cpp.includes("int findMax(vector<int>& arr)"), `C++: ${starters.cpp}`);
    });
  });

  describe("2. Question Normalization & Contract Service", () => {
    it("should populate missing metadata and generate multi-language starter codes on raw question", () => {
      const raw = {
        title: "Find Maximum Element in Array",
        testCases: [
          { input: [[1, 5, 3]], expectedOutput: 5 }
        ]
      };

      const normalized = normalizeCodingQuestion(raw);

      assert.equal(normalized.functionName, "findMaximumElementInArray");
      assert.equal(normalized.parameters.length, 1);
      assert.equal(normalized.parameters[0].name, "arr");
      assert.equal(normalized.returnType, "integer");
      assert.ok(normalized.starterCode.javascript.includes("findMaximumElementInArray"));
      assert.ok(normalized.starterCode.python.includes("findMaximumElementInArray"));
      assert.ok(normalized.starterCode.java.includes("findMaximumElementInArray"));
      assert.ok(normalized.starterCode.cpp.includes("findMaximumElementInArray"));
      assert.equal(normalized.validationStatus, "valid");
    });
  });

  describe("3. Test Case Input Unpacking (`unpackTestCaseArguments`)", () => {
    it("should unpack multi-parameter array inputs into separate positional arguments", () => {
      const args = unpackTestCaseArguments([[2, 7, 11, 15], 9], 2);
      assert.equal(args.length, 2);
      assert.deepEqual(args[0], [2, 7, 11, 15]);
      assert.equal(args[1], 9);
    });

    it("should unpack multi-parameter object inputs into separate positional arguments", () => {
      const args = unpackTestCaseArguments({ nums: [2, 7, 11, 15], target: 9 }, 2);
      assert.equal(args.length, 2);
      assert.deepEqual(args[0], [2, 7, 11, 15]);
      assert.equal(args[1], 9);
    });

    it("should unpack 1-parameter array input as a single array argument", () => {
      const args = unpackTestCaseArguments([1, 5, 3], 1);
      assert.equal(args.length, 1);
      assert.deepEqual(args[0], [1, 5, 3]);
    });

    it("should unpack 1-parameter primitive string input correctly", () => {
      const args = unpackTestCaseArguments("hello", 1);
      assert.equal(args.length, 1);
      assert.equal(args[0], "hello");
    });
  });

  describe("4. Fix Execution Bug — `undefined.length` Root Cause Prevention", () => {
    it("should execute two-parameter JavaScript code successfully without undefined parameter crashes", async () => {
      const code = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`;

      const executionContract = {
        mode: "FUNCTION",
        functionName: "twoSum",
        parameters: [{ name: "nums", type: "integer[]" }, { name: "target", type: "integer" }],
        returnType: "integer[]"
      };

      const testCases = [
        { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] }
      ];

      const res = await executeCode({
        language: "javascript",
        code,
        testCases,
        executionContract
      });

      assert.equal(res.allPassed, true, `Expected execution to pass, got error: ${res.results?.[0]?.error}`);
      assert.deepEqual(res.results[0].actualOutput, [0, 1]);
    });

    it("should execute two-parameter Python code successfully without parameter mismatch", async () => {
      const code = `
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
`;

      const executionContract = {
        mode: "FUNCTION",
        functionName: "twoSum",
        parameters: [{ name: "nums", type: "integer[]" }, { name: "target", type: "integer" }],
        returnType: "integer[]"
      };

      const testCases = [
        { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] }
      ];

      const res = await executeCode({
        language: "python",
        code,
        testCases,
        executionContract
      });

      assert.equal(res.allPassed, true, `Expected Python execution to pass: ${res.results?.[0]?.error}`);
      assert.deepEqual(res.results[0].actualOutput, [0, 1]);
    });
  });

  describe("5. Error Classification & Graceful Fallbacks", () => {
    it("should classify candidate syntax error as COMPILE_ERROR", async () => {
      const code = `function solution(arr) { return arr. `;

      const res = await executeCode({
        language: "javascript",
        code,
        testCases: [{ input: [1, 2], expectedOutput: 2 }],
        executionContract: { mode: "FUNCTION", functionName: "solution", parameters: [{ name: "arr", type: "integer[]" }] }
      });

      assert.equal(res.allPassed, false);
      assert.ok(res.status === "COMPILATION_ERROR" || res.status === "COMPILE_ERROR");
    });

    it("should classify candidate runtime error cleanly without crashing platform", async () => {
      const code = `function solution(arr) { throw new Error("Custom candidate exception"); }`;

      const res = await executeCode({
        language: "javascript",
        code,
        testCases: [{ input: [1, 2], expectedOutput: 2 }],
        executionContract: { mode: "FUNCTION", functionName: "solution", parameters: [{ name: "arr", type: "integer[]" }] }
      });

      assert.equal(res.allPassed, false);
      assert.equal(res.status, "RUNTIME_ERROR");
      assert.ok(res.results[0].stderr.includes("Custom candidate exception"));
    });
  });

  describe("6. Phase 16 & 17 Regression — `arr.length` Single-Param & Cross-Language Tests", () => {
    it("should execute candidate using arr.length on [1,2,3] returning 3, [1,2,3,4] returning 4, [] returning 0", async () => {
      const code = `
function solution(arr) {
  return arr.length;
}
`;
      const testCases = [
        { input: [1, 2, 3], expectedOutput: 3 },
        { input: [1, 2, 3, 4], expectedOutput: 4 },
        { input: [], expectedOutput: 0 }
      ];

      const res = await executeCode({
        language: "javascript",
        code,
        testCases
      });

      assert.equal(res.allPassed, true, `JS arr.length should pass all test cases: ${res.results?.[0]?.error}`);
      assert.equal(res.results[0].actualOutput, 3);
      assert.equal(res.results[1].actualOutput, 4);
      assert.equal(res.results[2].actualOutput, 0);
    });

    it("should execute Python len(arr) on [1,2,3] returning 3 without parameter crash", async () => {
      const code = `
def solution(arr):
    return len(arr)
`;
      const testCases = [
        { input: [1, 2, 3], expectedOutput: 3 },
        { input: [], expectedOutput: 0 }
      ];

      const res = await executeCode({
        language: "python",
        code,
        testCases
      });

      assert.equal(res.allPassed, true, `Python len(arr) should pass: ${res.results?.[0]?.error}`);
      assert.equal(res.results[0].actualOutput, 3);
    });

    it("should auto-derive executionContract when omitted and execute twoSum correctly", async () => {
      const code = `
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}
`;
      const testCases = [
        { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] }
      ];

      const res = await executeCode({
        language: "javascript",
        code,
        testCases
        // executionContract omitted deliberately to verify auto-derivation
      });

      assert.equal(res.allPassed, true, `Auto-derived executionContract should execute twoSum: ${res.results?.[0]?.error}`);
      assert.deepEqual(res.results[0].actualOutput, [0, 1]);
    });
  });
});
