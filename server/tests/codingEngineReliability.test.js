import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAllStarterCodes, getLanguageType } from "../src/services/codeExecution/starterCodeGenerator.js";
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
      assert.ok(starters.cpp.includes("vector<int> twoSum(const vector<int>& nums, int target)"), `C++ starter should include signature: ${starters.cpp}`);
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
      assert.ok(starters.cpp.includes("int findMax(const vector<int>& arr)"), `C++: ${starters.cpp}`);
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

  describe("7. Golden Cross-Language & Contract Validation Tests", () => {
    it("should throw INVALID_CODING_CONTRACT when type metadata is null or invalid", () => {
      assert.throws(
        () => getLanguageType(null, "java"),
        /INVALID_CODING_CONTRACT/
      );
      assert.throws(
        () => getLanguageType("unknown_custom_type_xyz", "java"),
        /INVALID_CODING_CONTRACT/
      );
    });

    it("should execute Array Length challenge in Java and C++ with exact type signatures", async () => {
      const javaCode = `
class Solution {
    public int solution(int[] arr) {
        return arr.length;
    }
}
`;
      const executionContract = {
        mode: "FUNCTION",
        functionName: "solution",
        parameters: [{ name: "arr", type: "integer[]" }],
        returnType: "integer"
      };

      const testCases = [
        { input: [1, 2, 3], expectedOutput: 3 },
        { input: [], expectedOutput: 0 }
      ];

      const javaRes = await executeCode({
        language: "java",
        code: javaCode,
        testCases,
        executionContract
      });

      assert.equal(javaRes.allPassed, true, `Java array length execution failed: ${javaRes.results?.[0]?.error || javaRes.stderr}`);
      assert.equal(javaRes.results[0].actualOutput, 3);
      assert.equal(javaRes.results[1].actualOutput, 0);

      const cppCode = `
class Solution {
public:
    int solution(vector<int>& arr) {
        return arr.size();
    }
};
`;

      const cppRes = await executeCode({
        language: "cpp",
        code: cppCode,
        testCases,
        executionContract
      });

      assert.equal(cppRes.allPassed, true, `C++ array length execution failed: ${cppRes.results?.[0]?.error || cppRes.stderr}`);
      assert.equal(cppRes.results[0].actualOutput, 3);
      assert.equal(cppRes.results[1].actualOutput, 0);
    });

    it("should execute Two Integer Sum challenge in Java, Python, and JS with exact type signatures", async () => {
      const executionContract = {
        mode: "FUNCTION",
        functionName: "add",
        parameters: [
          { name: "a", type: "integer" },
          { name: "b", type: "integer" }
        ],
        returnType: "integer"
      };

      const testCases = [
        { input: [2, 3], expectedOutput: 5 },
        { input: [-1, 10], expectedOutput: 9 }
      ];

      const javaCode = `
class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}
`;
      const javaRes = await executeCode({
        language: "java",
        code: javaCode,
        testCases,
        executionContract
      });
      assert.equal(javaRes.allPassed, true, `Java integer add failed: ${javaRes.results?.[0]?.error}`);
      assert.equal(javaRes.results[0].actualOutput, 5);

      const pyCode = `
def add(a, b):
    return a + b
`;
      const pyRes = await executeCode({
        language: "python",
        code: pyCode,
        testCases,
        executionContract
      });
      assert.equal(pyRes.allPassed, true, `Python integer add failed: ${pyRes.results?.[0]?.error}`);
      assert.equal(pyRes.results[0].actualOutput, 5);
    });

    it("should execute String Length challenge in Java, Python, and C++ with string type signatures", async () => {
      const executionContract = {
        mode: "FUNCTION",
        functionName: "stringLength",
        parameters: [{ name: "s", type: "string" }],
        returnType: "integer"
      };

      const testCases = [
        { input: "hello", expectedOutput: 5 },
        { input: "", expectedOutput: 0 }
      ];

      const javaCode = `
class Solution {
    public int stringLength(String s) {
        return s.length();
    }
}
`;
      const javaRes = await executeCode({
        language: "java",
        code: javaCode,
        testCases,
        executionContract
      });
      assert.equal(javaRes.allPassed, true, `Java string length failed: ${javaRes.results?.[0]?.error}`);
      assert.equal(javaRes.results[0].actualOutput, 5);

      const cppCode = `
class Solution {
public:
    int stringLength(const string& s) {
        return s.length();
    }
};
`;
      const cppRes = await executeCode({
        language: "cpp",
        code: cppCode,
        testCases,
        executionContract
      });
      assert.equal(cppRes.allPassed, true, `C++ string length failed: ${cppRes.results?.[0]?.error}`);
      assert.equal(cppRes.results[0].actualOutput, 5);
    });

    it("should execute Object Input challenge in JS, Python, and Java with exact type signatures and input unpacking", async () => {
      const executionContract = {
        mode: "FUNCTION",
        functionName: "solution",
        parameters: [{ name: "input", type: "object" }],
        returnType: "integer"
      };

      const testCases = [
        { input: { nums: [1, 2, 1, 1, 1], k: 3 }, expectedOutput: 3 }
      ];

      // JavaScript
      const jsCode = `
function solution(input) {
  const nums = input.nums;
  const k = input.k;
  let maxLen = 0, currentSum = 0, left = 0;
  for (let right = 0; right < nums.length; right++) {
    currentSum += nums[right];
    while (currentSum > k && left <= right) {
      currentSum -= nums[left];
      left++;
    }
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
`;
      const jsRes = await executeCode({
        language: "javascript",
        code: jsCode,
        testCases,
        executionContract
      });
      assert.equal(jsRes.allPassed, true, `JS Object input execution failed: ${jsRes.results?.[0]?.error}`);
      assert.equal(jsRes.results[0].actualOutput, 3);

      // Python
      const pyCode = `
def solution(input):
    nums = input['nums']
    k = input['k']
    max_len, current_sum, left = 0, 0, 0
    for right in range(len(nums)):
        current_sum += nums[right]
        while current_sum > k and left <= right:
            current_sum -= nums[left]
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len
`;
      const pyRes = await executeCode({
        language: "python",
        code: pyCode,
        testCases,
        executionContract
      });
      assert.equal(pyRes.allPassed, true, `Python Object input execution failed: ${pyRes.results?.[0]?.error}`);
      assert.equal(pyRes.results[0].actualOutput, 3);

      // Java
      const javaCode = `
import java.util.*;

class Solution {
    public int solution(Map<String, Object> input) {
        int[] nums = (int[]) input.get("nums");
        int k = (int) input.get("k");
        int maxLen = 0, currentSum = 0, left = 0;
        for (int right = 0; right < nums.length; right++) {
            currentSum += nums[right];
            while (currentSum > k && left <= right) {
                currentSum -= nums[left];
                left++;
            }
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
}
`;
      const javaRes = await executeCode({
        language: "java",
        code: javaCode,
        testCases,
        executionContract
      });
      assert.equal(javaRes.allPassed, true, `Java Object input execution failed: ${javaRes.results?.[0]?.error || javaRes.stderr}`);
      assert.equal(javaRes.results[0].actualOutput, 3);
    });

    it("should NEVER generate 'search()' as default function name for object or array questions", () => {
      const starters = generateAllStarterCodes({
        functionName: "solution",
        parameters: [{ name: "input", type: "object" }],
        returnType: "integer"
      });

      assert.equal(starters.java.includes("search()"), false);
      assert.equal(starters.cpp.includes("search()"), false);
      assert.equal(starters.python.includes("search()"), false);
      assert.equal(starters.javascript.includes("search()"), false);
      assert.ok(starters.java.includes("public int solution(Map<String, Object> input)"));
    });
  });
});
