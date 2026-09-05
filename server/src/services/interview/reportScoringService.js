/**
 * Report Scoring & Evidence Normalization Service
 *
 * Core Rule: NEVER SCORE WHAT THE SYSTEM DID NOT OBSERVE.
 * Excludes unavailable dimensions from overall readiness calculation.
 * Exposes explicit evidence, confidence, availability, and score provenance.
 */

import { scoreQuestionFromEvidence } from "./deterministicScoringEngine.js";
import {
  gateVisualPresence,
  gateDelivery,
  gateJdAlignment,
  gateCodingPerformance
} from "./evidenceGatingEngine.js";

/**
 * Safely converts any value to a finite score or returns null if unobserved/finite failure.
 */
export function safeScore(value, fallback = null) {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isNaN(value)) return fallback;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "n/a" || trimmed === "none" || trimmed === "null" || trimmed === "unavailable") return null;
    if (trimmed === "high" || trimmed === "correct" || trimmed === "excellent") return 90;
    if (trimmed === "medium" || trimmed === "partial" || trimmed === "developing") return 65;
    if (trimmed === "low" || trimmed === "incorrect" || trimmed === "weak") return 20;
    if (trimmed === "no_answer" || trimmed === "insufficient") return 0;

    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }

  return fallback;
}

/**
 * Normalizes a single question's evaluation structure.
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
        overall: question.analysis.overall || 0,
        scoreBand: question.analysis.scoreBand || (question.analysis.technicalAccuracy === null ? "N/A" : "Developing")
      },
      feedback: {
        strengths: Array.isArray(question.feedback?.strengths) ? question.feedback.strengths : [],
        weaknesses: Array.isArray(question.feedback?.weaknesses) ? question.feedback.weaknesses : [],
        missingConcepts: Array.isArray(question.feedback?.missingConcepts) ? question.feedback.missingConcepts : [],
        evidenceQuotes: Array.isArray(question.feedback?.evidenceQuotes) ? question.feedback.evidenceQuotes : []
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
 * Calculates session-level aggregate scores deterministically with evidence gating.
 */
