import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  gateVisualPresence,
  gateDelivery,
  gateJdAlignment,
  gateCodingPerformance
} from "../src/services/interview/evidenceGatingEngine.js";

import {
  scoreQuestionFromEvidence,
  getScoreBand
} from "../src/services/interview/deterministicScoringEngine.js";

import {
  calculateSessionScores,
  normalizeQuestionEvaluation
} from "../src/services/interview/reportScoringService.js";

import { buildFallbackInterviewEvaluation } from "../src/services/ai/aiService.js";

describe("Evidence-First Evaluation System & Signal Gating", () => {

  it("1. Camera Unavailable -> Visual Presence score is null (N/A)", () => {
    const presenceSignals = { cameraEnabled: false, available: false };
    const result = gateVisualPresence(presenceSignals);

    assert.equal(result.score, null);
    assert.equal(result.availability, "UNAVAILABLE");
    assert.equal(result.confidence, "NONE");
    assert.match(result.reason, /Camera was disabled/i);
  });

  it("2. Camera Active but Insufficient Valid Frames -> Visual Presence score is null (N/A)", () => {
    const presenceSignals = {
      cameraEnabled: true,
      videoTrackActive: true,
      validFramesCount: 2,
      faceDetectedRatio: 0.1
    };
    const result = gateVisualPresence(presenceSignals);

    assert.equal(result.score, null);
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("3. Audio Signal Unavailable -> Delivery score is null (N/A)", () => {
    const deliverySignals = { audioTrackActive: false, available: false };
    const result = gateDelivery(deliverySignals);

    assert.equal(result.score, null);
    assert.equal(result.availability, "UNAVAILABLE");
    assert.equal(result.confidence, "NONE");
    assert.match(result.reason, /Raw audio signal was unavailable/i);
  });

  it("4. Transcript Available -> Communication score is computed independently", () => {
    const stage1Output = {
      answerStatus: "CORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: ["useState", "useEffect"],
        missingConcepts: ["cleanup"],
        communicationSignals: {
          clarity: "clear and direct",
          structure: "logical sequence",
          conciseness: "direct"
        }
      }
    };
    const result = scoreQuestionFromEvidence(stage1Output, { questionText: "Explain React hooks" });

    assert.notEqual(result.scores.communication.score, null);
    assert.equal(result.scores.communication.availability, "AVAILABLE");
    assert.ok(result.scores.communication.score >= 60);
  });

  it("5. No Job Description Provided -> JD Alignment score is null (N/A)", () => {
    const session = { targetRole: "Frontend Developer" };
    const result = gateJdAlignment(session, []);

    assert.equal(result.score, null);
    assert.equal(result.availability, "UNAVAILABLE");
    assert.match(result.reason, /No job description was provided/i);
  });

  it("6. Coding Execution Failure -> Coding score is null (N/A), not 70", () => {
    const challenge = {
      status: "answered",
      executionSummary: {
        executionFailed: true,
        error: "Runtime syntax error"
      }
    };
    const result = gateCodingPerformance(challenge);

    assert.equal(result.score, null);
    assert.equal(result.availability, "UNAVAILABLE");
    assert.match(result.reason, /execution failed/i);
  });

  it("7. AI Evaluator Failure -> Fallback returns partial status and exact missing concepts without fake default score", () => {
    const fallback = buildFallbackInterviewEvaluation({
      transcript: "useState is used for managing state",
      expectedConcepts: ["useState", "useEffect", "dependency array"]
    }, "API rate limit");

    assert.equal(fallback.evaluationStatus, "partial");
    assert.equal(fallback.answerStatus, "PARTIAL_ANSWER");
    assert.deepEqual(fallback.evidence.demonstratedConcepts, ["useState"]);
    assert.deepEqual(fallback.evidence.missingConcepts, ["useEffect", "dependency array"]);
    assert.equal(fallback.analysisSource, "deterministic_fallback");
  });

  it("8. Golden Test ('Explain useEffect and dependency array')", () => {
    const questionContext = {
      questionText: "Explain useEffect and its dependency array in React.",
      category: "React",
      expectedConcepts: ["side effects", "execution timing", "dependency array", "cleanup function"]
    };

    const candidateOutput = {
      answerStatus: "PARTIAL_ANSWER",
      evidence: {
        demonstratedConcepts: ["side effects"],
        missingConcepts: ["dependency array", "cleanup function", "execution timing"],
        incorrectClaims: ["it renders the component every time"],
        communicationSignals: { clarity: "direct", conciseness: "brief" }
      },
      evidenceCollected: ['"useeffect hook for managing the side effects"'],
      strengths: ["Correctly identified useEffect as a side-effect mechanism"],
      weaknesses: ["Described useEffect as rendering the component", "Dependency array behavior omitted"]
    };

    const evaluation = scoreQuestionFromEvidence(candidateOutput, questionContext);

    assert.equal(evaluation.questionType, "TECHNICAL_CONCEPT");
    assert.deepEqual(evaluation.feedback.missingConcepts, ["dependency array", "cleanup function", "execution timing"]);
    assert.ok(evaluation.feedback.weaknesses.some(w => w.includes("Inaccurate claim") || w.includes("rendering")));
    assert.ok(["Insufficient", "Weak"].includes(getScoreBand(evaluation.analysis.technicalAccuracy)));
  });

  it("9. Overall Score Calculation excludes N/A dimensions from weighted average", () => {
    const session = {
      targetRole: "Fullstack Engineer",
      presenceSignals: { cameraEnabled: false, available: false }
    };

    const questions = [
      {
        status: "answered",
        analysis: { technicalAccuracy: 80, communication: 80, clarity: 80, depth: 75, overall: 78, scoreBand: "Strong" },
        feedback: { strengths: ["Good hooks usage"], weaknesses: [] }
      }
    ];

    const result = calculateSessionScores(session, questions, []);

    // Visual Presence, Delivery, Coding, JD Alignment must be null
    assert.equal(result.dimensions.visualPresence.score, null);
    assert.equal(result.dimensions.delivery.score, null);
    assert.equal(result.dimensions.coding.score, null);
    assert.equal(result.dimensions.jdAlignment.score, null);

    // Overall Readiness must equal 80 (since only technical & comm are available with score 80)
    assert.equal(result.overallScore, 80);
    assert.equal(result.evaluationQuality, "LOW"); // Only transcript signals available
  });

});
