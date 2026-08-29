import CodingQuestion from "../models/CodingQuestions.js";
import CodingSubmission from "../models/CodingSubmission.js";
import { InterviewSession } from "../models/InterviewSession.js";
import { executeCode } from "../services/codeExecution/executionService.js";

export const runCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, language, code } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        code: "SESSION_ID_REQUIRED",
        message: "Interview session ID is required.",
      });
    }

    if (!questionId) {
      return res.status(400).json({
        success: false,
        code: "QUESTION_ID_REQUIRED",
        message: "Coding question ID is required.",
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        code: "LANGUAGE_REQUIRED",
        message: "Programming language is required.",
      });
    }

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        code: "CODE_REQUIRED",
        message: "Code cannot be empty.",
      });
    }

    // 1. Verify interview session or peer interview room
    let userId = null;
    const session = await InterviewSession.findById(sessionId)
      .select("_id userId")
      .lean();

    if (session) {
      userId = session.userId;
    } else {
      const peerRoom = await PeerInterviewRoom.findOne({ roomId: sessionId })
        .select("_id createdBy")
        .lean();
      if (peerRoom) {
        userId = peerRoom.createdBy;
      }
    }

    if (!userId) {
      return res.status(404).json({
        success: false,
        code: "INTERVIEW_SESSION_NOT_FOUND",
        message: "Interview session or room not found.",
      });
    }

    // 2. Find question
    const question = await CodingQuestion.findById(questionId).lean();

    if (!question) {
      return res.status(404).json({
        success: false,
        code: "CODING_QUESTION_NOT_FOUND",
        message: "Coding question not found.",
      });
    }

    // 3. Verify language
    if (!question.supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        code: "LANGUAGE_NOT_SUPPORTED",
        message: `Language '${language}' is not supported.`,
      });
    }

    // 4. Only execute public test cases for RUN
    const publicTestCases = (question.testCases || []).filter(
      (testCase) => !testCase.hidden,
    );

    if (publicTestCases.length === 0) {
      return res.status(400).json({
        success: false,
        code: "NO_PUBLIC_TEST_CASES",
        message: "No public test cases are available.",
      });
    }

    // 5. Execute code
    const executionResult = await executeCode({
      language,
      code,
      testCases: publicTestCases,
    });

    // 6. Create submission
    const submission = await CodingSubmission.create({
      candidateId: userId || req.user._id,
      interviewSessionId: sessionId,
      questionId,
      language,
      code,
      status: executionResult.allPassed ? "completed" : "failed",
      passedTests: executionResult.passedTests,
      totalTests: executionResult.totalTests,
      testResults: executionResult.results,
      submittedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        status: submission.status,
        passedTests: executionResult.passedTests,
        totalTests: executionResult.totalTests,
        results: executionResult.results,
      },
    });
  } catch (error) {
    console.error("Run code error:", error);

    return res.status(500).json({
      success: false,
      code: "CODE_EXECUTION_FAILED",
      message: "Failed to execute code.",
    });
  }
};