export function calculateSessionScores(session, questions = [], challenges = []) {
  const normalizedQuestions = (questions || []).map(normalizeQuestionEvaluation).filter(Boolean);
  const answeredQuestions = normalizedQuestions.filter(q => q.status === "answered" || q.transcript);
  const activeChallenges = (challenges || []).filter(c => c.status === "answered" || c.executionSummary);

  // 1. DIMENSION EVALUATIONS WITH EVIDENCE GATING
  // Technical Accuracy
  const techQuestions = answeredQuestions.filter(q => q.analysis && q.analysis.technicalAccuracy !== null);
  const techScore = techQuestions.length > 0
    ? Math.round(techQuestions.reduce((sum, q) => sum + q.analysis.technicalAccuracy, 0) / techQuestions.length)
    : null;

  // Communication
  const commQuestions = answeredQuestions.filter(q => q.analysis && q.analysis.communication !== null);
  const commScore = commQuestions.length > 0
    ? Math.round(commQuestions.reduce((sum, q) => sum + q.analysis.communication, 0) / commQuestions.length)
    : null;

  // Coding / Problem Solving
  const primaryChallenge = activeChallenges[0] || null;
  const codingGated = gateCodingPerformance(primaryChallenge);
  const codingScore = codingGated.score;

  // Delivery (Audio Gated)
  // Check if any question has valid audio signals
  const audioQuestion = answeredQuestions.find(q => q.deliverySignals && !q.deliverySignals.unavailable);
  const deliverySignals = audioQuestion ? audioQuestion.deliverySignals : session?.deliverySignals;
  const deliveryGated = gateDelivery(deliverySignals);
  const deliveryScore = deliveryGated.score;

  // Visual Presence (Camera Gated)
  const presenceGated = gateVisualPresence(session?.presenceSignals);
  const visualPresenceScore = presenceGated.score;

  // JD Alignment (JD Context Gated)
  const jdGated = gateJdAlignment(session, answeredQuestions);
  const jdAlignmentScore = jdGated.score;

  // 2. DYNAMIC WEIGHTED OVERALL SCORE CALCULATION
  // Rule: Only include available (non-null) dimensions. Re-normalize weights.
  const weightedComponents = [];

  if (techScore !== null) weightedComponents.push({ score: techScore, weight: 0.45, dimension: "technical" });
  if (codingScore !== null) weightedComponents.push({ score: codingScore, weight: 0.25, dimension: "coding" });
  if (commScore !== null) weightedComponents.push({ score: commScore, weight: 0.20, dimension: "communication" });
  if (deliveryScore !== null) weightedComponents.push({ score: deliveryScore, weight: 0.05, dimension: "delivery" });
  if (visualPresenceScore !== null) weightedComponents.push({ score: visualPresenceScore, weight: 0.05, dimension: "visualPresence" });
  if (jdAlignmentScore !== null) weightedComponents.push({ score: jdAlignmentScore, weight: 0.05, dimension: "jdAlignment" });

  let overallReadiness = 0;
  if (weightedComponents.length > 0) {
    const totalWeight = weightedComponents.reduce((acc, c) => acc + c.weight, 0);
    overallReadiness = Math.round(weightedComponents.reduce((acc, c) => acc + (c.score * c.weight), 0) / totalWeight);
  }

  // Handle explicit zero score when candidate gave all no-answers
  const allNoAnswers = answeredQuestions.length > 0 && answeredQuestions.every(q => q.classification === "NO_ANSWER" || q.evaluation?.answerStatus === "NO_ANSWER" || (q.analysis && q.analysis.technicalAccuracy === 0));

  const finalTechScore = allNoAnswers ? 0 : techScore;
  const finalCommScore = allNoAnswers ? 0 : commScore;
  if (allNoAnswers && (codingScore === null || codingScore === 0)) {
    overallReadiness = 0;
  }

  // 3. EVIDENCE DISCLOSURE & DATA QUALITY
  const evidenceAvailable = {
    transcript: answeredQuestions.length > 0,
    audio: deliveryGated.availability === "AVAILABLE",
    coding: codingGated.availability === "AVAILABLE",
    camera: presenceGated.availability === "AVAILABLE",
    jd: jdGated.availability === "AVAILABLE"
  };

  const availableCount = Object.values(evidenceAvailable).filter(Boolean).length;
  const evaluationQuality = availableCount >= 4 ? "HIGH" : availableCount >= 2 ? "MEDIUM" : "LOW";

  // 4. TOP 3 PRIORITIES DERIVED FROM RECURRING EVIDENCE
  const allWeaknesses = answeredQuestions.flatMap(q => q.feedback?.weaknesses || []);
  const allMissing = answeredQuestions.flatMap(q => q.feedback?.missingConcepts || []);
  const prioritySet = new Set([...allMissing, ...allWeaknesses]);
  const top3Priorities = Array.from(prioritySet).slice(0, 3);

  return {
    overallScore: overallReadiness,
    confidence: techQuestions.length >= 3 ? "HIGH" : "MEDIUM",
    evaluationQuality,
    evidenceAvailable,
    top3Priorities,
    dimensions: {
      technical: { score: techScore, availability: techScore !== null ? "AVAILABLE" : "UNAVAILABLE" },
      coding: { score: codingScore, availability: codingGated.availability, reason: codingGated.reason },
      communication: { score: commScore, availability: commScore !== null ? "AVAILABLE" : "UNAVAILABLE" },
      delivery: { score: deliveryScore, availability: deliveryGated.availability, reason: deliveryGated.reason },
      visualPresence: { score: visualPresenceScore, availability: presenceGated.availability, reason: presenceGated.reason },
      jdAlignment: { score: jdAlignmentScore, availability: jdGated.availability, reason: jdGated.reason, matchedSkills: jdGated.matchedSkills, missingSkills: jdGated.missingSkills }
    },
    scores: {
      technical: finalTechScore,
      communication: finalCommScore,
      clarity: finalCommScore,
      videoPresence: visualPresenceScore,
      structure: finalCommScore,
      problemSolving: codingScore,
      delivery: deliveryScore,
      jdAlignment: jdAlignmentScore,
      overallReadiness: overallReadiness
    }
  };
}
