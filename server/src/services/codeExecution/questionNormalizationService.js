/**
 * Question Normalization & Validation Service
 * Enforces a strict data contract for coding questions before persistence or execution.
 */

import mongoose from "mongoose";
import { generateAllStarterCodes } from "./starterCodeGenerator.js";

/**
 * Infers a clean camelCase function name from a question title or text if not provided.
 */
export function inferFunctionNameFromTitle(title = "") {
  if (!title || typeof title !== "string") return "solution";

  const lower = title.toLowerCase().trim();
  if (lower.includes("two sum")) return "twoSum";
  if (lower.includes("max") && lower.includes("subarray")) return "maxSubArray";
  if (lower.includes("palindrome")) return "isPalindrome";
  if (lower.includes("anagram")) return "isAnagram";
  if (lower.includes("reverse") && lower.includes("string")) return "reverseString";
  if (lower.includes("reverse") && lower.includes("list")) return "reverseList";
  if (lower.includes("fibonacci")) return "fibonacci";
  if (lower.includes("fizz") && lower.includes("buzz")) return "fizzBuzz";
  if (lower.includes("valid") && lower.includes("parentheses")) return "isValid";
  if (lower.includes("merge") && lower.includes("sorted")) return "mergeTwoLists";

  // Convert generic title "Find Maximum Element" -> "findMaximumElement"
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "solution";
  if (words.length === 1) return words[0].toLowerCase();

  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")
  );
}

/**
 * Infers parameters from question metadata or test case input shape.
 */
export function inferParameters(rawQuestion = {}) {
  if (Array.isArray(rawQuestion.parameters) && rawQuestion.parameters.length > 0) {
    return rawQuestion.parameters.map((p, i) => ({
      name: p.name || `arg${i + 1}`,
      type: p.type || "AUTO",
    }));
  }

  if (Array.isArray(rawQuestion.execution?.parameters) && rawQuestion.execution.parameters.length > 0) {
    return rawQuestion.execution.parameters.map((p, i) => ({
      name: p.name || `arg${i + 1}`,
      type: p.type || "AUTO",
    }));
  }

  // Infer from test cases
  const testCases = rawQuestion.testCases || [];
  if (testCases.length > 0 && testCases[0].input !== undefined) {
    const inputVal = testCases[0].input;

    if (inputVal !== null && typeof inputVal === "object" && !Array.isArray(inputVal)) {
      const keys = Object.keys(inputVal);
      return keys.map((key) => {
        const val = inputVal[key];
        const inferredType = Array.isArray(val) ? "integer[]" : typeof val;
        return { name: key, type: inferredType };
      });
    }

    if (Array.isArray(inputVal)) {
      // Check if this array represents multiple positional arguments (e.g. [[1,2,3], 5] or ["hello", 3])
      const hasArrayArg = Array.isArray(inputVal[0]);
      const hasMixedTypes = inputVal.length > 1 && inputVal.some(item => typeof item !== typeof inputVal[0]);
      const isMultiArg = inputVal.length > 1 && (hasArrayArg || hasMixedTypes);

      if (isMultiArg) {
        return inputVal.map((val, idx) => {
          const name = idx === 0 ? (Array.isArray(val) ? "nums" : "a") : idx === 1 ? "target" : `arg${idx + 1}`;
          const type = Array.isArray(val) ? "integer[]" : typeof val === "number" ? (Number.isInteger(val) ? "integer" : "double") : typeof val;
          return { name, type };
        });
      }

      const elemType = inputVal.length > 0 && typeof inputVal[0] === "string" ? "string[]" : "integer[]";
      return [{ name: "arr", type: elemType }];
    }

    if (typeof inputVal === "string") return [{ name: "s", type: "string" }];
    if (typeof inputVal === "number") return [{ name: "n", type: "integer" }];
    if (typeof inputVal === "boolean") return [{ name: "flag", type: "boolean" }];
  }

  return [{ name: "arr", type: "integer[]" }];
}

/**
 * Infers return type from expected output of first test case.
 */
export function inferReturnType(rawQuestion = {}) {
  if (rawQuestion.returnType && rawQuestion.returnType !== "AUTO") return rawQuestion.returnType;
  if (rawQuestion.execution?.returnType && rawQuestion.execution.returnType !== "AUTO") return rawQuestion.execution.returnType;

  const testCases = rawQuestion.testCases || [];
  if (testCases.length > 0 && testCases[0].expectedOutput !== undefined) {
    const out = testCases[0].expectedOutput;
    if (Array.isArray(out)) return "integer[]";
    if (typeof out === "boolean") return "boolean";
    if (typeof out === "string") return "string";
    if (typeof out === "number") return "integer";
  }

  return "AUTO";
}

/**
 * Normalizes and validates a coding question object against the canonical data contract.
 */
export function normalizeCodingQuestion(rawQuestion = {}) {
  const title = rawQuestion.title || rawQuestion.question || "Coding Challenge";
  const functionName = rawQuestion.functionName || rawQuestion.execution?.functionName || inferFunctionNameFromTitle(title);
  const parameters = inferParameters(rawQuestion);
  const returnType = inferReturnType(rawQuestion);

  // Generate question-aware starter codes for all languages
  const generatedStarters = generateAllStarterCodes({
    functionName,
    parameters,
    returnType,
  });

  const mergedStarterCode = {
    ...generatedStarters,
    ...(typeof rawQuestion.starterCode === "object" ? rawQuestion.starterCode : {}),
  };

  // Ensure every language has valid starter code matching the question functionName
  Object.keys(generatedStarters).forEach((lang) => {
    const existing = mergedStarterCode[lang];
    if (!existing || typeof existing !== "string" || existing.trim() === "" || !existing.includes(functionName)) {
      mergedStarterCode[lang] = generatedStarters[lang];
    }
  });

  const testCases = (rawQuestion.testCases || []).map((tc, index) => {
    const validId = tc._id && mongoose.Types.ObjectId.isValid(tc._id) ? tc._id : new mongoose.Types.ObjectId();
    return {
      _id: validId,
      id: tc.id || `tc-${index + 1}`,
      input: tc.input !== undefined ? tc.input : [],
      expectedOutput: tc.expectedOutput !== undefined ? tc.expectedOutput : null,
      explanation: tc.explanation || "",
      hidden: Boolean(tc.hidden),
      weight: typeof tc.weight === "number" ? tc.weight : 1,
    };
  });

  return {
    ...rawQuestion,
    question: title,
    title,
    description: rawQuestion.description || title,
    difficulty: rawQuestion.difficulty || "medium",
    technology: rawQuestion.technology || "Algorithms",
    language: rawQuestion.language || "javascript",
    functionName,
    parameters,
    returnType,
    starterCode: mergedStarterCode,
    execution: {
      mode: rawQuestion.execution?.mode || "FUNCTION",
      functionName,
      parameters,
      returnType,
    },
    testCases,
    requirements: rawQuestion.requirements || [],
    constraints: rawQuestion.constraints || [],
    evaluationCriteria: rawQuestion.evaluationCriteria || [],
    validationStatus: "valid",
  };
}
