import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scoreQuestionFromEvidence,
  calculateAggregateSessionScores,
  anchorToScore,
  scoreToAnchor
} from "../src/services/interview/deterministicScoringEngine.js";

describe("AI Evaluation Engine — 15 Evidence-Based Test Scenarios", () => {

  // TEST 1: Correct technical answer → high technical score
  it("TEST 1: Correct technical answer produces high technical score", () => {
    const stage1Output = {
      answerStatus: "CORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: ["hash map", "average O(1) lookup", "key hashing"],
        missingConcepts: [],
        incorrectClaims: [],
        reasoningSignals: ["Explains bucket index calculation via hash function"],
        practicalSignals: ["Used in cache lookups for fast retrieval"],
        communicationSignals: {
          clarity: "Clear and direct",
          structure: "Logical flow",
          relevance: "Directly addresses question",
          conciseness: "No fluff"
        }
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["hash map", "average O(1) lookup"] });

    assert.equal(result.classification, "CORRECT_ANSWER");
    assert.ok(result.analysis.technicalAccuracy >= 80, `Expected technicalAccuracy >= 80, got ${result.analysis.technicalAccuracy}`);
    assert.equal(result.confidence, "HIGH");
  });

  // TEST 2: Fluent but technically wrong answer → low technical score, independent communication
  it("TEST 2: Fluent but technically wrong answer produces low technical score while communication remains independent", () => {
    const stage1Output = {
      answerStatus: "INCORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: [],
        missingConcepts: ["average O(1)", "hash collisions"],
        incorrectClaims: ["Hash map lookup is always O(1) worst case regardless of collisions"],
        reasoningSignals: [],
        communicationSignals: {
          clarity: "Extremely fluent and clear speech",
          structure: "Well structured presentation",
          relevance: "Attempted main topic"
        }
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["average O(1)", "hash collisions"] });

    assert.equal(result.classification, "INCORRECT_ANSWER");
    assert.ok(result.analysis.technicalAccuracy <= 20, `Expected technicalAccuracy <= 20 due to major incorrect claim, got ${result.analysis.technicalAccuracy}`);
    assert.ok(result.analysis.communication > result.analysis.technicalAccuracy, "Communication must remain independent and not drag down to 0 merely because technical content was incorrect");
  });

  // TEST 3: Short but correct answer → high technical score, comm not automatically low
  it("TEST 3: Short but correct answer produces high technical score and adequate communication score", () => {
    const stage1Output = {
      answerStatus: "CORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: ["database queries", "indexing", "network latency"],
        missingConcepts: [],
        incorrectClaims: [],
        reasoningSignals: ["Sequential troubleshooting order"],
        communicationSignals: {
          clarity: "Direct and clear",
          structure: "Logical step sequence",
          relevance: "Fully relevant",
          conciseness: "Short and to the point"
        }
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["database queries", "indexing"] });

    assert.ok(result.analysis.technicalAccuracy >= 80, `Expected high technical accuracy for correct short answer, got ${result.analysis.technicalAccuracy}`);
    assert.ok(result.analysis.communication >= 60, `Expected communication >= 60 (not penalized for brevity), got ${result.analysis.communication}`);
  });

  // TEST 4: Long but rambling answer → communication reduced only where evidence supports
  it("TEST 4: Long but rambling answer reduces communication score without inflating technical score", () => {
    const stage1Output = {
      answerStatus: "PARTIAL_ANSWER",
      evidence: {
        demonstratedConcepts: ["caching"],
        missingConcepts: ["indexing", "query optimization"],
        incorrectClaims: [],
        communicationSignals: {
          clarity: "Vague and repetitive",
          structure: "Disorganized flow",
          conciseness: "Excessive wordiness and filler rambling"
        }
      },
      confidence: "MEDIUM"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["caching", "indexing"] });

    assert.ok(result.analysis.communication <= 50, `Expected reduced communication score for rambling answer, got ${result.analysis.communication}`);
  });

  // TEST 5: "I don't know" → technical 0, comm not automatically 0
  it("TEST 5: 'I don't know' results in technical score 0, but communication is NOT automatically 0", () => {
    const stage1Output = {
      answerStatus: "NO_ANSWER",
      evidence: {
        demonstratedConcepts: [],
        missingConcepts: ["b-tree", "indexing"],
        uncertaintyExpressed: true
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["b-tree"] });

    assert.equal(result.classification, "NO_ANSWER");
    assert.equal(result.analysis.technicalAccuracy, 0, "Technical accuracy must be 0 for NO_ANSWER");
    assert.ok(result.analysis.communication >= 50, `Communication must NOT be 0 for honest acknowledgment of uncertainty, got ${result.analysis.communication}`);
  });

  // TEST 6: Partial answer → partial technical score
  it("TEST 6: Partial answer receives partial technical score proportional to demonstrated concepts", () => {
    const stage1Output = {
      answerStatus: "PARTIAL_ANSWER",
      evidence: {
        demonstratedConcepts: ["indexing", "query optimization"],
        missingConcepts: ["caching", "pagination"],
        incorrectClaims: []
      },
      confidence: "MEDIUM"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["indexing", "query optimization", "caching", "pagination"] });

    assert.equal(result.classification, "PARTIAL_ANSWER");
    assert.ok(result.analysis.technicalAccuracy >= 40 && result.analysis.technicalAccuracy <= 70, `Expected partial score (40-70), got ${result.analysis.technicalAccuracy}`);
  });

  // TEST 7: Correct answer after follow-up → distinguish prompted correctness
  it("TEST 7: Correct answer after follow-up prompt receives prompted credit adjustment", () => {
    const stage1Output = {
      answerStatus: "CORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: ["worst-case O(N) collision handling"],
        missingConcepts: [],
        incorrectClaims: []
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, {
      expectedConcepts: ["worst-case O(N)"],
      isFollowUp: true
    });

    assert.equal(result.promptedCorrectness, true);
    assert.ok(result.analysis.technicalAccuracy <= 76, `Expected capped/adjusted credit for prompted answer, got ${result.analysis.technicalAccuracy}`);
  });

  // TEST 8: Bad transcription → TRANSCRIPTION_FAILURE, technical score null
  it("TEST 8: Bad transcription produces TRANSCRIPTION_FAILURE with technical score null and LOW confidence", () => {
    const stage1Output = {
      answerStatus: "TRANSCRIPTION_FAILURE",
      evidence: {
        isCorruptedTranscription: true
      },
      confidence: "LOW"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["hash map"] });

    assert.equal(result.classification, "TRANSCRIPTION_FAILURE");
    assert.equal(result.analysis.technicalAccuracy, null);
    assert.equal(result.confidence, "LOW");
  });

  // TEST 9: Single communication question only → low confidence communication score
  it("TEST 9: Single communication sample produces LOW confidence aggregate score", () => {
    const questions = [
      {
        analysis: { technicalAccuracy: 80, communication: 70, clarity: 70, depth: 60 }
      }
    ];

    const aggregate = calculateAggregateSessionScores({}, questions, []);
    assert.equal(aggregate.scores.communication.confidence, "LOW");
    assert.equal(aggregate.scores.communication.sampleCount, 1);
  });

  // TEST 10: Excellent technical answer with simple English → technical score remains high
  it("TEST 10: Excellent technical answer using simple English retains high technical score", () => {
    const stage1Output = {
      answerStatus: "CORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: ["binary search", "O(log n)", "sorted array division"],
        missingConcepts: [],
        incorrectClaims: [],
        reasoningSignals: ["Explains cutting search space in half at each step"]
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["binary search", "O(log n)"] });

    assert.ok(result.analysis.technicalAccuracy >= 80, `Expected technicalAccuracy >= 80 for simple English correct answer, got ${result.analysis.technicalAccuracy}`);
  });

  // TEST 11: Excellent English with incorrect technical content → independent evaluation
  it("TEST 11: Excellent English with incorrect technical content does not inflate technical score", () => {
    const stage1Output = {
      answerStatus: "INCORRECT_ANSWER",
      evidence: {
        demonstratedConcepts: [],
        missingConcepts: ["binary search O(log n)"],
        incorrectClaims: ["Binary search takes O(N) time because we inspect every element in order"],
        communicationSignals: {
          clarity: "Impeccable grammar and articulation",
          structure: "Polished tone"
        }
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["binary search", "O(log n)"] });

    assert.ok(result.analysis.technicalAccuracy <= 20, `Technical score must remain LOW despite pristine English, got ${result.analysis.technicalAccuracy}`);
  });

  // TEST 12: Candidate gives irrelevant answer → IRRELEVANT_ANSWER
  it("TEST 12: Irrelevant answer yields IRRELEVANT_ANSWER classification and technical score 0", () => {
    const stage1Output = {
      answerStatus: "IRRELEVANT_ANSWER",
      evidence: {
        demonstratedConcepts: [],
        missingConcepts: ["React useEffect"],
        incorrectClaims: []
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["React useEffect"] });

    assert.equal(result.classification, "IRRELEVANT_ANSWER");
    assert.equal(result.analysis.technicalAccuracy, 0);
  });

  // TEST 13: Candidate answers all questions incorrectly → technical score genuinely low, NO artificial 50 normalization
  it("TEST 13: All incorrect answers result in low technical score without artificial normalization to 50", () => {
    const questions = [
      { analysis: { technicalAccuracy: 0, communication: 40, clarity: 40, depth: 0 } },
      { analysis: { technicalAccuracy: 20, communication: 40, clarity: 40, depth: 0 } },
      { analysis: { technicalAccuracy: 10, communication: 40, clarity: 40, depth: 0 } }
    ];

    const aggregate = calculateAggregateSessionScores({}, questions, []);

    assert.ok(aggregate.scores.technical.score <= 15, `Expected aggregate technical <= 15, got ${aggregate.scores.technical.score}`);
    assert.ok(aggregate.overallScore < 30, `Expected overall score < 30 without artificial 50 boost, got ${aggregate.overallScore}`);
  });

  // TEST 14: Half correct / half incorrect → score reflects actual evidence
  it("TEST 14: Half correct / half incorrect answers reflect actual weighted evidence", () => {
    const questions = [
      { analysis: { technicalAccuracy: 90, communication: 80, clarity: 80, depth: 80 } },
      { analysis: { technicalAccuracy: 10, communication: 50, clarity: 50, depth: 10 } }
    ];

    const aggregate = calculateAggregateSessionScores({}, questions, []);

    assert.equal(aggregate.scores.technical.score, 50, `Expected exact average of 50, got ${aggregate.scores.technical.score}`);
  });

  // TEST 15: No answer / timeout → NO_ANSWER, technical score 0
  it("TEST 15: No answer / timeout yields NO_ANSWER with technical score 0", () => {
    const stage1Output = {
      answerStatus: "NO_ANSWER",
      evidence: {
        demonstratedConcepts: [],
        missingConcepts: ["system design scalability"]
      },
      confidence: "HIGH"
    };
    const result = scoreQuestionFromEvidence(stage1Output, { expectedConcepts: ["system design scalability"] });

    assert.equal(result.classification, "NO_ANSWER");
    assert.equal(result.analysis.technicalAccuracy, 0);
  });

});
