import { runJavaScript } from "./javascriptRunner.js";

const LANGUAGE_RUNNERS = {
  javascript: runJavaScript,
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
