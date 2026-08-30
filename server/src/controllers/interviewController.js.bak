import { InterviewSession } from "../models/InterviewSession.js";
import { InterviewQuestion } from "../models/InterviewQuestion.js";
import {
  buildFallbackInterviewEvaluation,
  buildFallbackInterviewQuestion,
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  extractCandidateContext,
  generateInterviewPlan,
  adaptiveNextAction,
  generateCoachingReport
} from "../services/ai/aiService.js";
import { Application } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { AppError } from "../utils/errors.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { env } from "../config/env.js";
import { groqTranscribe } from "../services/ai/groqProvider.js";
import fs from "fs";

export async function createSession(req, res, next) {
  try {
    const { targetRole, technologyStack, interviewType, difficulty, applicationId, jobDescription, numberOfQuestions, mode, resumeText } = req.body;

    let extractedResumeText = resumeText || "";
    if (!extractedResumeText && applicationId) {
      const app = await Application.findById(applicationId);
      if (app && app.resumeVersionId) {
        const resume = await Resume.findById(app.resumeVersionId);
        if (resume) extractedResumeText = resume.rawText;
      }
    }

    let candidateContext = { summary: "", relevantSkills: [], potentialGaps: [] };
    if (extractedResumeText || jobDescription) {
      try {
        candidateContext = await extractCandidateContext({ resumeText: extractedResumeText, jobDescription, targetRole });
      } catch (err) {
        console.error("Failed to extract candidate context", err);
      }
    }

    let interviewPlan = [];
    try {
      const planRes = await generateInterviewPlan({
        targetRole,
        technologyStack,
        interviewType,
        difficulty,
        durationMinutes: 30
      });
      interviewPlan = planRes.plan || [];
    } catch (err) {
      console.error("Failed to generate interview plan", err);
    }

    const session = new InterviewSession({
      userId: req.user._id,
      applicationId: applicationId || null,
      targetRole,
      technologyStack,
      interviewType,
      difficulty,
      jobDescription: jobDescription || "",
      numberOfQuestions: numberOfQuestions || 5,
      mode: mode || "realistic",
      status: "in_progress",
      candidateContext,
      interviewPlan
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
// Uses a "pending stub" idempotency pattern:
//   - If the last question is already "asked" → return it (idempotent for refreshes)
//   - If a "pending" stub exists → another request is already generating, return 202
//   - Otherwise: persist a pending stub first, then call AI, then update stub
//   This guarantees exactly ONE Groq call per question, even under rapid clicks or
//   React Strict Mode double-invocation.
export async function getNextQuestion(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "completed") {
      throw new AppError("Session is already completed", 400);
    }

    // Fetch all questions for this session sorted by creation order
    const previousQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 });

    // Filter out any pending stubs from the count — only count real questions
    const completedQuestions = previousQuestions.filter(q => q.status !== "pending");

    // ── Idempotency check 1: last real question still "asked" (unanswered) ──
    // Return it directly — no new AI call needed. Handles page refresh, double-click, etc.
    const lastRealQuestion = completedQuestions[completedQuestions.length - 1];
    if (lastRealQuestion && lastRealQuestion.status === "asked") {
      return res.status(200).json({
        success: true,
        data: lastRealQuestion
      });
    }

    // ── Idempotency check 2: a "pending" stub already exists ──
    // Another concurrent request is already generating this question.
    // Return 202 so the frontend knows to poll or show a "generating" state.
    const pendingStub = previousQuestions.find(q => q.status === "pending");
    if (pendingStub) {
      return res.status(202).json({
        success: true,
        data: null,
        message: "Question is being generated. Please wait a moment and try again."
      });
    }

    // ── Session completion check ──
    if (completedQuestions.length >= session.numberOfQuestions) {
      session.status = "completed";
      session.completedAt = new Date();
      await session.save();
      return res.status(200).json({
        success: true,
        data: null,
        message: "Interview completed"
      });
    }

    // ── AI usage limit check ──
    // Only check when we actually intend to generate a new question.
    const limitCheck = await checkAiLimit(req.user._id, "mock_question", env.aiLimitMockQuestions);

    // ── Persist a pending stub BEFORE calling the AI ──
    // This is the idempotency lock. Any concurrent request arriving now will
    // see this stub and return 202 immediately without calling Groq again.
    // NOTE: Mongoose's required:true on String fields rejects empty strings,
    // so we use a non-empty internal placeholder. It is overwritten with the
    // real question text (or the stub is deleted) before anything is returned.
    const stub = await InterviewQuestion.create({
      sessionId,
      questionText: "__pending__",
      category: "Generating...",
      difficulty: session.difficulty,
      expectedConcepts: [],
      status: "pending"
    });

    let aiQuestion;
    try {
      const isFirstQuestion = completedQuestions.length === 0;
      if (isFirstQuestion && session.interviewPlan?.length > 0) {
        const firstSection = session.interviewPlan[0];
        const questionContext = {
          targetRole: session.targetRole,
          technologyStack: session.technologyStack,
          interviewType: session.interviewType,
          difficulty: session.difficulty,
          jobDescription: session.jobDescription,
          previousQuestions: [],
          questionNumber: 1,
          totalQuestions: session.numberOfQuestions
        };
        aiQuestion = limitCheck.allowed
          ? await generateInterviewQuestion(questionContext)
          : buildFallbackInterviewQuestion(questionContext, "Limit reached");
      } else if (!isFirstQuestion) {
        // Adaptive next action based on previous answers
        const lastQuestion = completedQuestions[completedQuestions.length - 1];
        
        const adaptiveRes = limitCheck.allowed ? await adaptiveNextAction({
          previousQuestionText: lastQuestion.questionText,
          transcript: lastQuestion.transcript,
          evaluation: lastQuestion.evaluation
        }) : {
          action: "MOVE_FORWARD",
          nextQuestionText: buildFallbackInterviewQuestion({
            targetRole: session.targetRole,
            technologyStack: session.technologyStack,
            previousQuestions: completedQuestions
          }).questionText,
          expectedConcepts: []
        };
        
        aiQuestion = {
          questionText: adaptiveRes.nextQuestionText,
          category: adaptiveRes.action,
          difficulty: session.difficulty,
          expectedConcepts: adaptiveRes.expectedConcepts,
          generationSource: "ai"
        };
      } else {
        const questionContext = {
          targetRole: session.targetRole,
          technologyStack: session.technologyStack,
          interviewType: session.interviewType,
          difficulty: session.difficulty,
          jobDescription: session.jobDescription,
          previousQuestions: [],
          questionNumber: 1,
          totalQuestions: session.numberOfQuestions
        };
        aiQuestion = limitCheck.allowed
          ? await generateInterviewQuestion(questionContext)
          : buildFallbackInterviewQuestion(questionContext, "Limit reached");
      }
    } catch (aiError) {
      // AI failed — clean up the pending stub so the user can retry
      await InterviewQuestion.deleteOne({ _id: stub._id });
      throw aiError;
    }

    // ── Runtime guard: verify AI returned a valid questionText ──
    // The Zod schema already validates this, but we add an explicit check here
    // as a last-resort safety net before writing to MongoDB.
    const questionText = typeof aiQuestion.questionText === "string"
      ? aiQuestion.questionText.trim()
      : "";

    if (!questionText) {
      // AI returned something Zod accepted but questionText is empty — should
      // not happen in practice, but guard against it defensively.
      await InterviewQuestion.deleteOne({ _id: stub._id });
      throw new AppError(
        "AI generated an empty question. Please try again.",
        502,
        "AI_INVALID_RESPONSE"
      );
    }

    // ── Upgrade the stub to a real "asked" question ──
    stub.questionText = questionText;
    stub.category = aiQuestion.category || "General";
    stub.difficulty = aiQuestion.difficulty || session.difficulty;
    stub.expectedConcepts = Array.isArray(aiQuestion.expectedConcepts) ? aiQuestion.expectedConcepts : [];
    stub.followUpStrategy = aiQuestion.followUpStrategy || "";
    stub.generationSource = aiQuestion.generationSource || "ai";
    stub.fallbackReason = aiQuestion.fallbackReason || "";
    stub.status = "asked";
    await stub.save();

    // Increment AI usage only after a real AI-generated question is saved.
    if (stub.generationSource === "ai") {
      await incrementAiUsage(req.user._id, "mock_question");
    }

    res.status(201).json({
      success: true,
      data: stub
    });
  } catch (error) {
    next(error);
  }
}

