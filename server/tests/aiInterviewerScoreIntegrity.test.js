import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateSessionScores, normalizeQuestionEvaluation, safeScore } from "../src/services/interview/reportScoringService.js";
import { isNovelQuestion } from "../src/services/interview/questionNoveltyService.js";

describe("AI Interviewer Score Integrity & Deterministic Evaluation", () => {

  describe("1. safeScore Helper", () => {
    it("should clamp numeric values strictly between 0 and 100", () => {
      assert.equal(safeScore(150), 100);
      assert.equal(safeScore(-20), 0);
      assert.equal(safeScore(85.4), 85);
      assert.equal(safeScore(NaN, 0), 0);
    });

    it("should map qualitative ratings strictly without high default fallbacks", () => {
      assert.equal(safeScore("High"), 90);
      assert.equal(safeScore("Medium"), 65);
      assert.equal(safeScore("Low"), 20);
      assert.equal(safeScore("NO_ANSWER"), 0);
      assert.equal(safeScore("unknown", 0), 0);
    });
  });

  describe("2. normalizeQuestionEvaluation", () => {
    it("should evaluate non-answers ('No', 'idk') to 0 across all dimensions", () => {
      const nonAnswerQ = {
        questionText: "Explain how event delegation works in Javascript.",
        transcript: "No idea",
        status: "answered",
        evaluation: {
          answerStatus: "NO_ANSWER",
          correctnessScore: 0,
          correctness: "Low",
          relevance: "Low",
          depth: "Low"
        },
        analysisSource: "deterministic_non_answer"
      };

      const normalized = normalizeQuestionEvaluation(nonAnswerQ);
      assert.equal(normalized.analysis.technicalAccuracy, 0);
      assert.equal(normalized.analysis.communication, 0);
      assert.equal(normalized.analysis.clarity, 0);
      assert.equal(normalized.analysis.depth, 0);
      assert.equal(normalized.analysis.overall, 0);
      assert.deepEqual(normalized.feedback.strengths, []);
    });

    it("should evaluate strong answers accurately with high scores", () => {
      const strongQ = {
        questionText: "What is the difference between Virtual DOM and Real DOM?",
        transcript: "Virtual DOM is an in-memory lightweight representation of the real DOM. When state changes, React creates a new VDOM tree and diffs it with the previous one, updating only altered nodes in the real DOM for efficiency.",
        status: "answered",
        evaluation: {
          answerStatus: "CORRECT",
          correctnessScore: 95,
          correctness: "High",
          relevance: "High",
          depth: "High",
          communication: { score: 90, clarity: 95 }
        }
      };

      const normalized = normalizeQuestionEvaluation(strongQ);
      assert.equal(normalized.analysis.technicalAccuracy, 95);
      assert.equal(normalized.analysis.communication, 90);
      assert.equal(normalized.analysis.clarity, 95);
      assert.ok(normalized.analysis.overall >= 90);
    });
  });

  describe("3. calculateSessionScores (0% for All-No Answers)", () => {
    it("MUST award 0% overall score when candidate answers 'No' to all questions", () => {
      const session = {
        interviewType: "technical",
        difficulty: "medium",
        numberOfQuestions: 3
      };

      const questions = [
        {
          status: "answered",
          transcript: "No",
          evaluation: { answerStatus: "NO_ANSWER", correctnessScore: 0, correctness: "Low" },
          analysisSource: "deterministic_non_answer"
        },
        {
          status: "answered",
          transcript: "I don't know",
          evaluation: { answerStatus: "NO_ANSWER", correctnessScore: 0, correctness: "Low" },
          analysisSource: "deterministic_non_answer"
        },
        {
          status: "answered",
          transcript: "No idea",
          evaluation: { answerStatus: "NO_ANSWER", correctnessScore: 0, correctness: "Low" },
          analysisSource: "deterministic_non_answer"
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);

      assert.equal(reportScores.overallScore, 0, "Overall score for 3 'No' answers MUST be 0% (never ~50%)");
      assert.equal(reportScores.scores.technical, 0);
      assert.equal(reportScores.scores.communication, 0);
      assert.equal(reportScores.scores.clarity, 0);
      assert.equal(reportScores.scores.structure, 0);
      assert.equal(reportScores.scores.videoPresence, null);
    });

    it("should calculate correct high score for a perfect candidate", () => {
      const session = { interviewType: "technical", numberOfQuestions: 2 };
      const questions = [
        {
          status: "answered",
          transcript: "Detailed answer 1",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 90, correctness: "High", communication: { score: 90, clarity: 90 } }
        },
        {
          status: "answered",
          transcript: "Detailed answer 2",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 95, correctness: "High", communication: { score: 90, clarity: 95 } }
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);
      assert.ok(reportScores.overallScore >= 90);
      assert.equal(reportScores.scores.technical, 93);
    });

    it("should calculate approx 50% for half-correct candidate", () => {
      const session = { interviewType: "technical", numberOfQuestions: 2 };
      const questions = [
        {
          status: "answered",
          transcript: "Detailed answer 1",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 100, correctness: "High", communication: { score: 90, clarity: 90 } }
        },
        {
          status: "answered",
          transcript: "No idea",
          evaluation: { answerStatus: "NO_ANSWER", correctnessScore: 0, correctness: "Low" },
          analysisSource: "deterministic_non_answer"
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);
      assert.ok(reportScores.overallScore >= 45 && reportScores.overallScore <= 55, `Expected score ~50%, got ${reportScores.overallScore}`);
    });
  });

  describe("4. Question Anti-Repetition", () => {
    it("should reject previously asked questions", () => {
      const previous = [
        "Explain the difference between let, const, and var in JavaScript."
      ];
      const repeatAttempt = "Explain the difference between let, const, and var in JavaScript.";
      const novel = isNovelQuestion(repeatAttempt, previous);
      assert.equal(novel.isNovel, false, "Should detect repeated question");
    });

    it("should accept distinctly new questions", () => {
      const previous = [
        "Explain the difference between let, const, and var in JavaScript."
      ];
      const newQ = "How does asynchronous event loop work in Node.js?";
      const novel = isNovelQuestion(newQ, previous);
      assert.equal(novel.isNovel, true, "Should accept novel question");
    });
  });
});
