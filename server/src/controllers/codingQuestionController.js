import CodingQuestion from "../models/CodingQuestions.js";
import { InterviewSession } from "../models/InterviewSession.js";
import { InterviewChallenge } from "../models/InterviewChallenge.js";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";
import mongoose from "mongoose";

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

    let interviewExists = false;
    let question = null;

    // Check if it's a regular InterviewSession (24 char hex / valid ObjectId)
    if (mongoose.Types.ObjectId.isValid(sessionId) && sessionId.length === 24) {
      const interview = await InterviewSession.findById(sessionId)
        .select("_id userId type status")
        .lean();
      if (interview) {
        interviewExists = true;
        const challenge = await InterviewChallenge.findOne({ interviewSessionId: sessionId })
          .sort({ createdAt: -1 })
          .lean();
        if (challenge) question = challenge;
      }
    } 
    // Otherwise check if it's a PeerInterviewRoom (usually 16 char hex)
    else {
      const peerRoom = await PeerInterviewRoom.findOne({ roomId: sessionId })
        .select("_id roomId status problem")
        .lean();
      if (peerRoom) {
        interviewExists = true;
        if (peerRoom.problem) question = peerRoom.problem;
      }
    }

    if (!interviewExists) {
      return res.status(404).json({
        success: false,
        code: "INTERVIEW_NOT_FOUND",
        message: "Interview session not found.",
      });
    }

    if (!question) {
      question = await CodingQuestion.findOne({
        isActive: true,
      })
        .sort({ createdAt: 1 })
        .lean();
    }

    if (!question) {
      return res.status(200).json(null);
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

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get coding question error:", error);

    return res.status(500).json({
      success: false,
      code: "CODING_QUESTION_FETCH_FAILED",
      message: "Failed to fetch coding question.",
    });
  }
};
