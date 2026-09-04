import { runJavaScript } from "./javascriptRunner.js";
import { runPython } from "./pythonRunner.js";
import { runJava } from "./javaRunner.js";
import { runCpp } from "./cppRunner.js";

const LANGUAGE_RUNNERS = {
  javascript: runJavaScript,
  typescript: runJavaScript,
  python: runPython,
  java: runJava,
  cpp: runCpp,
  "c++": runCpp,
};

export const executeCode = async ({ language, code, testCases }) => {
  const runner = LANGUAGE_RUNNERS[language];

  if (!runner) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const results = [];

  for (const testCase of testCases) {
    const startedAt = Date.now();

    const result = await runner({
      code,
      input: testCase.input,
    });

    const executionTimeMs = Date.now() - startedAt;

    let actualOutput = null;

    if (result.status === "completed") {
      try {
        actualOutput = JSON.parse(result.stdout.trim());
      } catch {
        actualOutput = result.stdout.trim();
      }
    }

    const passed =
      result.status === "completed" &&
      JSON.stringify(actualOutput) === JSON.stringify(testCase.expectedOutput);

    results.push({
      testCaseId: testCase._id,

      passed,

      actualOutput,

      expectedOutput: testCase.expectedOutput,

      executionTimeMs,

      error: result.stderr || "",
    });
  }

  const passedTests = results.filter((result) => result.passed).length;

  return {
    results,

    passedTests,

    totalTests: results.length,

    allPassed: passedTests === results.length,
  };
};
