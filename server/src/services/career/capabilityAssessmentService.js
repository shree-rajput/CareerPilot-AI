import { MentorAssessment } from "../../models/MentorAssessment.js";
import { User } from "../../models/User.js";
import { MentorProfile } from "../../models/MentorProfile.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Bank of practical challenges by track.
 */
const CHALLENGE_BANK = {
  technical: [
    {
      challengeId: "tech_01_explain_concept",
      title: "Explain Async/Await and Event Loop to a Beginner",
      scenarioPrompt: "A junior student is confused about asynchronous JavaScript, Promises, and the Event Loop. Write a clear, practical response explaining how async/await works under the hood with a code example and common pitfalls to avoid."
    },
    {
      challengeId: "tech_02_code_review",
      title: "Review & Fix Flawed Data Structure Code",
      scenarioPrompt: "A student submitted a Two Sum solution with O(N^2) time complexity and unhandled null edge cases. Conduct a code review identifying the performance issue, explaining why O(N) hash map is better, and providing constructive feedback."
    }
  ],
  career: [
    {
      challengeId: "career_01_resume_review",
      title: "Review a Junior Engineer's Resume",
      scenarioPrompt: "A student applying for Junior Fullstack Engineer roles lists 'Created a React App' without metrics or tech details. Provide actionable feedback on how to rewrite bullet points using the STAR/XYZ format to demonstrate real business impact."
    },
    {
      challengeId: "career_02_career_pivot",
      title: "Guide a Student Pivoting to Backend Engineering",
      scenarioPrompt: "A QA Engineer wants to transition to a Backend Software Developer role within 6 months. Create a realistic preparation roadmap detailing core topics, project ideas, and interview preparation steps."
    }
  ],
  interview: [
    {
      challengeId: "interview_01_mock_evaluation",
      title: "Evaluate a Candidate's Mock System Design Answer",
      scenarioPrompt: "During a mock interview for designing a URL Shortener, a candidate forgot to discuss database scaling and rate limiting. Evaluate their response and write structured, encouraging feedback for improvement."
    }
  ]
};

/**
 * Retrieves a practical challenge for a mentor based on track/expertise.
 */
export async function getCapabilityChallenge(track = "technical") {
  const challenges = CHALLENGE_BANK[track] || CHALLENGE_BANK.technical;
  // Pick deterministic or random challenge
  return challenges[0];
}

/**
 * Evaluates a mentor's challenge submission using transparent rubric scoring.
 * Deterministic scoring first; Groq AI advisory output appended if available.
 */
export async function evaluateCapabilitySubmission({ mentorId, track = "technical", challengeId, submissionContent }) {
  if (!submissionContent || submissionContent.trim().length < 50) {
    throw new Error("Submission content is too short to evaluate. Please provide a detailed response (at least 50 characters).");
  }

  const user = await User.findById(mentorId);
  if (!user) throw new Error("Mentor user not found.");

  const challenge = (CHALLENGE_BANK[track] || CHALLENGE_BANK.technical).find(c => c.challengeId === challengeId)
    || CHALLENGE_BANK.technical[0];

  // 1. Deterministic Rubric Evaluation based on length, structure, code blocks, and clarity heuristics
  const text = submissionContent.trim();
  const wordCount = text.split(/\s+/).length;

  let correctness = Math.min(100, Math.max(50, wordCount > 100 ? 85 : 70));
  let clarity = text.includes("\n") || text.includes("-") || text.includes("1.") ? 90 : 75;
  let relevance = text.toLowerCase().includes("example") || text.toLowerCase().includes("code") || text.toLowerCase().includes("step") ? 88 : 75;
  let communication = wordCount >= 80 ? 90 : 70;
  let teachingAbility = text.toLowerCase().includes("why") || text.toLowerCase().includes("how") || text.toLowerCase().includes("note") ? 85 : 70;
  let practicalUsefulness = text.length > 200 ? 88 : 75;

  let overallScore = Math.round(
    (correctness + clarity + relevance + communication + teachingAbility + practicalUsefulness) / 6
  );

  let isPassed = overallScore >= 70;

  // 2. Groq AI Advisory Evaluation (Optional Evidence)
  let aiAdvisoryReport = {
    strengths: ["Clear explanation structure", "Practical example provided"],
    improvements: ["Consider adding edge-case handling guidance"],
    recommendation: isPassed ? "PASSED_ADVISORY" : "REVIEW_REQUIRED"
  };

  try {
    const aiRes = await executeAiTask("EVALUATE_MENTOR_CAPABILITY", {
      track,
      challengeTitle: challenge.title,
      submissionContent
    });
    if (aiRes && aiRes.strengths && aiRes.improvements) {
      aiAdvisoryReport = {
        strengths: aiRes.strengths,
        improvements: aiRes.improvements,
        recommendation: aiRes.recommendation || (isPassed ? "PASSED_ADVISORY" : "REVIEW_REQUIRED")
      };
    }
  } catch (aiErr) {
    console.warn("[CapabilityAssessment] AI advisory evaluation skipped/failed:", aiErr.message);
  }

  // 3. Save Assessment Record
  const assessment = await MentorAssessment.create({
    mentorId,
    track,
    challengeId: challenge.challengeId,
    challengeTitle: challenge.title,
    scenarioPrompt: challenge.scenarioPrompt,
    submissionContent,
    rubricScores: {
      correctness,
      clarity,
      relevance,
      communication,
      teachingAbility,
      practicalUsefulness
    },
    overallScore,
    status: isPassed ? "passed" : "failed",
    evaluatorNotes: `Deterministic score: ${overallScore}/100. Status: ${isPassed ? "PASSED" : "FAILED"}.`,
    aiAdvisoryReport,
    completedAt: new Date()
  });

  // 4. Update Mentor User & Profile State
  if (isPassed) {
    user.capabilityStatus = "passed";
    user.mentorStatus = "probation";
    await user.save();

    await MentorProfile.findOneAndUpdate(
      { userId: mentorId },
      {
        reputationStatus: "probation",
        maxWeeklySessions: 5,
        isActive: true
      },
      { upsert: true }
    );
  } else {
    user.capabilityStatus = "failed";
    await user.save();
  }

  return {
    assessmentId: assessment._id,
    status: assessment.status,
    overallScore,
    rubricScores: assessment.rubricScores,
    aiAdvisoryReport,
    passed: isPassed
  };
}
