import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeCode } from "../src/services/codeExecution/executionService.js";

describe("Cross-Language Code Execution Infrastructure Suite", () => {
  const binarySearchTestCases = [
    {
      _id: "tc-1",
      input: { nums: [10, 20, 30, 40, 50], target: 30 },
      expectedOutput: 2,
    },
    {
      _id: "tc-2",
      input: { nums: [10, 20, 30, 40, 50], target: 99 },
      expectedOutput: -1,
    },
  ];

  const executionContract = {
    mode: "FUNCTION",
    functionName: "search",
    parameters: [
      { name: "nums", type: "INTEGER_ARRAY" },
      { name: "target", type: "INTEGER" }
    ],
    returnType: "INTEGER"
  };

  // ── 1. JAVA EXECUTIONS ──────────────────────────────────────────────────
  describe("1. Java Language Adapter", () => {
    it("Java: Correct Solution → ACCEPTED (2/2 Passed)", async () => {
      const code = `
public class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`;
      const res = await executeCode({
        language: "java",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "ACCEPTED");
      assert.equal(res.passedTests, 2);
      assert.equal(res.totalTests, 2);
    });

    it("Java: Wrong Answer → WRONG_ANSWER", async () => {
      const code = `
class Solution {
    public int search(int[] nums, int target) {
        return 0;
    }
}
`;
      const res = await executeCode({
        language: "java",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "WRONG_ANSWER");
      assert.equal(res.allPassed, false);
    });

    it("Java: Syntax Error → COMPILATION_ERROR", async () => {
      const code = `
class Solution {
    public int search(int[] nums, int target) {
        return 0
    }
}
`;
      const res = await executeCode({
        language: "java",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "COMPILATION_ERROR");
      assert.ok(res.results[0].error.length > 0);
    });

    it("Java: Exception → RUNTIME_ERROR", async () => {
      const code = `
class Solution {
    public int search(int[] nums, int target) {
        throw new NullPointerException("Simulated crash");
    }
}
`;
      const res = await executeCode({
        language: "java",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "RUNTIME_ERROR");
      assert.ok(res.results[0].error.includes("NullPointerException"));
    });
  });

  // ── 2. JAVASCRIPT EXECUTIONS ─────────────────────────────────────────────
  describe("2. JavaScript Language Adapter", () => {
    it("JavaScript: Correct Solution → ACCEPTED (2/2 Passed)", async () => {
      const code = `
function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
`;
      const res = await executeCode({
        language: "javascript",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "ACCEPTED");
      assert.equal(res.passedTests, 2);
    });

    it("JavaScript: Wrong Answer → WRONG_ANSWER", async () => {
      const code = `
function search(nums, target) {
  return 0;
}
`;
      const res = await executeCode({
        language: "javascript",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "WRONG_ANSWER");
    });

    it("JavaScript: TypeError → RUNTIME_ERROR", async () => {
      const code = `
function search(nums, target) {
  nums.nonExistentMethod();
  return 0;
}
`;
      const res = await executeCode({
        language: "javascript",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "RUNTIME_ERROR");
      assert.ok(res.results[0].error.includes("TypeError"));
    });
  });

  // ── 3. PYTHON EXECUTIONS ─────────────────────────────────────────────────
  describe("3. Python Language Adapter", () => {
    it("Python: Correct Solution → ACCEPTED (2/2 Passed)", async () => {
      const code = `
def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
`;
      const res = await executeCode({
        language: "python",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "ACCEPTED");
      assert.equal(res.passedTests, 2);
    });

    it("Python: Wrong Answer → WRONG_ANSWER", async () => {
      const code = `
def search(nums, target):
    return 0
`;
      const res = await executeCode({
        language: "python",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "WRONG_ANSWER");
    });

    it("Python: IndexError → RUNTIME_ERROR", async () => {
      const code = `
def search(nums, target):
    return nums[999]
`;
      const res = await executeCode({
        language: "python",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "RUNTIME_ERROR");
      assert.ok(res.results[0].error.includes("IndexError"));
    });
  });

  // ── 4. C++ EXECUTIONS ────────────────────────────────────────────────────
  describe("4. C++ Language Adapter", () => {
    it("C++: Correct Solution → ACCEPTED (2/2 Passed)", async () => {
      const code = `
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
};
`;
      const res = await executeCode({
        language: "cpp",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "ACCEPTED");
      assert.equal(res.passedTests, 2);
    });

    it("C++: Wrong Answer → WRONG_ANSWER", async () => {
      const code = `
class Solution {
public:
    int search(vector<int>& nums, int target) {
        return 0;
    }
};
`;
      const res = await executeCode({
        language: "cpp",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "WRONG_ANSWER");
    });

    it("C++: Compilation Error → COMPILATION_ERROR", async () => {
      const code = `
class Solution {
public:
    int search(vector<int>& nums, int target) {
        return missing_variable;
    }
};
`;
      const res = await executeCode({
        language: "cpp",
        code,
        testCases: binarySearchTestCases,
        executionContract
      });

      assert.equal(res.status, "COMPILATION_ERROR");
      assert.ok(res.results[0].error.includes("missing_variable"));
    });
  });

  // ── 5. CROSS-LANGUAGE TIMEOUT TEST ───────────────────────────────────────
  describe("5. Time Limit Exceeded", () => {
    it("Python: Infinite loop → TIME_LIMIT_EXCEEDED", async () => {
      const code = `
def search(nums, target):
    while True:
        pass
`;
      const res = await executeCode({
        language: "python",
        code,
        testCases: [binarySearchTestCases[0]],
        executionContract
      });

      assert.equal(res.status, "TIME_LIMIT_EXCEEDED");
    });
  });

  // ── 6. CONCURRENCY & ISOLATION TEST ─────────────────────────────────────
  describe("6. Concurrency Isolation Test", () => {
    it("should execute 10 concurrent requests without temp file collision", async () => {
      const runs = Array.from({ length: 10 }).map((_, i) => {
        const lang = i % 2 === 0 ? "python" : "javascript";
        const code = lang === "python"
          ? `def search(nums, target):\n    return ${i === 0 ? "2" : "-1"}`
          : `function search(nums, target) { return ${i === 0 ? "2" : "-1"}; }`;

        return executeCode({
          language: lang,
          code,
          testCases: [binarySearchTestCases[0]],
          executionContract
        });
      });

      const results = await Promise.all(runs);
      assert.equal(results.length, 10);
      assert.equal(results[0].status, "ACCEPTED");
      assert.equal(results[1].status, "WRONG_ANSWER");
    });
  });
});
