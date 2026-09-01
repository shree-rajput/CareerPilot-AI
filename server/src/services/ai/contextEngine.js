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
    .sort({ createdAt: 1 })
    .lean();

  // Fetch candidate's past weaknesses from previous interview sessions (for intentional revisiting)
  const pastSessionIds = await InterviewSession.find({ userId, _id: { $ne: sessionId } }).distinct('_id');
  const pastWeakQuestions = await InterviewQuestion.find({
    sessionId: { $in: pastSessionIds },
    "evaluation.correctness": { $in: ["Low", "Medium"] }
  }).sort({ createdAt: -1 }).limit(5).select("questionText category evaluation expectedConcepts").lean();

  const pastWeaknessTopics = pastWeakQuestions.map(q => ({
    category: q.category,
    expectedConcepts: q.expectedConcepts || [],
    weaknessDetail: q.evaluation?.weaknesses?.join(", ") || "Missing depth"
  }));

  return {
    candidateProfile: {
      name: user?.name || "Candidate",
      experienceLevel: user?.experienceLevel || "student",
      targetRoles: user?.targetRoles || [],
      technicalSkills: user?.technicalSkills || [],
      primaryTechStack: user?.primaryTechStack || [],
      projects: projects && projects.length > 0 ? projects : session.resumeSnapshot?.projects || []
    },
    targetRole: session.targetRole,
    technologyStack: session.technologyStack || [],
    interviewType: session.interviewType || session.type,
    difficulty: session.difficulty,
    jobDescription: session.jobDescription || "",
    userPreferences: {
      interviewPreferences: user?.interviewPreferences || {},
      aiPreferences: user?.aiPreferences || {}
    },
    pastWeaknessTopics,
    previousQuestions: previousQuestions.map(q => ({
      category: q.category,
      questionText: q.questionText,
      status: q.status,
      evaluation: q.evaluation
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
