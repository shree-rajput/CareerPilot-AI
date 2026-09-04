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
    let userStdout = "";
    let parseError = null;

    if (result.status === "completed") {
      const raw = result.stdout || "";
      const startIdx = raw.indexOf("__CP_OUTPUT_START__");
      const endIdx = raw.indexOf("__CP_OUTPUT_END__");

      if (startIdx !== -1 && endIdx !== -1) {
        userStdout = raw.slice(0, startIdx).trim();
        const jsonStr = raw.slice(startIdx + "__CP_OUTPUT_START__".length, endIdx).trim();
        try {
          actualOutput = JSON.parse(jsonStr);
        } catch (e) {
          actualOutput = jsonStr;
          parseError = e.message;
        }
      } else {
        userStdout = raw.trim();
        try {
          actualOutput = JSON.parse(raw.trim());
        } catch {
          actualOutput = raw.trim();
        }
      }
    } else {
      userStdout = (result.stdout || "").trim();
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
      stdout: userStdout,
      error: result.stderr || parseError || "",
      status: result.status,
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
