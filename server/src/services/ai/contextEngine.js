import { User } from "../../models/User.js";
import { Project } from "../../models/Project.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { InterviewQuestion } from "../../models/InterviewQuestion.js";

/**
 * The Context Engine defines exactly what information each AI task needs 
 * and retrieves only that information. It isolates the AI from seeing 
 * unnecessary user history or PII.
 */

export async function buildInterviewEvaluationContext({ userId, sessionId, questionId, answerText }) {
  const [user, session, question] = await Promise.all([
    User.findById(userId).lean(),
    InterviewSession.findById(sessionId).lean(),
    InterviewQuestion.findById(questionId).lean()
  ]);

  if (!session || !question) {
    throw new Error("Missing session or question for interview evaluation context");
  }

  // Fetch relevant past questions that the candidate struggled with in the same category
  const pastWeakQuestions = await InterviewQuestion.find({
    sessionId: { $ne: sessionId },
    userId: userId,
    category: question.category,
    "analysis.technicalAccuracy": { $lt: 65 }
  }).sort({ createdAt: -1 }).limit(2).lean();

  return {
    candidateProfile: {
      targetRoles: user?.targetRoles || [],
      primaryTechStack: user?.primaryTechStack || []
    },
    targetRole: session.targetRole,
    question: question.questionText,
    expectedConcepts: question.expectedConcepts || [],
    answer: answerText,
    historicalContext: pastWeakQuestions.map(q => ({
      question: q.questionText,
      feedback: q.analysis?.feedback?.weaknesses || []
    }))
  };
}

export async function buildInterviewQuestionContext({ userId, sessionId }) {
  const [user, session, projects] = await Promise.all([
    User.findById(userId).lean(),
    InterviewSession.findById(sessionId).lean(),
    Project.find({ userId }).select("name technologies architecture description role").lean()
  ]);

  if (!session) throw new Error("Missing session for interview question context");

  const previousQuestions = await InterviewQuestion.find({ sessionId })
    .sort({ order: 1 })
    .lean();

  return {
    candidateProfile: {
      targetRoles: user?.targetRoles || [],
      primaryTechStack: user?.primaryTechStack || [],
      projects: projects || []
    },
    targetRole: session.targetRole,
    technologyStack: session.technologyStack || [],
    interviewType: session.type,
    difficulty: session.difficulty,
    previousQuestions: previousQuestions.map(q => ({
      category: q.category,
      question: q.questionText,
      score: q.analysis?.technicalAccuracy || 0
    }))
  };
}

export async function buildResumeAnalysisContext({ rawText }) {
  // Pure text extraction, context is just the raw text
  return { rawText };
}

export async function buildJdAnalysisContext({ jdText }) {
  return { jdText };
}

export async function buildMatchContext(params) {
  // Params should already contain what's needed for the prompt
  // In a real DB scenario, we would fetch the Resume and JD here if only IDs were provided.
  return params;
}

export async function buildTailoringContext(params) {
  return params;
}

export async function buildPlanContext(params) {
  return params;
}

export async function buildCopilotContext(params) {
  return params;
}

export async function buildCodeContext(params) {
  return params;
}

export async function buildProjectKitContext(params) {
  return params;
}

export async function buildPrepPlanContext(params) {
  return params;
}

export async function buildCopilotChatContext(params) {
  return params;
}
