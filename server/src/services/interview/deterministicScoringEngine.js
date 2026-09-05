/**
 * Deterministic Rubric & Scoring Engine (Stage 2)
 *
 * Implements pure deterministic, evidence-backed rubric evaluation for interview answers.
 *
 * Principles:
 * 1. Evidence-based: Every score maps to observable transcript evidence.
 * 2. Dimension Separation: Technical correctness and Communication are 100% independent.
 * 3. Behavioral Score Anchors & Calibrated Bands:
 *    - 90–100 (Anchor 4.5 - 5.0): Excellent (Correct, complete, precise, strong reasoning/example)
 *    - 75–89  (Anchor 3.8 - 4.4): Strong (Mostly correct with minor omissions)
 *    - 60–74  (Anchor 3.0 - 3.7): Developing (Basic understanding but meaningful gaps)
 *    - 40–59  (Anchor 2.0 - 2.9): Weak (Partial understanding or significant omissions)
 *    - 0–39   (Anchor 0.0 - 1.9): Insufficient (Incorrect, irrelevant, or no answer)
 * 4. Explicit non-answer handling: NO_ANSWER -> technical = 0, comm != 0.
 * 5. Audio corruption handling: TRANSCRIPTION_FAILURE -> technical = null, confidence = NONE.
 * 6. Question-Specific Rubrics: Evaluates against question-type specific criteria.
 */

import { buildQuestionRubric } from "./questionRubricEngine.js";

export function anchorToScore(anchor) {
  if (anchor === null || anchor === undefined || !Number.isFinite(anchor)) return null;
  const clamped = Math.min(5, Math.max(0, anchor));
  return Math.round(clamped * 20);
}

export function scoreToAnchor(score) {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round((clamped / 20) * 10) / 10;
}

export function getScoreBand(score) {
  if (score === null || score === undefined) return "N/A";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Weak";
  return "Insufficient";
}

/**
 * Stage 2 Deterministic Scoring for a single verbal question.
 */
