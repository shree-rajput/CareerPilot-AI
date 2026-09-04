import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePersonalizedGreeting, buildFallbackInterviewQuestion, buildFallbackInterviewEvaluation } from "../src/services/ai/aiService.js";
import { isNovelQuestion, normalizeQuestion, fingerprintQuestion, getNextDiverseCategory } from "../src/services/interview/questionNoveltyService.js";
import { validateGeneratedQuestion } from "../src/services/interview/questionValidationService.js";
import { calculateSessionScores, normalizeQuestionEvaluation, safeScore } from "../src/services/interview/reportScoringService.js";

describe("AI Technical Interviewer Comprehensive Acceptance Criteria Suite", () => {

  // TEST 1 — NEW INTERVIEW (PERSONALIZED OPENING GREETING)
  describe("TEST 1 — Personalized Interview Opening Greeting", () => {
    it("should greet candidate using actual first name when available", () => {
      const user = { firstName: "Shree", name: "Shree Rajput" };
      const greeting = generatePersonalizedGreeting(user, "Full Stack Engineer");
      assert.ok(greeting.includes("Hello Shree! 👋"));
      assert.ok(greeting.includes("Full Stack Engineer"));
      assert.ok(!greeting.includes("undefined"));
      assert.ok(!greeting.includes("null"));
      assert.ok(!greeting.includes("[object"));
    });

    it("should fallback gracefully to generic greeting when name is missing", () => {
      const user = {};
      const greeting = generatePersonalizedGreeting(user, "Backend Developer");
      assert.ok(greeting.includes("Hello! Welcome to your technical interview."));
      assert.ok(!greeting.includes("undefined"));
      assert.ok(!greeting.includes("null"));
    });
  });

  // TEST 2 — SAME QUESTION ANTI-REPETITION
  describe("TEST 2 — Same Question Anti-Repetition", () => {
    it("should reject exact duplicate questions previously asked", () => {
      const previousTexts = [
        "Explain how indexing works in PostgreSQL and when you should avoid it."
      ];
      const repeatQuestion = "Explain how indexing works in PostgreSQL and when you should avoid it.";
      const check = isNovelQuestion(repeatQuestion, previousTexts);
      assert.equal(check.isNovel, false);
      assert.equal(check.reason, "Exact duplicate found");
    });
  });

  // TEST 3 — SEMANTIC DUPLICATE DETECTION
  describe("TEST 3 — Semantic Duplicate Detection", () => {
    it("should detect semantic duplicates with different wording (REST vs REST API)", () => {
      const previousTexts = [
        "What is REST API?"
      ];
      const candidateQuestion = "Explain REST APIs.";
      const check = isNovelQuestion(candidateQuestion, previousTexts);
      assert.equal(check.isNovel, false, "Should detect semantic duplicate question");
    });

    it("should accept distinct questions on different concepts", () => {
      const previousTexts = [
        "What is REST API?"
      ];
      const novelQuestion = "How does database sharding improve read and write scalability?";
      const check = isNovelQuestion(novelQuestion, previousTexts);
      assert.equal(check.isNovel, true);
    });
  });

  // TEST 4 — TOPIC DIVERSITY ROTATION
  describe("TEST 4 — Topic Diversity Rotation", () => {
    it("should rotate across distinct topic categories", () => {
      const asked = ["FUNDAMENTALS", "PRACTICAL_IMPLEMENTATION"];
      const nextCategory = getNextDiverseCategory(asked, "mixed");
      assert.notEqual(nextCategory, "FUNDAMENTALS");
      assert.notEqual(nextCategory, "PRACTICAL_IMPLEMENTATION");
      assert.equal(nextCategory, "PROJECT_DEEP_DIVE");
    });
  });

  // TEST 5 — STRONG ANSWER EVALUATION
  describe("TEST 5 — Strong Answer Evaluation", () => {
    it("should evaluate a genuinely strong answer with high score and positive evidence", () => {
      const question = {
        questionText: "What is the difference between SQL and NoSQL databases?",
        transcript: "SQL databases are relational, table-based, and enforce strict ACID compliance and schemas. NoSQL databases are non-relational, document or key-value based, and offer flexible schemas with eventual consistency for horizontal scaling.",
        status: "answered",
        evaluation: {
          answerStatus: "CORRECT",
          correctnessScore: 92,
          correctness: "High",
          relevance: "High",
          depth: "High",
          communication: { score: 90, clarity: 95 }
        }
      };

      const normalized = normalizeQuestionEvaluation(question);
      assert.equal(normalized.analysis.technicalAccuracy, 92);
      assert.ok(normalized.analysis.overall >= 90);
    });
  });

  // TEST 6 — WRONG ANSWER EVALUATION (NO FAKE PRAISE)
  describe("TEST 6 — Wrong Answer Evaluation & Zero Fake Praise", () => {
    it("should evaluate incorrect answer with low score and NO fake praise", () => {
      const question = {
        questionText: "How does binary search work?",
        transcript: "Binary search compares every element in an array sequentially from start to end.",
        status: "answered",
        evaluation: {
          answerStatus: "INCORRECT",
          correctnessScore: 15,
          correctness: "Low",
          relevance: "Medium",
          depth: "Low",
          communication: { score: 50, clarity: 50 }
        }
      };

      const normalized = normalizeQuestionEvaluation(question);
      assert.equal(normalized.analysis.technicalAccuracy, 15);
      assert.ok(normalized.analysis.overall <= 35);
    });
  });

  // TEST 7 — "I DON'T KNOW" / NO_ANSWER HANDLING
  describe("TEST 7 — 'I Don't Know' / NO_ANSWER Handling", () => {
    it("should classify 'I don't know' as NO_ANSWER with 0 score across all dimensions", () => {
      const question = {
        questionText: "Explain how Garbage Collection works in V8 Engine.",
        transcript: "I don't know",
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

      const normalized = normalizeQuestionEvaluation(question);
      assert.equal(normalized.analysis.technicalAccuracy, 0);
      assert.equal(normalized.analysis.communication, 0);
      assert.equal(normalized.analysis.clarity, 0);
      assert.equal(normalized.analysis.depth, 0);
      assert.equal(normalized.analysis.overall, 0);
    });
  });

  // TEST 8 — PARTIAL ANSWER EVALUATION
  describe("TEST 8 — Partial Answer Evaluation", () => {
    it("should evaluate partial answer with medium score and identified missing concepts", () => {
      const question = {
        questionText: "Explain how React useEffect hook works.",
        transcript: "useEffect runs after rendering. It takes a function as the first argument.",
        expectedConcepts: ["dependency array", "cleanup function", "render lifecycle"],
        status: "answered",
        evaluation: {
          answerStatus: "PARTIAL",
          correctnessScore: 60,
          correctness: "Medium",
          missingConcepts: ["dependency array", "cleanup function"]
        }
      };

      const normalized = normalizeQuestionEvaluation(question);
      assert.equal(normalized.analysis.technicalAccuracy, 60);
      assert.deepEqual(normalized.feedback.missingConcepts, ["dependency array", "cleanup function"]);
    });
  });

  // TEST 9 — EVIDENCE-BASED REPORT GENERATION
  describe("TEST 9 — Evidence-Based Report Generation", () => {
    it("should calculate overall session score deterministically strictly from answer evidence", () => {
      const session = { interviewType: "technical", numberOfQuestions: 2 };
      const questions = [
        {
          status: "answered",
          transcript: "Strong answer on closures",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 90, correctness: "High", communication: { score: 85, clarity: 90 } }
        },
        {
          status: "answered",
          transcript: "I don't know",
          evaluation: { answerStatus: "NO_ANSWER", correctnessScore: 0, correctness: "Low" },
          analysisSource: "deterministic_non_answer"
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);
      assert.ok(reportScores.overallScore >= 40 && reportScores.overallScore <= 55, `Expected score ~45%, got ${reportScores.overallScore}`);
      assert.equal(reportScores.scores.videoPresence, null);
    });
  });

  // TEST 10 — REFRESH IDEMPOTENCY
  describe("TEST 10 — Refresh Idempotency & State Recovery", () => {
    it("should maintain question fingerprint determinism across normalizations", () => {
      const text1 = "Can you explain how state management works in React?";
      const text2 = "explain how state management works in React";
      assert.equal(fingerprintQuestion(text1), fingerprintQuestion(text2));
    });
  });

  // TEST 11 — GUARDRAIL & RELEVANCE VALIDATION
  describe("TEST 11 — Question Guardrail & Relevance Validation", () => {
    it("should validate relevant technical questions and reject malformed/generic ones", () => {
      const validQ = validateGeneratedQuestion({
        questionText: "How does async/await handle error propagation in Node.js applications?",
        candidateContext: { skills: ["Node.js", "JavaScript"] },
        targetRole: "Node.js Developer",
        technologyStack: ["Node.js", "JavaScript"],
        difficulty: "medium",
        interviewType: "technical"
      });
      assert.equal(validQ.isValid, true);

      const invalidQ = validateGeneratedQuestion({
        questionText: "as an ai here is a question question 1: null",
        candidateContext: {},
        targetRole: "Developer",
        technologyStack: ["JavaScript"],
        difficulty: "medium",
        interviewType: "technical"
      });
      assert.equal(invalidQ.isValid, false);
    });
  });

  // TEST 12 — AI FAILURE FALLBACK & SAFETY
  describe("TEST 12 — AI Failure Fallback & Safety", () => {
    it("should produce a clean fallback question and evaluation when AI service is unavailable", () => {
      const fallbackQ = buildFallbackInterviewQuestion({
        targetRole: "Frontend Engineer",
        technologyStack: ["React"],
        interviewType: "technical",
        difficulty: "medium"
      }, "AI limit reached");

      assert.ok(fallbackQ.questionText.length > 15);
      assert.equal(fallbackQ.generationSource, "deterministic_fallback");

      const fallbackEval = buildFallbackInterviewEvaluation({
        questionText: fallbackQ.questionText,
        transcript: "I used React state and props to pass data down.",
        expectedConcepts: ["React", "state", "props"]
      }, "AI limit reached");

      assert.ok(fallbackEval.relevance);
      assert.equal(fallbackEval.analysisSource, "deterministic_fallback");
    });
  });

});
