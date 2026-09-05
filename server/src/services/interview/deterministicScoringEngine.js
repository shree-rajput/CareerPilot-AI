/**
 * Deterministic Rubric & Scoring Engine (Stage 2)
 *
 * Implements pure deterministic, evidence-backed rubric evaluation for interview answers.
 * Replaces direct LLM numeric scores and speech WPM filler penalties.
 *
 * Principles:
 * 1. Evidence-based: Every score maps to observable transcript evidence.
 * 2. Dimension Separation: Technical correctness and Communication are 100% independent.
 * 3. Behavioral Score Anchors (0-5 scale mapped to 0-100):
 *    0 = No evidence / fundamentally incorrect (0)
 *    1 = Very weak / major technical errors (20)
 *    2 = Limited / some correct concepts, important gaps (40)
 *    3 = Adequate / correct answer at expected level (60)
 *    4 = Strong / accurate reasoning & relevant details (80)
 *    5 = Deep, precise understanding with trade-offs & edge cases (100)
 * 4. Explicit non-answer handling: NO_ANSWER -> technical = 0, comm != 0.
 * 5. Audio corruption handling: TRANSCRIPTION_FAILURE -> technical = null, confidence = LOW.
 * 6. Follow-up prompted credit: Prompted correctness receives partial/scaled credit (promptedCorrectness = true).
 */

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
  const questionType = (questionContext.questionType || questionContext.category || "TECHNICAL").toUpperCase();
  const isFollowUp = Boolean(questionContext.isFollowUp || questionContext.promptedCorrectness);

  // 1. TRANSCRIPTION_FAILURE
  if (status === "TRANSCRIPTION_FAILURE" || evidence.isCorruptedTranscription) {
    return {
      classification: "TRANSCRIPTION_FAILURE",
      scores: {
        technicalCorrectness: { score: null, anchor: null, confidence: "LOW", evidenceIds: [] },
        conceptualUnderstanding: { score: null, anchor: null, confidence: "LOW", evidenceIds: [] },
        problemSolving: { score: null, anchor: null, confidence: "LOW", evidenceIds: [] },
        communication: { score: null, anchor: null, confidence: "LOW", evidenceIds: [] }
      },
      analysis: {
        technicalAccuracy: null,
        communication: null,
        clarity: null,
        depth: null,
        overall: null
      },
      confidence: "LOW",
      reason: "Unable to evaluate technical correctness because transcript quality was insufficient or corrupted.",
      feedback: {
        strengths: [],
        weaknesses: ["Audio transcript quality was insufficient or corrupted for automatic evaluation."],
        missingConcepts: expectedConcepts
      },
      idealAnswer: stage1Output.idealAnswer || { text: "N/A", explanation: "Transcript failure" }
    };
  }

  // 2. NO_ANSWER ("I don't know", refusal, blank)
  if (status === "NO_ANSWER") {
    // Honest communication of uncertainty is adequate communication (Anchor 3.0 / score 60), not 0
    const commAnchor = evidence.uncertaintyExpressed ? 3.0 : 2.0;
    return {
      classification: "NO_ANSWER",
      scores: {
        technicalCorrectness: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: ["Candidate gave no-answer response"] },
        conceptualUnderstanding: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: ["No conceptual understanding demonstrated"] },
        problemSolving: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [] },
        communication: { score: anchorToScore(commAnchor), anchor: commAnchor, confidence: "HIGH", evidenceIds: ["Honest communication of uncertainty"] }
      },
      analysis: {
        technicalAccuracy: 0,
        communication: anchorToScore(commAnchor),
        clarity: anchorToScore(commAnchor),
        depth: 0,
        overall: 0
      },
      confidence: "HIGH",
      reason: "Candidate stated they did not know or provided a non-answer response.",
      feedback: {
        strengths: evidence.uncertaintyExpressed ? ["Honest acknowledgment of knowledge boundary"] : [],
        weaknesses: ["Candidate did not provide a technical answer for this question."],
        missingConcepts: expectedConcepts
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
        technicalCorrectness: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: ["Answer off-topic"] },
        conceptualUnderstanding: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [] },
        problemSolving: { score: 0, anchor: 0, confidence: "HIGH", evidenceIds: [] },
        communication: { score: 30, anchor: 1.5, confidence: "HIGH", evidenceIds: ["Off-topic response"] }
      },
      analysis: {
        technicalAccuracy: 0,
        communication: 30,
        clarity: 30,
        depth: 0,
        overall: 0
      },
      confidence: "HIGH",
      reason: "Candidate provided an off-topic response.",
      feedback: {
        strengths: [],
        weaknesses: ["Answer was not relevant to the question asked."],
        missingConcepts: expectedConcepts
      },
      idealAnswer: stage1Output.idealAnswer || { text: "Focus directly on the question asked.", explanation: "Relevance gap" }
    };
  }

  // 4. TECHNICAL EVALUATION (INCORRECT, PARTIAL, CORRECT)
  const demonstrated = evidence.demonstratedConcepts || [];
  const missing = evidence.missingConcepts || [];
  const incorrectClaims = evidence.incorrectClaims || [];
  const reasoning = evidence.reasoningSignals || [];
  const practical = evidence.practicalSignals || [];
  const commSignals = evidence.communicationSignals || {};

  // Calculate Concept Coverage Ratio
  const totalConcepts = Math.max(1, expectedConcepts.length || (demonstrated.length + missing.length));
  const conceptRatio = Math.min(1.0, demonstrated.length / totalConcepts);

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
      if (conceptRatio >= 0.9) techAnchor += 0.2;
    } else if (status === "PARTIAL_ANSWER" || status === "PARTIAL") {
      techAnchor = 2.0 + (conceptRatio * 1.5);
      if (reasoning.length > 0) techAnchor += 0.2;
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
  // Communication evaluates observable structure, clarity, conciseness, and relevance
  let commAnchor = 3.0; // Default adequate (60)

  // Clarity
  if (commSignals.clarity && /clear|direct|understandable|precise/i.test(commSignals.clarity)) commAnchor += 0.5;
  if (commSignals.clarity && /confusing|unclear|vague/i.test(commSignals.clarity)) commAnchor -= 0.5;

  // Structure
  if (commSignals.structure && /logical|structured|sequence|flow/i.test(commSignals.structure)) commAnchor += 0.5;
  if (commSignals.structure && /disorganized|rambling|jumpy/i.test(commSignals.structure)) commAnchor -= 0.5;

  // Conciseness (Short answers are NOT penalized; long rambling IS penalized)
  if (commSignals.conciseness && /concise|direct|no fluff/i.test(commSignals.conciseness)) commAnchor += 0.5;
  if (commSignals.conciseness && /rambling|repetitive|wordy/i.test(commSignals.conciseness)) commAnchor -= 0.5;

  // Relevance
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

  // Overall question score: Technical (60%) + Communication (25%) + Depth (15%)
  const overallScore = Math.round((techScore * 0.60) + (commScore * 0.25) + (depthScore * 0.15));

  // Determine Confidence
  let confidence = stage1Output.confidence || "MEDIUM";
  if (demonstrated.length > 0 && expectedConcepts.length > 0) confidence = "HIGH";
  if (incorrectClaims.length > 0 && status === "CORRECT_ANSWER") confidence = "MEDIUM";

  return {
    classification: status,
    scores: {
      technicalCorrectness: { score: techScore, anchor: techAnchor, confidence, evidenceIds: demonstrated },
      conceptualUnderstanding: { score: Math.round(conceptRatio * 100), anchor: Math.round(conceptRatio * 5 * 10) / 10, confidence, evidenceIds: demonstrated },
      problemSolving: { score: reasoning.length > 0 ? techScore : Math.round(techScore * 0.8), anchor: techAnchor, confidence, evidenceIds: reasoning },
      communication: { score: commScore, anchor: commAnchor, confidence: "HIGH", evidenceIds: [commSignals.clarity, commSignals.structure].filter(Boolean) }
    },
    analysis: {
      technicalAccuracy: techScore,
      communication: commScore,
      clarity: commScore,
      depth: depthScore,
      overall: overallScore
    },
    confidence,
    promptedCorrectness: isFollowUp,
    reason: `Evaluated ${status} with ${demonstrated.length} demonstrated concept(s) and ${incorrectClaims.length} incorrect claim(s).`,
    feedback: {
      strengths: stage1Output.strengths?.length > 0 ? stage1Output.strengths : (demonstrated.length > 0 ? [`Demonstrated understanding of ${demonstrated.slice(0, 2).join(", ")}`] : ["Clear communication"]),
      weaknesses: stage1Output.weaknesses?.length > 0 ? stage1Output.weaknesses : (missing.length > 0 ? [`Missed core concepts: ${missing.slice(0, 2).join(", ")}`] : []),
      missingConcepts: missing.length > 0 ? missing : stage1Output.missingConcepts || []
    },
    idealAnswer: stage1Output.idealAnswer || { text: "N/A", explanation: "" }
  };
}