export function scoreQuestionFromEvidence(stage1Output, questionContext = {}) {
  if (!stage1Output) {
    return buildFallbackEvaluation("No evaluation data provided");
  }

  const status = (stage1Output.answerStatus || "CORRECT_ANSWER").toUpperCase();
  const evidence = stage1Output.evidence || {};
  const expectedConcepts = questionContext.expectedConcepts || stage1Output.missingConcepts || [];
  const questionText = questionContext.questionText || "";
  const category = questionContext.category || "Technical";
  const rubric = buildQuestionRubric(questionText, category, expectedConcepts);
  const isFollowUp = Boolean(questionContext.isFollowUp || questionContext.promptedCorrectness);

  // 1. TRANSCRIPTION_FAILURE
  if (status === "TRANSCRIPTION_FAILURE" || evidence.isCorruptedTranscription) {
    return {
      classification: "TRANSCRIPTION_FAILURE",
      scores: {
        technicalCorrectness: { score: null, anchor: null, confidence: "NONE", evidenceIds: [], availability: "UNAVAILABLE" },
        conceptualUnderstanding: { score: null, anchor: null, confidence: "NONE", evidenceIds: [], availability: "UNAVAILABLE" },
        problemSolving: { score: null, anchor: null, confidence: "NONE", evidenceIds: [], availability: "UNAVAILABLE" },
        communication: { score: null, anchor: null, confidence: "NONE", evidenceIds: [], availability: "UNAVAILABLE" }
      },
      analysis: {
        technicalAccuracy: null,
        communication: null,
        clarity: null,
        depth: null,
        overall: null,
        scoreBand: "N/A"
      },
      confidence: "NONE",
      availability: "UNAVAILABLE",
      reason: "Unable to evaluate response because transcript quality was corrupted or unreadable.",
      feedback: {
        strengths: [],
        weaknesses: ["Audio transcript quality was unreadable for automatic evaluation."],
        missingConcepts: rubric.coreCheckpoints,
        evidenceQuotes: []
      },
      idealAnswer: stage1Output.idealAnswer || { text: "N/A", explanation: "Transcript failure" }
    };
  }

  // 2. NO_ANSWER ("I don't know", refusal, blank)
  if (status === "NO_ANSWER") {
    const commAnchor = evidence.uncertaintyExpressed ? 3.0 : 2.0;
    const commScore = anchorToScore(commAnchor);
    return {
      classification: "NO_ANSWER",
      scores: {
        technicalCorrectness: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: ["Candidate gave no-answer response"], availability: "AVAILABLE" },
        conceptualUnderstanding: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [], availability: "AVAILABLE" },
        problemSolving: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [], availability: "AVAILABLE" },
        communication: { score: commScore, anchor: commAnchor, confidence: "HIGH", evidenceIds: ["Acknowledged knowledge boundary"], availability: "AVAILABLE" }
      },
      analysis: {
        technicalAccuracy: 0,
        communication: commScore,
        clarity: commScore,
        depth: 0,
        overall: 0,
        scoreBand: "Insufficient"
      },
      confidence: "HIGH",
      availability: "AVAILABLE",
      reason: "Candidate stated they did not know or provided a non-answer response.",
      feedback: {
        strengths: evidence.uncertaintyExpressed ? ["Honest acknowledgment of knowledge boundary"] : [],
        weaknesses: ["Candidate did not provide a technical answer for this question."],
        missingConcepts: rubric.coreCheckpoints,
        evidenceQuotes: []
      },
      idealAnswer: stage1Output.idealAnswer || {
        text: "A complete answer requires explaining the core expected concepts.",
        explanation: "Key concepts were missing."
      }
    };
  }

  // 3. IRRELEVANT_ANSWER
  if (status === "IRRELEVANT_ANSWER") {
    return {
      classification: "IRRELEVANT_ANSWER",
      scores: {
        technicalCorrectness: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: ["Answer off-topic"], availability: "AVAILABLE" },
        conceptualUnderstanding: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [], availability: "AVAILABLE" },
        problemSolving: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [], availability: "AVAILABLE" },
        communication: { score: 30, anchor: 1.5, confidence: "HIGH", evidenceIds: ["Off-topic response"], availability: "AVAILABLE" }
      },
      analysis: {
        technicalAccuracy: 0,
        communication: 30,
        clarity: 30,
        depth: 0,
        overall: 0,
        scoreBand: "Insufficient"
      },
      confidence: "HIGH",
      availability: "AVAILABLE",
      reason: "Candidate provided an off-topic response.",
      feedback: {
        strengths: [],
        weaknesses: ["Answer was off-topic and did not address the question asked."],
        missingConcepts: rubric.coreCheckpoints,
        evidenceQuotes: []
      },
      idealAnswer: stage1Output.idealAnswer || { text: "Focus directly on the question asked.", explanation: "Relevance gap" }
    };
  }

  // 4. TECHNICAL EVALUATION WITH QUESTION RUBRIC
  const demonstrated = evidence.demonstratedConcepts || [];
  const missing = evidence.missingConcepts || [];
  const incorrectClaims = evidence.incorrectClaims || [];
  const reasoning = evidence.reasoningSignals || [];
  const practical = evidence.practicalSignals || [];
  const commSignals = evidence.communicationSignals || {};
  const quotes = stage1Output.evidenceCollected || [];

  const totalCheckpoints = Math.max(1, rubric.coreCheckpoints.length || (demonstrated.length + missing.length));
  const conceptRatio = Math.min(1.0, demonstrated.length / totalCheckpoints);

  let techAnchor = 0;
  let techScore = 0;

  if (typeof stage1Output.correctnessScore === "number" && demonstrated.length === 0) {
    techScore = Math.min(100, Math.max(0, Math.round(stage1Output.correctnessScore)));
    techAnchor = scoreToAnchor(techScore);
  } else {
    if (status === "CORRECT_ANSWER" || status === "CORRECT") {
      techAnchor = 4.0;
      if (reasoning.length > 0) techAnchor += 0.4;
      if (practical.length > 0) techAnchor += 0.4;
      if (conceptRatio >= 0.8) techAnchor += 0.2;
    } else if (status === "PARTIAL_ANSWER" || status === "PARTIAL") {
      techAnchor = 2.0 + (conceptRatio * 1.5);
      if (reasoning.length > 0) techAnchor += 0.3;
    } else {
      techAnchor = 1.0;
      if (demonstrated.length > 0) techAnchor += 0.5;
    }

    if (incorrectClaims.length > 0) {
      techAnchor = Math.max(0, techAnchor - (incorrectClaims.length * 1.0));
    }

    if (isFollowUp) {
      techAnchor = Math.min(3.8, techAnchor * 0.85);
    }

    techAnchor = Math.min(5.0, Math.max(0.0, Math.round(techAnchor * 10) / 10));
    techScore = anchorToScore(techAnchor);
  }

  // 5. INDEPENDENT COMMUNICATION EVALUATION
  let commAnchor = 3.0; // Default adequate (60)

  if (commSignals.clarity && /clear|direct|understandable|precise/i.test(commSignals.clarity)) commAnchor += 0.5;
  if (commSignals.clarity && /confusing|unclear|vague/i.test(commSignals.clarity)) commAnchor -= 0.5;

  if (commSignals.structure && /logical|structured|sequence|flow/i.test(commSignals.structure)) commAnchor += 0.5;
  if (commSignals.structure && /disorganized|rambling|jumpy/i.test(commSignals.structure)) commAnchor -= 0.5;

  if (commSignals.conciseness && /concise|direct|no fluff/i.test(commSignals.conciseness)) commAnchor += 0.5;
  if (commSignals.conciseness && /rambling|repetitive|wordy/i.test(commSignals.conciseness)) commAnchor -= 0.5;

  if (commSignals.relevance && /connected|on topic|relevant/i.test(commSignals.relevance)) commAnchor += 0.5;

  commAnchor = Math.min(5.0, Math.max(1.0, Math.round(commAnchor * 10) / 10));
  let commScore = anchorToScore(commAnchor);

  if (typeof stage1Output.communication?.score === "number" && Object.keys(commSignals).length === 0) {
    commScore = Math.min(100, Math.max(0, Math.round(stage1Output.communication.score)));
    commAnchor = scoreToAnchor(commScore);
  }

  // 6. DEPTH & OVERALL DETERMINISTIC COMBINATION
  const depthAnchor = Math.min(5.0, Math.max(0.0, Math.round((conceptRatio * 3 + (reasoning.length > 0 ? 1 : 0) + (practical.length > 0 ? 1 : 0)) * 10) / 10));
  let depthScore = anchorToScore(depthAnchor);

  if (typeof stage1Output.correctnessScore === "number" && demonstrated.length === 0) {
    depthScore = techScore;
  }

  const weights = rubric.scoringWeights;
  const overallScore = Math.round((techScore * weights.technical) + (commScore * weights.communication) + (depthScore * weights.depth));

  let confidence = stage1Output.confidence || "MEDIUM";
  if (demonstrated.length > 0 && expectedConcepts.length > 0) confidence = "HIGH";
  if (incorrectClaims.length > 0 && status === "CORRECT_ANSWER") confidence = "MEDIUM";

  const strengthsList = stage1Output.strengths?.length > 0
    ? stage1Output.strengths
    : (demonstrated.length > 0 ? demonstrated.map(d => `Correctly identified and explained ${d}`) : ["Clear expression of answer"]);

  const weaknessesList = stage1Output.weaknesses?.length > 0
    ? stage1Output.weaknesses
    : (missing.length > 0 ? missing.map(m => `Missed key concept: ${m}`) : []);

  if (incorrectClaims.length > 0) {
    incorrectClaims.forEach(ic => weaknessesList.unshift(`Inaccurate claim: "${ic}"`));
  }

  return {
    classification: status,
    questionType: rubric.classification,
    scores: {
      technicalCorrectness: { score: techScore, anchor: techAnchor, confidence, evidenceIds: demonstrated, availability: "AVAILABLE" },
      conceptualUnderstanding: { score: Math.round(conceptRatio * 100), anchor: Math.round(conceptRatio * 5 * 10) / 10, confidence, evidenceIds: demonstrated, availability: "AVAILABLE" },
      problemSolving: { score: reasoning.length > 0 ? techScore : Math.round(techScore * 0.8), anchor: techAnchor, confidence, evidenceIds: reasoning, availability: "AVAILABLE" },
      communication: { score: commScore, anchor: commAnchor, confidence: "HIGH", evidenceIds: [commSignals.clarity, commSignals.structure].filter(Boolean), availability: "AVAILABLE" }
    },
    analysis: {
      technicalAccuracy: techScore,
      communication: commScore,
      clarity: commScore,
      depth: depthScore,
      overall: overallScore,
      scoreBand: getScoreBand(overallScore)
    },
    confidence,
    availability: "AVAILABLE",
    promptedCorrectness: isFollowUp,
    reason: `Evaluated against ${rubric.classification} rubric (${getScoreBand(overallScore)} band). Demonstrated ${demonstrated.length}/${totalCheckpoints} concepts.`,
    feedback: {
      strengths: strengthsList,
      weaknesses: weaknessesList,
      missingConcepts: missing.length > 0 ? missing : (stage1Output.missingConcepts || []),
      incorrectClaims,
      evidenceQuotes: quotes
    },
    idealAnswer: stage1Output.idealAnswer || { text: "N/A", explanation: "" }
  };
}

function buildFallbackEvaluation(reason) {
  return {
    classification: "INCORRECT_ANSWER",
    scores: {
      technicalCorrectness: { score: 0, anchor: 0, confidence: "LOW", evidenceIds: [], availability: "AVAILABLE" },
      communication: { score: 50, anchor: 2.5, confidence: "LOW", evidenceIds: [], availability: "AVAILABLE" }
    },
    analysis: { technicalAccuracy: 0, communication: 50, clarity: 50, depth: 0, overall: 0, scoreBand: "Insufficient" },
    confidence: "LOW",
    availability: "AVAILABLE",
    reason,
    feedback: { strengths: [], weaknesses: [reason], missingConcepts: [], evidenceQuotes: [] },
    idealAnswer: { text: "N/A", explanation: "" }
  };
}
