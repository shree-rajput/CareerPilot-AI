import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCandidateProgression } from "../src/services/interview/interviewAnalyticsService.js";
import { calculateSessionScores } from "../src/services/interview/reportScoringService.js";

describe("AI Interviewer - History, Replay, & Progression System", () => {
  describe("1. Candidate Progression Analytics", () => {
    it("should calculate score trends over time correctly", async () => {
      const pastSessions = [
        {
          _id: "session1",
          createdAt: new Date("2026-08-01"),
          targetRole: "Frontend Developer",
          overallScore: 55,
          scores: { technical: 50, problemSolving: 60, communication: 55, delivery: 50 }
        },
        {
          _id: "session2",
          createdAt: new Date("2026-08-15"),
          targetRole: "Frontend Developer",
          overallScore: 65,
          scores: { technical: 65, problemSolving: 70, communication: 60, delivery: 65 }
        },
        {
          _id: "session3",
          createdAt: new Date("2026-09-01"),
          targetRole: "Frontend Developer",
          overallScore: 78,
          scores: { technical: 80, problemSolving: 85, communication: 70, delivery: 75 }
        }
      ];

      const questionsBySession = {
        session1: [
          { status: "answered", feedback: { weaknesses: ["database indexing", "state management"] } }
        ],
        session2: [
          { status: "answered", feedback: { weaknesses: ["database indexing", "async handling"] } }
        ],
        session3: [
          { status: "answered", feedback: { weaknesses: ["database indexing"] } }
        ]
      };

      const progression = await calculateCandidateProgression(pastSessions, questionsBySession);

      assert.equal(progression.totalInterviews, 3);
      assert.equal(progression.averageScore, 66);
      assert.equal(progression.scoreChange, 23, "Score change from first (55) to latest (78) should be +23");
      assert.equal(progression.scoreTrend, "improving");
      assert.ok(progression.recurringWeaknesses.some(w => w.includes("database indexing")), "Should flag database indexing as a recurring weakness");
    });

    it("should handle empty or single session history gracefully", async () => {
      const progression = await calculateCandidateProgression([]);
      assert.equal(progression.totalInterviews, 0);
      assert.deepEqual(progression.scoreTrend, []);
      assert.equal(progression.scoreChange, 0);
      assert.deepEqual(progression.recurringWeaknesses, []);
    });
  });

  describe("2. Unified Analysis & Delivery/JD Scoring", () => {
    it("should compute overallReadiness combining technical, coding, communication, delivery, and jdAlignment", () => {
      const session = {
        interviewType: "mixed",
        difficulty: "medium",
        candidateExperience: "fresher",
        jdContext: {
          role: "Full Stack Engineer",
          requiredSkills: ["React", "Node.js", "MongoDB"]
        }
      };

      const questions = [
        {
          status: "answered",
          transcript: "React uses virtual DOM to efficiently update UI components.",
          category: "React",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 90, communication: { score: 85 } },
          deliverySignals: { available: true, confidenceIndex: 80, speakingPaceWpm: 120 },
          presenceSignals: { available: true, eyeContactScore: 90 }
        },
        {
          status: "answered",
          transcript: "Express middleware functions handle request and response cycles in Node.js.",
          category: "Node.js",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 85, communication: { score: 80 } },
          deliverySignals: { available: true, confidenceIndex: 75, speakingPaceWpm: 115 }
        },
        {
          status: "answered",
          transcript: "MongoDB is a document database storing data in BSON format.",
          category: "MongoDB",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 85, communication: { score: 80 } },
          deliverySignals: { available: true, confidenceIndex: 75, speakingPaceWpm: 115 }
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);

      assert.ok(reportScores.scores.delivery >= 75, `Expected delivery score >= 75, got ${reportScores.scores.delivery}`);
      assert.ok(reportScores.scores.jdAlignment >= 80, `Expected JD alignment >= 80, got ${reportScores.scores.jdAlignment}`);
      assert.ok(reportScores.scores.overallReadiness >= 80, `Expected overall readiness >= 80, got ${reportScores.scores.overallReadiness}`);
    });

    it("should gracefully handle missing delivery or presence signals without crashing or fabricating fake scores", () => {
      const session = {
        interviewType: "technical",
        difficulty: "easy",
        candidateExperience: "fresher"
      };

      const questions = [
        {
          status: "answered",
          transcript: "Component state holds data specific to that component.",
          evaluation: { answerStatus: "CORRECT", correctnessScore: 80, communication: { score: 75 } },
          deliverySignals: { available: false, reason: "Text answer" },
          presenceSignals: { available: false, reason: "Camera disabled" }
        }
      ];

      const reportScores = calculateSessionScores(session, questions, []);

      assert.equal(reportScores.scores.delivery, null, "Delivery score should be null when audio delivery signals are unavailable");
      assert.equal(reportScores.scores.videoPresence, null, "Video presence score should be null when camera presence signals are unavailable");
      assert.ok(reportScores.scores.overallReadiness > 0, "Overall readiness should still be calculated from available technical/communication scores");
    });
  });
});
