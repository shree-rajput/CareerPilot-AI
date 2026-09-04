import CodingQuestion from "../models/CodingQuestions.js";
import CodingSubmission from "../models/CodingSubmission.js";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";
import { InterviewSession } from "../models/InterviewSession.js";
import { executeCode } from "../services/codeExecution/executionService.js";

const ALLOWED_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
]);

const sendErrorResponse = (res, status, code, message) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

export const executeRoomCodeController = async (req, res) => {
  try {
    const roomId = req.params.roomId || req.params.sessionId;
    const userId = req.user?._id;
    const { questionId, language, code } = req.body || {};

    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required to execute code."
      );
    }

    if (!roomId) {
      return sendErrorResponse(
        res,
        400,
        "INVALID_EXECUTION_PAYLOAD",
        "Room or session ID is required."
      );
    }

    if (!language || !ALLOWED_LANGUAGES.has(language.toLowerCase())) {
      return sendErrorResponse(
        res,
        400,
        "UNSUPPORTED_LANGUAGE",
        `Language '${language}' is not supported. Supported: ${Array.from(ALLOWED_LANGUAGES).join(", ")}.`
      );
    }

    if (typeof code !== "string" || !code.trim()) {
      return sendErrorResponse(
        res,
        400,
        "INVALID_EXECUTION_PAYLOAD",
        "Code submission cannot be empty."
      );
    }

    if (code.length > 100000) {
      return sendErrorResponse(
        res,
        400,
        "INVALID_EXECUTION_PAYLOAD",
        "Code submission exceeds maximum permitted length (100KB)."
      );
    }

    // 1. Check room or session access
    let authorized = false;
    let roomProblem = null;
    let targetUserId = userId;

    const peerRoom = await PeerInterviewRoom.findOne({ roomId }).lean();

    if (peerRoom) {
      const isParticipant =
        peerRoom.participants?.some(
          (p) => p.userId?.toString() === userId.toString()
        ) || peerRoom.createdBy?.toString() === userId.toString();

      if (!isParticipant) {
        return sendErrorResponse(
          res,
          403,
          "ROOM_ACCESS_DENIED",
          "You are not authorized to execute code in this room."
        );
      }
      authorized = true;
      roomProblem = peerRoom.problem;
    } else {
      if (typeof roomId === "string" && roomId.match(/^[0-9a-fA-F]{24}$/)) {
        const session = await InterviewSession.findById(roomId).select("_id userId").lean();
        if (session && session.userId?.toString() === userId.toString()) {
          authorized = true;
          targetUserId = session.userId;
        }
      } else {
        // Active Tech Discussion roomId
        authorized = true;
      }
    }

    if (!authorized) {
      return sendErrorResponse(
        res,
        404,
        "ROOM_ACCESS_DENIED",
        "Active technical discussion room or interview session not found."
      );
    }

    // 2. Resolve Test Cases based on runMode ('run' vs 'submit')
    const runMode = req.body?.runMode || "run";
    let testCasesToRun = [];

    if (questionId && typeof questionId === "string" && questionId.match(/^[0-9a-fA-F]{24}$/)) {
      const dbQuestion = await CodingQuestion.findById(questionId).lean();
      if (dbQuestion?.testCases?.length > 0) {
        testCasesToRun = runMode === "run"
          ? dbQuestion.testCases.filter((tc) => !tc.hidden)
          : dbQuestion.testCases;
      }
    }

    if (testCasesToRun.length === 0 && roomProblem?.testCases?.length > 0) {
      testCasesToRun = runMode === "run"
        ? roomProblem.testCases.filter((tc) => !tc.hidden)
        : roomProblem.testCases;
    }

    if (testCasesToRun.length === 0) {
      testCasesToRun = [
        {
          _id: "default-test-1",
          input: "test",
          expectedOutput: "test",
          explanation: "Default execution verification",
        },
      ];
    }

    // 3. Normalize language execution
    const normLang = language.toLowerCase() === "typescript" ? "javascript" : language.toLowerCase();

    // 4. Safely execute code in child process sandbox
    let executionResult;
    try {
      executionResult = await executeCode({
        language: normLang,
        code,
        testCases: testCasesToRun,
      });
    } catch (execError) {
      console.error("Sandbox execution error:", execError);
      if (execError.message?.includes("Unsupported language")) {
        return sendErrorResponse(res, 400, "UNSUPPORTED_LANGUAGE", execError.message);
      }
      return sendErrorResponse(
        res,
        503,
        "EXECUTION_SERVICE_UNAVAILABLE",
        execError.message || "Code execution service encountered an isolated sandbox error."
      );
    }

    // Aggregate primary result details
    const firstResult = executionResult.results?.[0] || {};
    const stdoutLogs = executionResult.results?.map(r => r.stdout).filter(Boolean) || [];
    const stdout = stdoutLogs.join("\n") || (firstResult.actualOutput !== undefined && firstResult.actualOutput !== null ? String(firstResult.actualOutput) : "");
    
    const stderrArr = executionResult.results?.map(r => r.error).filter(Boolean) || [];
    const stderr = stderrArr.join("\n") || firstResult.error || "";
    const executionTimeMs = executionResult.results?.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0) || 0;

    // Standardize status and verdict breakdown
    let status = "SUCCESS";
    let verdict = executionResult.allPassed ? "Accepted" : "Wrong Answer";
    let compileError = null;
    let runtimeError = null;

    const lowerErr = stderr.toLowerCase();
    if (lowerErr.includes("syntaxerror") || lowerErr.includes("indentationerror") || lowerErr.includes("compilation error") || lowerErr.includes("syntax error")) {
      status = "COMPILE_ERROR";
      verdict = "Compilation Error";
      compileError = stderr;
    } else if (lowerErr.includes("time limit exceeded") || lowerErr.includes("timeout")) {
      status = "TIMEOUT";
      verdict = "Time Limit Exceeded";
      runtimeError = "Execution timed out.";
    } else if (stderr.trim().length > 0 && !executionResult.allPassed) {
      status = "RUNTIME_ERROR";
      verdict = "Runtime Error";
      runtimeError = stderr;
    }

    const passedTests = executionResult.passedTests || 0;
    const totalTests = executionResult.totalTests || 0;
    const failedTests = Math.max(0, totalTests - passedTests);

    // Log submission record safely
    let submission = null;
    try {
      submission = await CodingSubmission.create({
        candidateId: targetUserId,
        interviewSessionId: roomId,
        questionId: questionId || roomProblem?.id || "custom-scenario",
        language,
        code,
        status: status === "SUCCESS" && executionResult.allPassed ? "completed" : "failed",
        passedTests,
        totalTests,
        testResults: executionResult.results,
        submittedAt: new Date(),
      });

      await PeerInterviewRoom.findOneAndUpdate(
        { roomId },
        {
          $push: {
            submissions: {
              userId: targetUserId,
              code,
              language,
              status: status === "SUCCESS" && executionResult.allPassed ? "completed" : "failed",
              passedTests,
              totalTests,
              submittedAt: new Date(),
            }
          }
        }
      ).catch(() => {});
    } catch (dbErr) {
      console.warn("Non-fatal: Failed to persist submission record:", dbErr.message);
    }

    const responsePayload = {
      submissionId: submission?._id || null,
      status,
      verdict,
      passedTests,
      totalTests,
      failedTests,
      passed: passedTests,
      total: totalTests,
      allPassed: executionResult.allPassed,
      results: executionResult.results,
      testResults: executionResult.results,
      stdout,
      stderr,
      compileError,
      runtimeError,
      executionTimeMs,
      message: executionResult.allPassed 
        ? "All test cases passed successfully!" 
        : `Passed ${passedTests} of ${totalTests} test cases.`
    };

    return res.status(200).json({
      success: true,
      result: {
        stdout,
        stderr,
        exitCode: status === "SUCCESS" && executionResult.allPassed ? 0 : 1,
        executionTimeMs,
      },
      data: responsePayload
    });
  } catch (error) {
    console.error("Canonical execute code error:", error);

    return sendErrorResponse(
      res,
      500,
      "CODE_EXECUTION_FAILED",
      error.message || "Failed to execute code safely. Internal execution error."
    );
  }
};

export const runCode = executeRoomCodeController;

