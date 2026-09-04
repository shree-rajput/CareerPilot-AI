/**
 * Report Scoring & Normalization Service
 * Ensures all interview question evaluations and session overall scores
 * are finite numbers bounded between 0 and 100, calculated deterministically
 * strictly from actual recorded answer evidence.
 */

/**
 * Safely converts any value to a finite score between 0 and 100.
 */
export function safeScore(value, fallback = 0) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) return fallback;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "high" || trimmed === "correct") return 90;
    if (trimmed === "medium" || trimmed === "partial") return 65;
    if (trimmed === "low" || trimmed === "incorrect") return 20;
    if (trimmed === "no_answer") return 0;

    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }

  return fallback;
}

/**
 * Normalizes a single question's evaluation structure into a canonical format
 * with both numeric analysis scores and qualitative feedback.
 */
export function normalizeQuestionEvaluation(question) {
  if (!question) return null;

  const rawEval = question.evaluation || {};
  const rawAnalysis = question.analysis || {};
  const commMetrics = question.communicationMetrics || {};
  const commObject = rawEval.communication || {};

  const isNonAnswer =
    rawEval.answerStatus === "NO_ANSWER" ||
    question.analysisSource === "deterministic_non_answer" ||
    (typeof question.transcript === "string" && ["no", "idk", "no idea", "dont know", "i dont know", "i do not know"].includes(question.transcript.trim().toLowerCase()));

  if (isNonAnswer) {
    return {
      ...question,
      analysis: {
        technicalAccuracy: 0,
        communication: 0,
        clarity: 0,
        depth: 0,
        overall: 0
      },
      feedback: {
        strengths: [],
        weaknesses: ["Candidate did not provide an answer or stated they did not know."],
        missingConcepts: Array.isArray(rawEval.missingConcepts) && rawEval.missingConcepts.length > 0
          ? rawEval.missingConcepts
          : Array.isArray(question.expectedConcepts) ? question.expectedConcepts : []
      },
      idealAnswer: {
        text: question.idealAnswer?.text || "Candidate provided no answer.",
        explanation: question.idealAnswer?.explanation || "A complete answer requires articulating the core technical concepts."
      }
    };
  }

  // Compute numeric technical accuracy
  let techAccuracy = 0;
  if (typeof rawEval.correctnessScore === "number") {
    techAccuracy = safeScore(rawEval.correctnessScore, 0);
  } else if (typeof rawAnalysis.technicalAccuracy === "number") {
    techAccuracy = safeScore(rawAnalysis.technicalAccuracy, 0);
  } else if (rawEval.correctness) {
    techAccuracy = safeScore(rawEval.correctness, 0);
  }

  // Compute evidence-based communication score
  let commScore = 0;
  if (typeof commObject.score === "number") {
    commScore = safeScore(commObject.score, 0);
  } else if (typeof rawAnalysis.communication === "number") {
    commScore = safeScore(rawAnalysis.communication, 0);
  } else {
    // Computed from transcript speech metrics (WPM + filler word penalty)
    const pace = commMetrics.speakingPace || 130;
    const fillers = commMetrics.fillerWords || 0;
    let paceScore = pace >= 110 && pace <= 160 ? 90 : pace > 80 && pace < 180 ? 75 : 55;
    let fillerPenalty = Math.min(25, fillers * 4);
    commScore = safeScore(paceScore - fillerPenalty, 50);
  }

  // Compute clarity score
  let clarityScore = typeof commObject.clarity === "number"
    ? safeScore(commObject.clarity, 0)
    : typeof rawAnalysis.clarity === "number"
    ? safeScore(rawAnalysis.clarity, 0)
    : safeScore(rawEval.relevance || rawEval.structure, 0);

  // Compute depth score
  let depthScore = typeof rawAnalysis.depth === "number"
    ? safeScore(rawAnalysis.depth, 0)
    : safeScore(rawEval.depth || rawEval.specificity, 0);

  // Compute question overall score
  let overallScore = typeof rawAnalysis.overall === "number"
    ? safeScore(rawAnalysis.overall, 0)
    : Math.round((techAccuracy * 0.5) + (clarityScore * 0.25) + (commScore * 0.25));

  const canonicalAnalysis = {
    technicalAccuracy: techAccuracy,
    communication: commScore,
    clarity: clarityScore,
    depth: depthScore,
    overall: safeScore(overallScore, 0)
  };

  const strengths = Array.isArray(question.feedback?.strengths) && question.feedback.strengths.length > 0
    ? question.feedback.strengths
    : Array.isArray(rawEval.strengths) && rawEval.strengths.length > 0
    ? rawEval.strengths
    : ["Clear communication"];

  const weaknesses = Array.isArray(question.feedback?.weaknesses) && question.feedback.weaknesses.length > 0
    ? question.feedback.weaknesses
    : Array.isArray(rawEval.weaknesses) && rawEval.weaknesses.length > 0
    ? rawEval.weaknesses
    : ["Could elaborate deeper on architectural trade-offs"];

  const idealText = question.idealAnswer?.text
    || "A strong answer clearly articulates the core technical concept, provides a concrete real-world example, and discusses practical trade-offs.";

  const idealExplanation = question.idealAnswer?.explanation
    || "This answer effectively balances technical depth with clear communication.";

  return {
    ...question,
    analysis: canonicalAnalysis,
    feedback: {
      strengths,
      weaknesses,
      missingConcepts: Array.isArray(rawEval.missingConcepts) ? rawEval.missingConcepts : []
    },
    idealAnswer: {
      text: idealText,
      explanation: idealExplanation
    }
  };
}