/**
 * Deterministic Session Level Aggregator
 * Calculates aggregate scores per dimension and overall session score.
 * Only includes dimensions with sufficient non-null evidence.
 */
export function calculateAggregateSessionScores(session, questionEvaluations = [], challengeEvaluations = []) {
  const validQuestions = (questionEvaluations || []).map(q => q.analysis ? q : (q.evaluation ? scoreQuestionFromEvidence(q.evaluation, q) : null)).filter(Boolean);
  const validChallenges = (challengeEvaluations || []).filter(c => c.status === "answered" || c.executionSummary);

  if (validQuestions.length === 0 && validChallenges.length === 0) {
    return {
      overallScore: 0,
      confidence: "LOW",
      scores: {
        technical: { score: 0, confidence: "LOW", sampleCount: 0 },
        communication: { score: 0, confidence: "LOW", sampleCount: 0 },
        clarity: { score: 0, confidence: "LOW", sampleCount: 0 },
        videoPresence: null, // explicitly null
        structure: { score: 0, confidence: "LOW", sampleCount: 0 },
        problemSolving: { score: 0, confidence: "LOW", sampleCount: 0 }
      }
    };
  }

  // Filter non-null technical scores (exclude TRANSCRIPTION_FAILURE)
  const techValidQuestions = validQuestions.filter(q => q.analysis && q.analysis.technicalAccuracy !== null && q.analysis.technicalAccuracy !== undefined);
  const commValidQuestions = validQuestions.filter(q => q.analysis && q.analysis.communication !== null && q.analysis.communication !== undefined);

  const allNoAnswers = validQuestions.length > 0 && validQuestions.every(q => q.classification === "NO_ANSWER" || (q.analysis && q.analysis.technicalAccuracy === 0));

  if (allNoAnswers && validChallenges.length === 0) {
    return {
      overallScore: 0,
      confidence: "HIGH",
      scores: {
        technical: { score: 0, confidence: "HIGH", sampleCount: techValidQuestions.length },
        communication: { score: 0, confidence: "HIGH", sampleCount: commValidQuestions.length },
        clarity: { score: 0, confidence: "HIGH", sampleCount: validQuestions.length },
        videoPresence: null,
        structure: { score: 0, confidence: "HIGH", sampleCount: validQuestions.length },
        problemSolving: { score: 0, confidence: "LOW", sampleCount: 0 }
      }
    };
  }

  // Technical Dimension
  const techScores = techValidQuestions.map(q => q.analysis.technicalAccuracy);
  const techAvg = techScores.length > 0 ? Math.round(techScores.reduce((a, b) => a + b, 0) / techScores.length) : null;
  const techConfidence = techScores.length >= 3 ? "HIGH" : techScores.length >= 2 ? "MEDIUM" : "LOW";

  // Communication Dimension
  const commScores = commValidQuestions.map(q => q.analysis.communication);
  const commAvg = commScores.length > 0 ? Math.round(commScores.reduce((a, b) => a + b, 0) / commScores.length) : null;
  const commConfidence = commScores.length >= 3 ? "HIGH" : commScores.length >= 2 ? "MEDIUM" : "LOW";

  // Clarity Dimension
  const clarityScores = validQuestions.map(q => q.analysis?.clarity).filter(v => v !== null && v !== undefined);
  const clarityAvg = clarityScores.length > 0 ? Math.round(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length) : null;

  // Structure / Depth Dimension
  const depthScores = validQuestions.map(q => q.analysis?.depth).filter(v => v !== null && v !== undefined);
  const depthAvg = depthScores.length > 0 ? Math.round(depthScores.reduce((a, b) => a + b, 0) / depthScores.length) : null;

  // Problem Solving / Coding Dimension
  let problemSolvingAvg = null;
  let hasCoding = false;
  if (validChallenges.length > 0) {
    hasCoding = true;
    const challengeScores = validChallenges.map(c => {
      const summary = c.executionSummary || {};
      const passed = summary.passedTests || 0;
      const total = Math.max(1, summary.totalTests || 1);
      return Math.round((passed / total) * 100);
    });
    problemSolvingAvg = Math.round(challengeScores.reduce((a, b) => a + b, 0) / challengeScores.length);
  }

  // Weighted Overall Score Calculation (Only using available non-null dimensions)
  let overallScore = 0;
  let totalWeight = 0;

  if (techAvg !== null) {
    const weight = hasCoding ? 0.45 : 0.65;
    overallScore += techAvg * weight;
    totalWeight += weight;
  }

  if (commAvg !== null) {
    const weight = hasCoding ? 0.25 : 0.35;
    overallScore += commAvg * weight;
    totalWeight += weight;
  }

  if (hasCoding && problemSolvingAvg !== null) {
    const weight = 0.30;
    overallScore += problemSolvingAvg * weight;
    totalWeight += weight;
  }

  const finalOverall = techAvg === 0 ? 0 : (totalWeight > 0 ? Math.round(overallScore / totalWeight) : 0);
  const overallConfidence = (techValidQuestions.length + validChallenges.length) >= 3 ? "HIGH" : "MEDIUM";

  return {
    overallScore: finalOverall,
    confidence: overallConfidence,
    scores: {
      technical: { score: techAvg, confidence: techConfidence, sampleCount: techScores.length },
      communication: { score: commAvg, confidence: commConfidence, sampleCount: commScores.length },
      clarity: { score: clarityAvg, confidence: commConfidence, sampleCount: clarityScores.length },
      videoPresence: null, // explicitly null — unavailable
      structure: { score: depthAvg, confidence: techConfidence, sampleCount: depthScores.length },
      problemSolving: { score: problemSolvingAvg, confidence: hasCoding ? "HIGH" : "LOW", sampleCount: validChallenges.length }
    }
  };
}

function buildFallbackEvaluation(reason) {
  return {
    classification: "INCORRECT_ANSWER",
    scores: {
      technicalCorrectness: { score: 0, anchor: 0, confidence: "LOW", evidenceIds: [] },
      communication: { score: 50, anchor: 2.5, confidence: "LOW", evidenceIds: [] }
    },
    analysis: { technicalAccuracy: 0, communication: 50, clarity: 50, depth: 0, overall: 0 },
    confidence: "LOW",
    reason,
    feedback: { strengths: [], weaknesses: [reason], missingConcepts: [] },
    idealAnswer: { text: "N/A", explanation: "" }
  };
}