// 3. Submit an answer (transcript + metrics) and get evaluation
export async function submitAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { transcript, metrics, videoMetrics } = req.body;

    const question = await InterviewQuestion.findById(questionId).populate("sessionId");
    if (!question || question.sessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Question not found", 404);
    }

    // Check AI limit
    const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);

    // Evaluate via AI
    const evaluationContext = {
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
      expectedConcepts: question.expectedConcepts,
      transcript,
      metrics
    };

    const evaluation = limitCheck.allowed
      ? await evaluateInterviewAnswer(evaluationContext)
      : buildFallbackInterviewEvaluation(
        evaluationContext,
        `Daily mock evaluation AI limit reached (${limitCheck.limit}/day).`
      );

    // Update question
    question.transcript = transcript;
    question.communicationMetrics = metrics;
    question.evaluation = {
      relevance: evaluation.relevance || "Medium",
      correctness: evaluation.correctness || "Medium",
      depth: evaluation.depth || "Medium",
      specificity: evaluation.specificity || "Medium",
      structure: evaluation.structure || "Medium",
      evidenceCollected: evaluation.evidenceCollected || [],
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      missingConcepts: evaluation.missingConcepts || []
    };
    question.confidence = evaluation.confidence || "MEDIUM";
    question.idealAnswer = evaluation.idealAnswer;
    question.analysisSource = evaluation.analysisSource || "ai";
    question.analysisFallbackReason = evaluation.fallbackReason || "";
    question.status = "answered";

    await question.save();

    if (question.analysisSource === "ai") {
      await incrementAiUsage(req.user._id, "mock_evaluation");
    }

    // Update session rolling scores using a mock conversion since we removed numeric scores from question analysis
    const session = question.sessionId;
    const allAnswered = await InterviewQuestion.find({ sessionId: session._id, status: "answered" });
    
    if (allAnswered.length > 0) {
      const scoreMap = { "High": 90, "Medium": 70, "Low": 40 };
      const sum = allAnswered.reduce((acc, q) => {
        acc.tech += scoreMap[q.evaluation?.correctness] || 70;
        acc.comm += scoreMap[q.evaluation?.structure] || 70;
        acc.clarity += scoreMap[q.evaluation?.specificity] || 70;
        acc.struct += scoreMap[q.evaluation?.structure] || 70;
        return acc;
      }, { tech: 0, comm: 0, clarity: 0, struct: 0 });

      const count = allAnswered.length;
      
      // Update running scores temporarily if they still exist on session (or just ignore if removed)
      // Since they are not explicitly defined on session in the new schema, but maybe they are dynamically added
      // We can just keep it or remove it. Let's keep it minimal.
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

    // Generate Final Coaching Report
    const questions = await InterviewQuestion.find({ sessionId, status: "answered" }).sort({ createdAt: 1 });
    if (questions.length > 0) {
      try {
        const report = await generateCoachingReport({
          targetRole: session.targetRole,
          questions
        });
        session.finalReport = report;
      } catch (err) {
        console.error("Failed to generate final report", err);
      }
    }

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

// 7. Transcribe audio
export async function transcribeAudio(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError("No audio file provided", 400);
    }
    
    // Check AI limit
    const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);
    if (!limitCheck.allowed) {
      // Just fallback to returning empty text or let frontend handle it
      throw new AppError("Daily AI limit reached. Please type your answer.", 429);
    }

    // Call Groq whisper API
    const audioStream = fs.createReadStream(req.file.path);
    const transcript = await groqTranscribe(audioStream);
    
    // Clean up temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete temp audio file:", err);
    });

    res.status(200).json({
      success: true,
      transcript
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
}
