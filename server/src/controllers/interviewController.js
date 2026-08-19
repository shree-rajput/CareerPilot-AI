import { InterviewSession } from "../models/InterviewSession.js";
import { InterviewQuestion } from "../models/InterviewQuestion.js";
import { generateInterviewQuestion, evaluateInterviewAnswer } from "../services/ai/aiService.js";
import { AppError } from "../utils/errors.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { env } from "../config/env.js";

// 1. Initialize a new interview session
export async function createSession(req, res, next) {
  try {
    const { targetRole, technologyStack, interviewType, difficulty, applicationId } = req.body;

    const session = new InterviewSession({
      userId: req.user._id,
      applicationId: applicationId || null,
      targetRole,
      technologyStack,
      interviewType,
      difficulty,
      status: "in_progress"
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

// 2. Generate the next question
export async function getNextQuestion(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "completed") {
      throw new AppError("Session is already completed", 400);
    }

    // Check AI limit
    const limitCheck = await checkAiLimit(req.user._id, "mock_question", env.aiLimitMockQuestions);
    if (!limitCheck.allowed) {
      throw new AppError(`Daily mock question limit reached (${limitCheck.limit}/day). Try again tomorrow.`, 429, "RATE_LIMIT");
    }

    // Get previous questions
    const previousQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 });

    // Generate new question via AI
    const aiQuestion = await generateInterviewQuestion({
      targetRole: session.targetRole,
      technologyStack: session.technologyStack,
      interviewType: session.interviewType,
      difficulty: session.difficulty,
      previousQuestions
    });

    const question = new InterviewQuestion({
      sessionId,
      questionText: aiQuestion.questionText,
      category: aiQuestion.category,
      difficulty: aiQuestion.difficulty,
      expectedConcepts: aiQuestion.expectedConcepts,
      status: "asked"
    });

    await question.save();
    await incrementAiUsage(req.user._id, "mock_question");

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// 3. Submit an answer (transcript + metrics) and get evaluation
export async function submitAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { transcript, metrics } = req.body;

    const question = await InterviewQuestion.findById(questionId).populate("sessionId");
    if (!question || question.sessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Question not found", 404);
    }

    // Check AI limit
    const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);
    if (!limitCheck.allowed) {
      throw new AppError(`Daily mock evaluation limit reached (${limitCheck.limit}/day). Try again tomorrow.`, 429, "RATE_LIMIT");
    }

    // Evaluate via AI
    const evaluation = await evaluateInterviewAnswer({
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
      expectedConcepts: question.expectedConcepts,
      transcript,
      metrics
    });

    // Update question
    question.transcript = transcript;
    question.communicationMetrics = metrics;
    question.analysis = {
      technicalAccuracy: evaluation.technicalAccuracy,
      relevance: evaluation.relevance,
      completeness: evaluation.completeness,
      clarity: evaluation.clarity,
      structure: evaluation.structure,
      communication: evaluation.communication
    };
    question.feedback = evaluation.feedback;
    question.idealAnswer = evaluation.idealAnswer;
    question.status = "answered";

    await question.save();
    await incrementAiUsage(req.user._id, "mock_evaluation");

    // Update session rolling scores (simple average for now)
    const session = question.sessionId;
    const allAnswered = await InterviewQuestion.find({ sessionId: session._id, status: "answered" });
    
    if (allAnswered.length > 0) {
      const sum = allAnswered.reduce((acc, q) => {
        acc.tech += q.analysis.technicalAccuracy;
        acc.comm += q.analysis.communication;
        acc.clarity += q.analysis.clarity;
        acc.struct += q.analysis.structure;
        return acc;
      }, { tech: 0, comm: 0, clarity: 0, struct: 0 });

      const count = allAnswered.length;
      session.scores = {
        technical: sum.tech / count,
        communication: sum.comm / count,
        clarity: sum.clarity / count,
        structure: sum.struct / count
      };
      session.overallScore = (session.scores.technical + session.scores.communication + session.scores.clarity + session.scores.structure) / 4;
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
}

// 4. Complete session
export async function completeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

// 5. Get session report
export async function getSessionReport(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    const questions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        session,
        questions
      }
    });
  } catch (error) {
    next(error);
  }
}

// 6. List all user sessions
export async function listSessions(req, res, next) {
  try {
    const sessions = await InterviewSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
}
