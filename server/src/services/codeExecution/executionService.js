/**
 * Canonical Code Execution Service
 * Orchestrates cross-language execution using LanguageRegistry and Adapters.
 */

import { languageRegistry } from "./languageRegistry.js";
import { compareOutputs, classifyResultStatus } from "./outputComparator.js";
import { inferParameters, inferReturnType } from "./questionNormalizationService.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_TIMEOUT_MS = 6000;

export const executeCode = async ({
  language,
  code,
  testCases = [],
  executionContract = null
}) => {
  const adapter = languageRegistry.getAdapter(language);

  if (!adapter) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Ensure executionContract is fully populated
  let finalContract = executionContract;
  if (!finalContract || !Array.isArray(finalContract.parameters) || finalContract.parameters.length === 0) {
    const inferredParams = inferParameters({ testCases, execution: executionContract });
    const fnName = executionContract?.functionName || adapter.discoverFunctionName?.(code) || "solution";
    finalContract = {
      mode: executionContract?.mode || "FUNCTION",
      functionName: fnName,
      parameters: inferredParams,
      returnType: executionContract?.returnType || inferReturnType({ testCases }) || "AUTO"
    };
  }

  const results = [];
  const executionId = crypto.randomUUID().slice(0, 8);

  for (const testCase of testCases) {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), `careerpilot-exec-${executionId}-`));
    const startedAt = Date.now();

    let compileRes = { status: "completed", exitCode: 0 };
    let execRes = { status: "failed", stdout: "", stderr: "" };

    try {
      // 1. Prepare Adapter Source & Harness
      await adapter.prepare({
        code,
        executionContract: finalContract,
        testCase,
        tempDir: tempDirectory
      });

      // 2. Compile Phase (Java / C++)
      compileRes = await adapter.compile({
        tempDir: tempDirectory,
        timeoutMs: 10000
      });

      if (compileRes.status === "completed" && compileRes.exitCode === 0) {
        // 3. Execute Phase
        execRes = await adapter.execute({
          tempDir: tempDirectory,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          stdinInput: finalContract?.mode === "STDIN" ? String(testCase.input) : null
        });
      } else {
        execRes = { ...compileRes, isCompileStage: true };
      }
    } catch (err) {
      execRes = {
        status: "failed",
        stdout: "",
        stderr: err.message || "Execution exception",
        exitCode: 1
      };
    } finally {
      await rm(tempDirectory, { recursive: true, force: true }).catch(() => {});
    }

    const executionTimeMs = Date.now() - startedAt;

    // Output parsing
    let actualOutput = null;
    let userStdout = "";
    let parseError = null;

    const rawStdout = execRes.stdout || "";
    const rawStderr = execRes.stderr || "";

    const startIdx = rawStdout.indexOf("__CP_OUTPUT_START__");
    const endIdx = rawStdout.indexOf("__CP_OUTPUT_END__");

    if (startIdx !== -1 && endIdx !== -1) {
      userStdout = rawStdout.slice(0, startIdx).trim();
      const jsonStr = rawStdout.slice(startIdx + "__CP_OUTPUT_START__".length, endIdx).trim();
      try {
        actualOutput = JSON.parse(jsonStr);
      } catch (e) {
        actualOutput = jsonStr;
        parseError = e.message;
      }
    } else {
      userStdout = rawStdout.trim();
      actualOutput = userStdout;
    }

    const comparison = compareOutputs(actualOutput, testCase.expectedOutput);
    const resultStatus = classifyResultStatus({
      exitCode: execRes.exitCode,
      stderr: rawStderr,
      stdout: rawStdout,
      timedOut: execRes.timedOut,
      outputLimitExceeded: execRes.outputLimitExceeded,
      passed: comparison.passed,
      parseError,
      isCompileStage: !!execRes.isCompileStage
    });

    results.push({
      testCaseId: testCase._id || testCase.id,
      passed: comparison.passed,
      actualOutput: comparison.actualNormalized,
      expectedOutput: comparison.expectedNormalized,
      executionTimeMs,
      stdout: userStdout,
      stderr: rawStderr,
      error: rawStderr || parseError || "",
      status: resultStatus,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  const overallStatus = results.every(r => r.status === "ACCEPTED")
    ? "ACCEPTED"
    : results.find(r => r.status !== "ACCEPTED")?.status || "WRONG_ANSWER";

  return {
    results,
    status: overallStatus,
    passedTests,
    totalTests: results.length,
    allPassed: passedTests === results.length,
  };
};
