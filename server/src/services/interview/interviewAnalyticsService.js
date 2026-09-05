/**
 * CareerPilot AI - Interview Analytics & Progression Service
 * Analyzes historical interview sessions to compute score trends over time,
 * detect recurring technical weaknesses across sessions, and suggest next steps.
 */

import { InterviewSession } from "../../models/InterviewSession.js";
import { InterviewQuestion } from "../../models/InterviewQuestion.js";

/**
 * Computes historical progression analytics and recurring weaknesses for a candidate.
 */
export async function calculateCandidateProgression(userIdOrSessions, optionsOrQuestions = {}) {
  let sessions = [];
  let questionsBySession = {};

  if (Array.isArray(userIdOrSessions)) {
    sessions = userIdOrSessions;
    questionsBySession = optionsOrQuestions || {};
  } else {
    const query = { userId: userIdOrSessions, status: "completed" };
    if (optionsOrQuestions.role) {
      query.targetRole = { $regex: optionsOrQuestions.role, $options: "i" };
    }

    sessions = await InterviewSession.find(query)
      .sort({ createdAt: 1 })
      .lean();
  }

  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      totalCompleted: 0,
      totalInterviews: 0,
      hasSufficientData: false,
      scoreTrend: [],
      scoreDelta: 0,
      scoreChange: 0,
      isImproving: false,
      recurringWeaknesses: [],
      topStrengths: [],
      averageScores: {
        overall: 0,
        technical: 0,
        communication: 0,
        delivery: 0,
        problemSolving: 0,
        jdAlignment: 0,
      },
      recommendedNextStep: "Complete your first AI interview session to start tracking progress.",
    };
  }

  // Fetch questions if not passed in-memory
  let questions = [];
  if (Array.isArray(userIdOrSessions)) {
    questions = Object.values(questionsBySession).flat();
  } else {
    const sessionIds = sessions.map((s) => s._id);
    questions = await InterviewQuestion.find({
      sessionId: { $in: sessionIds },
      status: "answered",
    }).lean();
  }

  // 1. Build Chronological Score Trend
  const scoreTrend = sessions.map((s) => {
    const scores = s.scores || {};
    return {
      sessionId: s._id,
      date: s.completedAt || s.createdAt,
      role: s.targetRole,
      difficulty: s.difficulty,
      interviewType: s.interviewType,
      overallScore: s.overallScore || 0,
      technical: scores.technical || 0,
      communication: scores.communication || 0,
      problemSolving: scores.problemSolving || 0,
      delivery: scores.delivery || 0,
      jdAlignment: scores.jdAlignment || 0,
    };
  });

  // 2. Score Progression Delta
  const firstScore = scoreTrend[0]?.overallScore || 0;
  const latestScore = scoreTrend[scoreTrend.length - 1]?.overallScore || 0;
  const scoreDelta = latestScore - firstScore;
  const isImproving = scoreDelta > 0;

  // 3. Average Scores
  const totalCount = sessions.length;
  const sumScores = scoreTrend.reduce(
    (acc, curr) => {
      acc.overall += curr.overallScore;
      acc.technical += curr.technical;
      acc.communication += curr.communication;
      acc.delivery += curr.delivery;
      acc.problemSolving += curr.problemSolving;
      acc.jdAlignment += curr.jdAlignment;
      return acc;
    },
    { overall: 0, technical: 0, communication: 0, delivery: 0, problemSolving: 0, jdAlignment: 0 }
  );

  const averageScores = {
    overall: Math.round(sumScores.overall / totalCount),
    technical: Math.round(sumScores.technical / totalCount),
    communication: Math.round(sumScores.communication / totalCount),
    delivery: Math.round(sumScores.delivery / totalCount),
    problemSolving: Math.round(sumScores.problemSolving / totalCount),
    jdAlignment: Math.round(sumScores.jdAlignment / totalCount),
  };

  // 4. Recurring Weakness Analysis across session questions & report feedback
  const weaknessFrequency = {};
  const strengthFrequency = {};

  questions.forEach((q) => {
    const feedback = q.feedback || q.evaluation || {};

    // Track missing concepts
    (feedback.missingConcepts || []).forEach((concept) => {
      if (concept && typeof concept === "string") {
        const clean = concept.trim().toLowerCase();
        if (clean.length > 2) {
          weaknessFrequency[clean] = (weaknessFrequency[clean] || 0) + 1;
        }
      }
    });

    // Track weaknesses
    (feedback.weaknesses || []).forEach((w) => {
      if (w && typeof w === "string") {
        const clean = w.trim();
        if (clean.length > 5 && !clean.toLowerCase().includes("conservative rules")) {
          weaknessFrequency[clean] = (weaknessFrequency[clean] || 0) + 1;
        }
      }
    });

    // Track strengths
    (feedback.strengths || []).forEach((s) => {
      if (s && typeof s === "string") {
        const clean = s.trim();
        if (clean.length > 5) {
          strengthFrequency[clean] = (strengthFrequency[clean] || 0) + 1;
        }
      }
    });
  });

  // Extract recurring items (appearing 2+ times, sorted by frequency)
  const recurringWeaknesses = Object.entries(weaknessFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, count]) => (count > 1 ? `${term} (Identified in ${count} questions/sessions)` : term));

  const topStrengths = Object.entries(strengthFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);

  // 5. Tailored Recommendation
  let recommendedNextStep = "Continue practicing mock interviews to maintain your consistency.";
  if (recurringWeaknesses.length > 0) {
    const topWeak = Object.keys(weaknessFrequency)[0] || "core technical topics";
    recommendedNextStep = `Focus your next practice session on ${topWeak}. Review concepts and try 3 targeted practice questions.`;
  } else if (averageScores.technical < 70) {
    recommendedNextStep = "Practice technical conceptual depth and explain trade-offs clearly in your answers.";
  } else if (averageScores.communication < 70) {
    recommendedNextStep = "Work on structuring answers using 2-3 distinct points before diving into details.";
  }

  return {
    totalSessions: totalCount,
    totalCompleted: totalCount,
    totalInterviews: totalCount,
    hasSufficientData: totalCount >= 2,
    scoreTrend: isImproving ? "improving" : scoreDelta < 0 ? "declining" : "neutral",
    scoreHistory: scoreTrend,
    scoreDelta,
    scoreChange: scoreDelta,
    isImproving,
    averageScore: averageScores.overall,
    recurringWeaknesses,
    topStrengths,
    averageScores,
    recommendedNextStep,
  };
}
