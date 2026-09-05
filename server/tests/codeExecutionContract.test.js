import { describe, it } from "node:test";
import assert from "node:assert";
import { executeCode } from "../src/services/codeExecution/executionService.js";
import { compareOutputs } from "../src/services/codeExecution/outputComparator.js";

describe("Code Execution Contract & Blank Output Fix Test Suite", () => {
  
  describe("1. Output Comparator & Output State Classification", () => {
    it("should classify undefined returns explicitly as UNDEFINED_RETURN", () => {
      const res = compareOutputs(undefined, ["o", "l", "l", "e", "h"], "UNDEFINED_RETURN");
      assert.strictEqual(res.passed, false);
      assert.strictEqual(res.outputState, "UNDEFINED_RETURN");
      assert.strictEqual(res.actualNormalized, "undefined");
    });

    it("should classify null returns explicitly as NULL_RETURN", () => {
      const res = compareOutputs(null, ["o", "l", "l", "e", "h"], "NULL_RETURN");
      assert.strictEqual(res.passed, false);
      assert.strictEqual(res.outputState, "NULL_RETURN");
      assert.strictEqual(res.actualNormalized, null);
    });

    it("should compare array results structurally without flattening to raw string", () => {
      const res = compareOutputs(["o", "l", "l", "e", "h"], ["o", "l", "l", "e", "h"]);
      assert.strictEqual(res.passed, true);
      assert.deepStrictEqual(res.actualNormalized, ["o", "l", "l", "e", "h"]);
    });
  });

  describe("2. JavaScript Language Execution Contract (reverseString Regression)", () => {
    it("should return ACCEPTED for correct JavaScript solution returning array", async () => {
      const code = `
function reverseString(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    [s[left], s[right]] = [s[right], s[left]];
    left++; right--;
  }
  return s;
}
`;
      const result = await executeCode({
        language: "javascript",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, true);
      assert.strictEqual(result.status, "ACCEPTED");
      assert.deepStrictEqual(result.results[0].actualOutput, ["o","l","l","e","h"]);
    });

    it("should return WRONG_ANSWER with explicit UNDEFINED_RETURN when solution returns undefined", async () => {
      const code = `
function reverseString(s) {
  // Forget return statement
  s.reverse();
}
`;
      const result = await executeCode({
        language: "javascript",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, false);
      assert.strictEqual(result.status, "WRONG_ANSWER");
      assert.strictEqual(result.results[0].outputState, "UNDEFINED_RETURN");
      assert.strictEqual(result.results[0].actualOutput, "undefined");
    });
  });

  describe("3. Python Language Execution Contract", () => {
    it("should return ACCEPTED for correct Python solution returning list", async () => {
      const code = `
def reverseString(s):
    return s[::-1]
`;
      const result = await executeCode({
        language: "python",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, true);
      assert.strictEqual(result.status, "ACCEPTED");
      assert.deepStrictEqual(result.results[0].actualOutput, ["o","l","l","e","h"]);
    });

    it("should return WRONG_ANSWER with NULL_RETURN when Python function returns None", async () => {
      const code = `
def reverseString(s):
    s.reverse()
    # returns None
`;
      const result = await executeCode({
        language: "python",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, false);
      assert.strictEqual(result.status, "WRONG_ANSWER");
      assert.strictEqual(result.results[0].outputState, "NULL_RETURN");
      assert.strictEqual(result.results[0].actualOutput, null);
    });
  });

  describe("4. Java Language Execution Contract", () => {
    it("should return ACCEPTED for correct Java Solution method returning char[]", async () => {
      const code = `
public class Solution {
    public char[] reverseString(char[] s) {
        int left = 0, right = s.length - 1;
        while (left < right) {
            char tmp = s[left];
            s[left] = s[right];
            s[right] = tmp;
            left++; right--;
        }
        return s;
    }
}
`;
      const result = await executeCode({
        language: "java",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, true);
      assert.strictEqual(result.status, "ACCEPTED");
      assert.deepStrictEqual(result.results[0].actualOutput, ["o","l","l","e","h"]);
    });
  });

  describe("5. C++ Language Execution Contract", () => {
    it("should return ACCEPTED for correct C++ Solution class method returning vector<char>", async () => {
      const code = `
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<char> reverseString(vector<char>& s) {
        reverse(s.begin(), s.end());
        return s;
    }
};
`;
      const result = await executeCode({
        language: "cpp",
        code,
        testCases: [{ _id: "t1", input: { s: ["h","e","l","l","o"] }, expectedOutput: ["o","l","l","e","h"] }],
        executionContract: { mode: "FUNCTION", functionName: "reverseString", parameters: [{ name: "s" }] }
      });

      assert.strictEqual(result.allPassed, true);
      assert.strictEqual(result.status, "ACCEPTED");
      assert.deepStrictEqual(result.results[0].actualOutput, ["o","l","l","e","h"]);
    });
  });
});
