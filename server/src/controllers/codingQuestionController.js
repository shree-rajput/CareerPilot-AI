import CodingQuestion from "../models/CodingQuestion.js";
import Interview from "../models/Interview.js";

export const getCodingQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        code: "SESSION_ID_REQUIRED",
        message: "Interview session ID is required.",
      });
    }

    // Verify that the interview session exists.
    const interview = await Interview.findById(sessionId)
      .select("_id userId type status")
      .lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        code: "INTERVIEW_NOT_FOUND",
        message: "Interview session not found.",
      });
    }

    /*
     * For now we select an active coding question.
     *
     * Later this will become adaptive:
     * - difficulty based on candidate performance
     * - interview role
     * - required skills
     * - previous questions
     * - company/job description
     */
    const question = await CodingQuestion.findOne({
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!question) {
      return res.status(404).json({
        success: false,
        code: "CODING_QUESTION_NOT_FOUND",
        message: "No coding question is currently available.",
      });
    }

    /*
     * NEVER send hidden test-case information
     * to the frontend.
     */
    const safeTestCases = (question.testCases || [])
      .filter((testCase) => !testCase.hidden)
      .map((testCase) => ({
        id: testCase._id,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        explanation: testCase.explanation,
      }));

    const response = {
      id: question._id,
      title: question.title,
      description: question.description,
      difficulty: question.difficulty,
      topics: question.topics,
      supportedLanguages: question.supportedLanguages,
      defaultLanguage: question.defaultLanguage,
      starterCode: question.starterCode,
      constraints: question.constraints,
      hints: question.hints,
      expectedComplexity: question.expectedComplexity,
      testCases: safeTestCases,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Get coding question error:", error);

    return res.status(500).json({
      success: false,
      code: "CODING_QUESTION_FETCH_FAILED",
      message: "Failed to fetch coding question.",
    });
  }
};