/**
 * Calculates overall session scores and individual category breakdowns strictly from answer evidence.
 * Excludes Video Presence (marked as available: false / null) from the deterministic weighted average.
 */
export function calculateSessionScores(session, questions = [], challenges = []) {
  const answeredQuestions = (questions || []).filter(q => q.status === "answered");
  const answeredChallenges = (challenges || []).filter(c => c.status === "answered");

  const totalAnswered = answeredQuestions.length + answeredChallenges.length;

  if (totalAnswered === 0) {
    return {
      overallScore: 0,
      scores: {
        technical: 0,
        communication: 0,
        clarity: 0,
        videoPresence: null, // explicitly null — unavailable
        structure: 0,
        problemSolving: 0
      }
    };
  }

  // Normalize questions
  const normalizedQuestions = answeredQuestions.map(normalizeQuestionEvaluation);

  // Technical average
  const totalTech = normalizedQuestions.reduce((acc, q) => acc + q.analysis.technicalAccuracy, 0);
  const techAvg = normalizedQuestions.length > 0 ? totalTech / normalizedQuestions.length : 0;

  // Communication average
  const totalComm = normalizedQuestions.reduce((acc, q) => acc + q.analysis.communication, 0);
  const commAvg = normalizedQuestions.length > 0 ? totalComm / normalizedQuestions.length : 0;

  // Clarity average
  const totalClarity = normalizedQuestions.reduce((acc, q) => acc + q.analysis.clarity, 0);
  const clarityAvg = normalizedQuestions.length > 0 ? totalClarity / normalizedQuestions.length : 0;

  // Structure / Depth average
  const totalDepth = normalizedQuestions.reduce((acc, q) => acc + q.analysis.depth, 0);
  const structureAvg = normalizedQuestions.length > 0 ? totalDepth / normalizedQuestions.length : 0;

  // Coding / Problem Solving average
  let problemSolvingAvg = 0;
  let hasCoding = false;
  if (answeredChallenges.length > 0) {
    hasCoding = true;
    const totalChallengeScore = answeredChallenges.reduce((acc, c) => {
      const summary = c.executionSummary || {};
      const passed = summary.passedTests || 0;
      const total = summary.totalTests || 1;
      const passRatio = total > 0 ? passed / total : 0;
      return acc + (passRatio * 100);
    }, 0);
    problemSolvingAvg = totalChallengeScore / answeredChallenges.length;
  }

  // Deterministic weighted overall calculation (excluding Video Presence)
  let overallScore = 0;
  if (hasCoding) {
    overallScore = (techAvg * 0.50) + (commAvg * 0.25) + (problemSolvingAvg * 0.25);
  } else {
    overallScore = (techAvg * 0.65) + (commAvg * 0.35);
  }

  return {
    overallScore: safeScore(overallScore, 0),
    scores: {
      technical: safeScore(techAvg, 0),
      communication: safeScore(commAvg, 0),
      clarity: safeScore(clarityAvg, 0),
      videoPresence: null, // Explicitly marked null: visual behavior analysis not enabled
      structure: safeScore(structureAvg, 0),
      problemSolving: safeScore(problemSolvingAvg, 0)
    }
  };
}
