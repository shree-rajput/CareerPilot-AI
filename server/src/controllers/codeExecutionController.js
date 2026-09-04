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

    // 2. Resolve Test Cases
    let testCasesToRun = [];

    if (questionId && typeof questionId === "string" && questionId.match(/^[0-9a-fA-F]{24}$/)) {
      const dbQuestion = await CodingQuestion.findById(questionId).lean();
      if (dbQuestion?.testCases?.length > 0) {
        testCasesToRun = dbQuestion.testCases.filter((tc) => !tc.hidden);
      }
    }

    if (testCasesToRun.length === 0 && roomProblem?.testCases?.length > 0) {
      testCasesToRun = roomProblem.testCases.filter((tc) => !tc.hidden);
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
        "Code execution service encountered an isolated sandbox error."
      );
    }

    // Aggregate primary result details
    const firstResult = executionResult.results?.[0] || {};
    const stdout = firstResult.actualOutput !== undefined && firstResult.actualOutput !== null ? String(typeof firstResult.actualOutput === "object" ? JSON.stringify(firstResult.actualOutput) : firstResult.actualOutput) : "";
    const stderr = firstResult.error || "";
    const exitCode = firstResult.passed ? 0 : (executionResult.allPassed ? 0 : 1);
    const executionTimeMs = executionResult.results?.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0) || 0;

    if (stderr.includes("Time limit exceeded") || stderr.includes("timeout")) {
      return sendErrorResponse(res, 408, "EXECUTION_TIMEOUT", "Code execution exceeded the allowed time.");
    }

    // 5. Log submission safely
    let submission = null;
    try {
      submission = await CodingSubmission.create({
        candidateId: targetUserId,
        interviewSessionId: roomId,
        questionId: questionId || roomProblem?.id || "custom-scenario",
        language,
        code,
        status: executionResult.allPassed ? "completed" : "failed",
        passedTests: executionResult.passedTests,
        totalTests: executionResult.totalTests,
        testResults: executionResult.results,
        submittedAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("Non-fatal: Failed to persist submission record:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      result: {
        stdout,
        stderr,
        exitCode,
        executionTimeMs,
      },
      data: {
        submissionId: submission?._id || null,
        status: executionResult.allPassed ? "completed" : "failed",
        passedTests: executionResult.passedTests,
        totalTests: executionResult.totalTests,
        passed: executionResult.passedTests,
        total: executionResult.totalTests,
        allPassed: executionResult.allPassed,
        results: executionResult.results,
        testResults: executionResult.results,
        stdout,
        stderr,
        executionTimeMs,
      },
    });
  } catch (error) {
    console.error("Canonical execute code error:", error);

    return sendErrorResponse(
      res,
      500,
      "CODE_EXECUTION_FAILED",
      "Failed to execute code safely. Internal execution error."
    );
  }
};

export const runCode = executeRoomCodeController;
