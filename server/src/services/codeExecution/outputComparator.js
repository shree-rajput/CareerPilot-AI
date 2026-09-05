/**
 * Cross-Language Output Comparator & Result State Classifier
 */

export function compareOutputs(actual, expected, inputOutputState = "ACTUAL_OUTPUT") {
  let outputState = inputOutputState;

  // Handle undefined return explicitly
  if (actual === undefined || outputState === "UNDEFINED_RETURN") {
    return {
      passed: false,
      actualNormalized: "undefined",
      expectedNormalized: expected,
      outputState: "UNDEFINED_RETURN"
    };
  }

  // Handle null return explicitly
  if (actual === null || outputState === "NULL_RETURN") {
    const passed = expected === null || expected === "null";
    return {
      passed,
      actualNormalized: null,
      expectedNormalized: expected,
      outputState: "NULL_RETURN"
    };
  }

  // 1. Exact structural equality check
  if (actual === expected) {
    return { passed: true, actualNormalized: actual, expectedNormalized: expected, outputState: "ACTUAL_OUTPUT" };
  }

  // 2. Structural JSON equality check
  const actualJson = normalizeJson(actual);
  const expectedJson = normalizeJson(expected);

  if (actualJson !== null && expectedJson !== null) {
    const passed = JSON.stringify(actualJson) === JSON.stringify(expectedJson);
    return { passed, actualNormalized: actualJson, expectedNormalized: expectedJson, outputState: "ACTUAL_OUTPUT" };
  }

  // 3. String normalization check (whitespace, line endings)
  const actualStr = String(actual !== null ? actual : "").trim().replace(/\r\n/g, "\n");
  const expectedStr = String(expected !== null ? expected : "").trim().replace(/\r\n/g, "\n");

  const passed = actualStr === expectedStr;
  return { 
    passed, 
    actualNormalized: actualJson ?? (actual !== null ? actual : actualStr), 
    expectedNormalized: expectedJson ?? (expected !== null ? expected : expectedStr), 
    outputState: "ACTUAL_OUTPUT" 
  };
}

function normalizeJson(val) {
  if (typeof val === "object" && val !== null) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function classifyResultStatus(executionDetails) {
  const {
    stderr = "",
    stdout = "",
    exitCode,
    timedOut,
    outputLimitExceeded,
    passed,
    parseError,
    isCompileStage = false,
  } = executionDetails;

  if (timedOut) {
    return "TIME_LIMIT_EXCEEDED";
  }

  if (outputLimitExceeded) {
    return "MEMORY_LIMIT_EXCEEDED";
  }

  const lowerErr = (stderr || "").toLowerCase();

  // Check signature mismatch errors
  if (
    lowerErr.includes("invalid_solution_signature") ||
    lowerErr.includes("cannot find symbol method") ||
    lowerErr.includes("your code must define")
  ) {
    return "INVALID_SOLUTION_SIGNATURE";
  }

  // Check explicit compiler or parse/syntax errors
  const isCompilerError = lowerErr.includes("javac:") || lowerErr.includes("g++:") || lowerErr.includes("compilation error");
  const isSyntaxError = lowerErr.includes("syntaxerror:") || lowerErr.includes("indentationerror:");

  if (isCompileStage || isCompilerError || (isSyntaxError && exitCode !== 0)) {
    return "COMPILATION_ERROR";
  }

  // Check runtime errors (exceptions, tracebacks, runtime crashes)
  if (exitCode !== 0) {
    return "RUNTIME_ERROR";
  }

  if (passed) {
    return "ACCEPTED";
  }

  return "WRONG_ANSWER";
}
