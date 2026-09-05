/**
 * Report Scoring & Normalization Service
 * Bridges to the Stage 2 Deterministic Scoring Engine.
 * Guarantees evidence-based, reproducible scoring without score inflation.
 */

import { scoreQuestionFromEvidence, calculateAggregateSessionScores, anchorToScore } from "./deterministicScoringEngine.js";

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
 * Normalizes a single question's evaluation structure using the Deterministic Engine.
 */
export function normalizeQuestionEvaluation(question) {
  if (!question) return null;

  const rawEval = question.evaluation || {};

  // If already processed through Stage 2 Deterministic Scoring, return canonical structure
  if (question.analysis && typeof question.analysis.technicalAccuracy !== 'undefined') {
    return {
      ...question,
      analysis: {
        technicalAccuracy: question.analysis.technicalAccuracy,
        communication: question.analysis.communication,
        clarity: question.analysis.clarity || question.analysis.communication,
        depth: question.analysis.depth || 0,
        overall: question.analysis.overall || 0
      },
      feedback: {
        strengths: Array.isArray(question.feedback?.strengths) ? question.feedback.strengths : [],
        weaknesses: Array.isArray(question.feedback?.weaknesses) ? question.feedback.weaknesses : [],
        missingConcepts: Array.isArray(question.feedback?.missingConcepts) ? question.feedback.missingConcepts : []
      },
      idealAnswer: question.idealAnswer || { text: "N/A", explanation: "" }
    };
  }

  // Execute Stage 2 deterministic scoring from evidence
  const scored = scoreQuestionFromEvidence(rawEval, question);

  // Preserve raw correctnessScore when explicit legacy correctnessScore is passed without demonstratedConcepts
  if (typeof rawEval.correctnessScore === "number" && (!rawEval.evidence || !rawEval.evidence.demonstratedConcepts || rawEval.evidence.demonstratedConcepts.length === 0)) {
    scored.analysis.technicalAccuracy = rawEval.correctnessScore;
  }

  return {
    ...question,
    analysis: scored.analysis,
    feedback: scored.feedback,
    idealAnswer: scored.idealAnswer || question.idealAnswer
  };
}

/**
 * Calculates session-level aggregate scores deterministically.
 */
export function calculateSessionScores(session, questions = [], challenges = []) {
  const normalizedQuestions = (questions || []).map(normalizeQuestionEvaluation);
  const aggregate = calculateAggregateSessionScores(session, normalizedQuestions, challenges);

  // Compute JD Alignment Score based on tech stack and JD skills tested
  const targetSkills = new Set([
    ...(session?.technologyStack || []),
    ...(session?.jdContext?.requiredSkills || []),
    ...(session?.jdContext?.technologies || []),
  ].map(s => String(s).toLowerCase().trim()).filter(Boolean));

  let jdAlignment = 75;
  if (targetSkills.size > 0 && normalizedQuestions.length > 0) {
    const testedSkills = new Set();
    normalizedQuestions.forEach(q => {
      if (q.category) testedSkills.add(q.category.toLowerCase().trim());
      if (q.technology) testedSkills.add(q.technology.toLowerCase().trim());
    });
    let matchCount = 0;
    targetSkills.forEach(skill => {
      if ([...testedSkills].some(ts => ts.includes(skill) || skill.includes(ts))) {
        matchCount++;
      }
    });
    jdAlignment = Math.min(100, Math.max(50, Math.round((matchCount / targetSkills.size) * 100)));
  }

  // Delivery Score (Confidence & Delivery) - null if audio/video signals unavailable
  let deliveryScore = null;
  const questionsWithDelivery = normalizedQuestions.filter(q => q.deliverySignals && q.deliverySignals.available !== false && !q.deliverySignals.unavailable);
  if (questionsWithDelivery.length > 0) {
    const avgPacePenalty = questionsWithDelivery.reduce((acc, q) => {
      const pace = q.deliverySignals.speakingPaceWpm || q.deliverySignals.speakingPace || 130;
      const pausePen = (q.deliverySignals.pauseCount || q.deliverySignals.longPauses || 0) * 4;
      const fillerPen = (q.deliverySignals.fillerWordCount || q.deliverySignals.fillerWords || 0) * 3;
      const score = Math.max(30, Math.min(95, 85 - pausePen - fillerPen));
      return acc + score;
    }, 0);
    deliveryScore = Math.round(avgPacePenalty / questionsWithDelivery.length);
  }

  // Overall Readiness (Weighted aggregate of available scores)
  // If technical and communication are 0 (all-no answers), overallReadiness MUST be strictly 0
  let overallReadiness = 0;
  if (aggregate.overallScore > 0) {
    const components = [];
    if (aggregate.scores.technical?.score !== null) components.push({ score: aggregate.scores.technical.score, weight: 0.35 });
    if (aggregate.scores.problemSolving?.score !== null && aggregate.scores.problemSolving?.score > 0) components.push({ score: aggregate.scores.problemSolving.score, weight: 0.25 });
    if (aggregate.scores.communication?.score !== null) components.push({ score: aggregate.scores.communication.score, weight: 0.20 });
    if (deliveryScore !== null) components.push({ score: deliveryScore, weight: 0.10 });
    if (jdAlignment !== null && (session?.technologyStack?.length || session?.jdContext?.requiredSkills?.length)) {
      components.push({ score: jdAlignment, weight: 0.10 });
    }

    const totalWeight = components.reduce((acc, c) => acc + c.weight, 0);
    overallReadiness = totalWeight > 0 ? Math.round(components.reduce((acc, c) => acc + (c.score * c.weight), 0) / totalWeight) : aggregate.overallScore;
  }

  return {
    overallScore: aggregate.overallScore === 0 ? 0 : (overallReadiness || aggregate.overallScore),
    confidence: aggregate.confidence,
    scores: {
      technical: aggregate.scores.technical.score,
      communication: aggregate.scores.communication.score,
      clarity: aggregate.scores.clarity.score,
      videoPresence: session?.presenceSignals?.available ? (session?.presenceSignals?.eyeContactScore || 80) : null,
      structure: aggregate.scores.structure.score,
      problemSolving: aggregate.scores.problemSolving.score,
      delivery: deliveryScore,
      jdAlignment: jdAlignment,
      overallReadiness: aggregate.overallScore === 0 ? 0 : (overallReadiness || aggregate.overallScore)
    },
    detailedScores: aggregate.scores
  };
}
