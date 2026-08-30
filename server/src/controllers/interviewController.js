import { InterviewSession } from "../models/InterviewSession.js";
import { InterviewQuestion } from "../models/InterviewQuestion.js";
import { InterviewChallenge } from "../models/InterviewChallenge.js";
import {
  buildFallbackInterviewEvaluation,
  buildFallbackInterviewQuestion,
  generateInterviewQuestion,
  generateInterviewChallenge,
  evaluateInterviewAnswer,
  evaluateCodingChallenge,
  extractCandidateContext,
  generateInterviewPlan,
  adaptiveNextAction,
  generateCoachingReport,
  generateInterviewerReaction,
  generateCodingFollowUp
} from "../services/ai/aiService.js";
import { Application } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { AppError } from "../utils/errors.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { env } from "../config/env.js";
import { groqTranscribe } from "../services/ai/groqProvider.js";
import fs from "fs";
import crypto from "crypto";
import { isNovelQuestion, fingerprintQuestion } from "../services/interview/questionNoveltyService.js";
import { executeCode } from "../services/codeExecution/executionService.js";

// ──────────────────────────────────────────────────────────────────────────────
// INTERVIEW STATE MACHINE
// ──────────────────────────────────────────────────────────────────────────────
//
// States:
//   INTRODUCTION   → Q1 (warm intro, candidate background)
//   THEORY         → Core technical / conceptual questions
//   PROJECT_DISCUSSION → Resume/project deep-dive
//   PRACTICAL      → Scenario-based questions
//   CODING         → Active coding challenge
//   CODING_REVIEW  → After code submitted, back to verbal Q&A
//   BEHAVIORAL     → Soft skills / situational questions
//   FINAL_EVALUATION → Wrap-up question
//   COMPLETED      → Interview done, generate report
//
// Deterministic Safety Rule:
//   For technical/mixed interviews with ≥7 questions, coding MUST occur
//   at roughly the 50%-60% mark if it hasn't already.
//
// ──────────────────────────────────────────────────────────────────────────────

function determineNextState(session, completedQuestions, completedChallenges) {
  const totalCount = completedQuestions.length + completedChallenges.length;
  const maxQ = session.numberOfQuestions;
  const isTechnical = ["technical", "mixed"].includes(session.interviewType);

  // SAFETY: never start a new coding phase if one already exists (answered or active)
  const codingAlreadyDone = completedChallenges.length > 0;

  // COMPLETED threshold
  if (totalCount >= maxQ) {
    return { state: "COMPLETED", reason: "Interview reached target question count." };
  }

  // Introduction (always first)
  if (totalCount === 0) {
    return { state: "INTRODUCTION", reason: "First question — start with warm introduction." };
  }

  // Final wrap-up
  if (totalCount === maxQ - 1) {
    return { state: "FINAL_EVALUATION", reason: "Second-to-last question — begin wrap-up." };
  }

  // Behavioral (near the end, after coding)
  if (totalCount === maxQ - 2 && codingAlreadyDone) {
    return { state: "BEHAVIORAL", reason: "Near end of interview and coding done — behavioral question." };
  }

  // CODING SAFETY TRIGGER: for technical interviews, ensure coding happens
  // at roughly the midpoint (50-60% through interview)
  if (isTechnical && !codingAlreadyDone) {
    const codingTriggerThreshold = Math.floor(maxQ * 0.5);
    const latestCodingDeadline = Math.floor(maxQ * 0.7); // never later than 70%

    if (totalCount >= codingTriggerThreshold || totalCount >= latestCodingDeadline) {
      console.log(`[Interview State] MOVE_TO_CODING | count=${totalCount}/${maxQ} | threshold=${codingTriggerThreshold}`);
      return { state: "CODING", reason: `Technical interview reached coding threshold at question ${totalCount + 1}.` };
    }
  }

  // After coding — return to CODING_REVIEW for the follow-up verbal question
  // This happens when the last challenge was just answered
  const lastChallenge = completedChallenges[completedChallenges.length - 1];
  if (lastChallenge && lastChallenge.status === "answered") {
    const questionsAfterCoding = completedQuestions.filter(q =>
      q.createdAt > lastChallenge.updatedAt
    ).length;
    if (questionsAfterCoding === 0) {
      return { state: "CODING_REVIEW", reason: "Coding challenge answered — generate verbal follow-up question." };
    }
  }

  // Project discussion — use resume if available
  if (totalCount >= 2 && totalCount <= 4 && session.resumeSnapshot?.projects?.length > 0) {
    const projectQuestionsAsked = completedQuestions.filter(q =>
      q.questionType === "PROJECT" || q.category?.toLowerCase() === "project"
    ).length;
    if (projectQuestionsAsked === 0) {
      return { state: "PROJECT_DISCUSSION", reason: "Resume projects available — ask project deep-dive." };
    }
  }

  // THEORY is the default for technical content
  if (isTechnical) {
    return { state: "THEORY", reason: "Technical interview — asking conceptual/practical question." };
  }

  // HR/Project interview
  if (session.interviewType === "project") {
    return { state: "PROJECT_DISCUSSION", reason: "Project interview mode." };
  }

  return { state: "BEHAVIORAL", reason: "HR/mixed interview — behavioral question." };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Create Session
// ──────────────────────────────────────────────────────────────────────────────

export async function createSession(req, res, next) {
  try {
    const { targetRole, technologyStack, interviewType, difficulty, applicationId, jobDescription, numberOfQuestions, mode, resumeText } = req.body;

    let extractedResumeText = resumeText || "";
    let resumeData = null;
    if (!extractedResumeText && applicationId) {
      const app = await Application.findById(applicationId);
      if (app && app.resumeVersionId) {
        const resume = await Resume.findById(app.resumeVersionId);
        if (resume) {
          extractedResumeText = resume.rawText;
          resumeData = resume.structuredData;
        }
      }
    } else if (!extractedResumeText) {
      const latestResume = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (latestResume) {
        extractedResumeText = latestResume.rawText;
        resumeData = latestResume.structuredData;
      }
    }

    let candidateContext = { summary: "", relevantSkills: [], potentialGaps: [] };
    if (extractedResumeText || jobDescription) {
      try {
        candidateContext = await extractCandidateContext({ resumeText: extractedResumeText, jobDescription, targetRole });
      } catch (err) {
        console.error("Failed to extract candidate context", err);
      }
    }

    const resumeSnapshot = {
      projects: resumeData?.projects?.map(p => ({
        name: p.name || p.title || "",
        technologies: p.technologies || [],
        description: p.description || p.summary || ""
      })) || [],
      education: {}
    };

    const clampedQuestions = Math.min(Math.max(numberOfQuestions || 10, 10), 15);

    let interviewPlan = [];
    try {
      const planRes = await generateInterviewPlan({
        targetRole,
        technologyStack,
        interviewType,
        difficulty,
        durationMinutes: 30
      });
      interviewPlan = planRes.plan || [];
    } catch (err) {
      console.error("Failed to generate interview plan", err);
    }

    const session = new InterviewSession({
      userId: req.user._id,
      applicationId: applicationId || null,
      targetRole,
      technologyStack,
      interviewType,
      difficulty,
      jobDescription: jobDescription || "",
      numberOfQuestions: clampedQuestions,
      mode: mode || "realistic",
      status: "in_progress",
      interviewState: "CREATED",
      candidateContext,
      resumeSnapshot,
      interviewSeed: crypto.randomUUID(),
      interviewPlan
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Get Next Question (State Machine Orchestrator)
//
// Idempotency pattern:
//   - If last entity is still "asked" (not answered) → return it
//   - If a "pending" stub exists → another request is generating, return 202
//   - Otherwise → determine next state and generate
// ──────────────────────────────────────────────────────────────────────────────

export async function getNextQuestion(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "completed") {
      throw new AppError("Session is already completed", 400);
    }

    const previousQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 }).lean();
    const previousChallenges = await InterviewChallenge.find({ interviewSessionId: sessionId }).sort({ createdAt: 1 }).lean();

    const completedQuestions = previousQuestions.filter(q => q.status !== "pending");
    const completedChallenges = previousChallenges.filter(c => c.validationStatus !== "pending");

    // Idempotency: if last entity is unanswered, return it
    const lastQuestion = completedQuestions[completedQuestions.length - 1];
    if (lastQuestion && lastQuestion.status === "asked") {
      return res.status(200).json({
        success: true,
        data: { type: "question", data: lastQuestion }
      });
    }

    // Return active (not yet answered) challenge
    const activeChallenge = completedChallenges.find(c => c.status === "active");
    if (activeChallenge) {
      return res.status(200).json({
        success: true,
        data: { type: "challenge", data: activeChallenge }
      });
    }

    // Check pending stubs (generation in-flight)
    const pendingStub = previousQuestions.find(q => q.status === "pending");
    const pendingChallenge = previousChallenges.find(c => c.validationStatus === "pending");
    if (pendingStub || pendingChallenge) {
      return res.status(202).json({
        success: true,
        data: null,
        message: "Question is being generated. Please wait a moment and try again."
      });
    }

    // Determine what to generate next
    const { state: nextState, reason } = determineNextState(session, completedQuestions, completedChallenges);

    console.log(`[Interview State] session=${sessionId} | totalAnswered=${completedQuestions.length + completedChallenges.length}/${session.numberOfQuestions} | nextState=${nextState} | reason="${reason}"`);

    if (nextState === "COMPLETED") {
      session.status = "completed";
      session.interviewState = "COMPLETED";
      session.completedAt = new Date();
      await session.save();
      return res.status(200).json({ success: true, data: null, message: "Interview completed" });
    }

    session.interviewState = nextState;
    await session.save();

    const limitCheck = await checkAiLimit(req.user._id, "mock_question", env.aiLimitMockQuestions);
    console.log(`[Interview] limitCheck for user ${req.user._id}: allowed=${limitCheck.allowed}, used=${limitCheck.used}, limit=${limitCheck.limit}`);

    // ── CODING CHALLENGE ──────────────────────────────────────────────────────
    if (nextState === "CODING") {
      const stub = await InterviewChallenge.create({
        interviewSessionId: sessionId,
        question: "__pending__",
        language: "javascript",
        difficulty: session.difficulty,
        validationStatus: "pending",
        status: "pending"
      });

      try {
        const aiChallenge = limitCheck.allowed
          ? await generateInterviewChallenge({
              targetRole: session.targetRole,
              technologyStack: session.technologyStack,
              difficulty: session.difficulty
            })
          : {
              question: "Write a function `twoSum(nums, target)` that returns the indices of two numbers that add up to target.",
              technology: "Algorithms",
              language: "javascript",
              difficulty: session.difficulty,
              starterCode: { javascript: "function twoSum(nums, target) {\n  // Your code here\n}" },
              testCases: [
                { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], explanation: "nums[0] + nums[1] = 2 + 7 = 9", hidden: false },
                { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], explanation: "nums[1] + nums[2] = 2 + 4 = 6", hidden: false }
              ],
              requirements: ["Return the indices as an array [i, j]"],
              constraints: ["O(n) time complexity preferred"],
              evaluationCriteria: ["Correctness", "Complexity", "Edge cases"]
            };

        stub.question = aiChallenge.question || "Coding Challenge";
        stub.technology = aiChallenge.technology || "Algorithms";
        stub.language = aiChallenge.language || "javascript";
        stub.difficulty = aiChallenge.difficulty || session.difficulty;
        stub.starterCode = aiChallenge.starterCode || {};
        stub.requirements = aiChallenge.requirements || [];
        stub.constraints = aiChallenge.constraints || [];
        stub.evaluationCriteria = aiChallenge.evaluationCriteria || [];
        stub.testCases = aiChallenge.testCases || [];
        stub.generatedBy = "ai";
        stub.validationStatus = "valid";
        stub.status = "active";
        await stub.save();

        if (limitCheck.allowed) {
          await incrementAiUsage(req.user._id, "mock_question");
        }

        // Build a natural verbal transition message from the AI interviewer
        const transitionText = `Alright. We've covered the core concepts well. I'd like to see how you approach a practical problem. Let's do a short coding exercise.`;

        console.log(`[Interview State] CODING challenge generated: challenge._id=${stub._id} | technology=${stub.technology}`);

        return res.status(201).json({
          success: true,
          data: {
            type: "challenge",
            data: stub,
            transitionMessage: transitionText
          }
        });
      } catch (err) {
        await InterviewChallenge.deleteOne({ _id: stub._id });
        throw err;
      }
    }

    // ── VERBAL QUESTION ──────────────────────────────────────────────────────
    const stub = await InterviewQuestion.create({
      sessionId,
      questionText: "__pending__",
      category: "Generating...",
      difficulty: session.difficulty,
      expectedConcepts: [],
      status: "pending"
    });

    try {
      // Build cross-session novelty history
      const allUserSessionIds = await InterviewSession.find({ userId: req.user._id }).distinct('_id');
      const crossSessionQuestions = await InterviewQuestion.find({
        sessionId: { $in: allUserSessionIds },
        status: { $in: ["asked", "answered"] }
      }).select('questionText').lean();
      const previousQuestionTexts = crossSessionQuestions.map(q => q.questionText);

      const questionContext = {
        targetRole: session.targetRole,
        technologyStack: session.technologyStack,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        jobDescription: session.jobDescription,
        previousQuestions: completedQuestions,
        conceptsTested: session.conceptsTested,
        candidateContext: session.candidateContext,
        resumeSnapshot: session.resumeSnapshot,
        questionNumber: completedQuestions.length + completedChallenges.length + 1,
        totalQuestions: session.numberOfQuestions,
        currentState: nextState,
        crossSessionPreviousQuestions: previousQuestionTexts,
        interviewSeed: session.interviewSeed
      };

      let aiQuestion = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;

        if (completedQuestions.length > 0) {
          const lastQ = completedQuestions[completedQuestions.length - 1];

          // For CODING_REVIEW: pass the coding context so the AI generates a targeted follow-up
          let enrichedContext = questionContext;
          if (nextState === "CODING_REVIEW") {
            const lastCodingChallenge = completedChallenges[completedChallenges.length - 1];
            enrichedContext = {
              ...questionContext,
              codingContext: lastCodingChallenge ? {
                question: lastCodingChallenge.question,
                aiFollowUp: lastCodingChallenge.aiReview?.followUpComment || ""
              } : undefined
            };
          }

          const adaptiveRes = limitCheck.allowed && lastQ
            ? await adaptiveNextAction({
                targetRole: session.targetRole,
                technologyStack: session.technologyStack,
                previousQuestions: completedQuestions,
                previousQuestionText: lastQ.questionText,
                transcript: lastQ.transcript,
                evaluation: lastQ.evaluation,
                currentState: nextState
              })
            : {
                action: "MOVE_FORWARD",
                nextQuestionText: buildFallbackInterviewQuestion(questionContext).questionText,
                expectedConcepts: []
              };

          aiQuestion = {
            questionText: adaptiveRes.nextQuestionText,
            category: adaptiveRes.action,
            difficulty: session.difficulty,
            expectedConcepts: adaptiveRes.expectedConcepts,
            generationSource: "ai"
          };
        } else {
          aiQuestion = limitCheck.allowed
            ? await generateInterviewQuestion(questionContext)
            : buildFallbackInterviewQuestion(questionContext, "Limit reached");
        }

        let novelty = { isNovel: true, maxSimilarity: 0 };
        // Only run novelty check if we have a question text
        if (aiQuestion && aiQuestion.questionText) {
          console.log(`[Interview] AI generated: "${aiQuestion.questionText}"`);
          novelty = isNovelQuestion(aiQuestion.questionText, previousQuestionTexts);
        } else {
          console.log(`[Interview] AI generation failed or returned empty question:`, aiQuestion);
        }

        if (novelty.isNovel || !limitCheck.allowed) {
          break;
        }

        console.log(`[Interview] Question too similar (score: ${novelty.maxSimilarity}, similar to: "${novelty.similarTo}"). Retrying... attempt ${attempts}`);
      }

      // If we failed to get a novel question after max attempts, fallback to an unused question from a local bank
      let finalNovelty = { isNovel: true };
      if (aiQuestion && aiQuestion.questionText) {
        finalNovelty = isNovelQuestion(aiQuestion.questionText, previousQuestionTexts);
      }

      if (!finalNovelty.isNovel) {
        console.warn(`[Interview] Failed to generate novel question after ${maxAttempts} attempts. Using fallback.`);
        const fallbacks = [
          `Tell me about a challenging technical problem you solved using ${session.technologyStack[0] || 'your primary technology'}.`,
          `How do you ensure code quality and maintainability in your projects?`,
          `Describe a time when you had to optimize the performance of an application.`,
          `What is your approach to handling technical debt?`,
          `Can you explain a complex architectural decision you made recently?`,
          `How do you handle disagreements about technical approaches within a team?`
        ];
        
        // Find a fallback that hasn't been asked
        let selectedFallback = null;
        for (const fb of fallbacks) {
          if (isNovelQuestion(fb, previousQuestionTexts).isNovel) {
            selectedFallback = fb;
            break;
          }
        }
        
        if (!selectedFallback) {
          selectedFallback = `Explain a key concept in ${session.technologyStack[0] || 'software engineering'} that you think every developer should know.`;
        }
        
        aiQuestion = {
          questionText: selectedFallback,
          category: "Behavioral/Practical",
          difficulty: session.difficulty,
          expectedConcepts: [],
          generationSource: "deterministic_fallback",
          fallbackReason: "AI generated repeated duplicates"
        };
      }

      if (!aiQuestion || !aiQuestion.questionText) {
        await InterviewQuestion.deleteOne({ _id: stub._id });
        throw new AppError("AI generated an empty question. Please try again.", 502, "AI_INVALID_RESPONSE");
      }

      if (aiQuestion.expectedConcepts && aiQuestion.expectedConcepts.length > 0) {
        session.conceptsTested.push({
          concept: aiQuestion.expectedConcepts[0],
          technology: session.technologyStack[0] || "General",
          questionType: aiQuestion.category || "THEORETICAL",
          count: 1
        });
        await session.save();
      }

      stub.questionText = aiQuestion.questionText.trim();
      stub.fingerprint = fingerprintQuestion(stub.questionText);
      stub.category = aiQuestion.category || "General";
      stub.difficulty = aiQuestion.difficulty || session.difficulty;
      stub.expectedConcepts = Array.isArray(aiQuestion.expectedConcepts) ? aiQuestion.expectedConcepts : [];
      stub.followUpStrategy = aiQuestion.followUpStrategy || "";
      stub.generationSource = aiQuestion.generationSource || "ai";
      stub.fallbackReason = aiQuestion.fallbackReason || "";
      stub.status = "asked";
      await stub.save();

      if (stub.generationSource === "ai") {
        await incrementAiUsage(req.user._id, "mock_question");
      }

      return res.status(201).json({
        success: true,
        data: { type: "question", data: stub }
      });
    } catch (err) {
      await InterviewQuestion.deleteOne({ _id: stub._id });
      throw err;
    }
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Submit Answer (with Conversational Reaction)
// ──────────────────────────────────────────────────────────────────────────────

export async function submitAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { transcript, metrics, videoMetrics } = req.body;

    const question = await InterviewQuestion.findById(questionId).populate("sessionId");
    if (!question || question.sessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Question not found", 404);
    }

    const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);

    const evaluationContext = {
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
      expectedConcepts: question.expectedConcepts,
      transcript,
      metrics
    };

    const evaluation = limitCheck.allowed
      ? await evaluateInterviewAnswer(evaluationContext)
      : buildFallbackInterviewEvaluation(evaluationContext, `Daily mock evaluation AI limit reached.`);

    question.transcript = transcript;
    question.communicationMetrics = metrics;
    question.evaluation = {
      relevance: evaluation.relevance || "Medium",
      correctness: evaluation.correctness || "Medium",
      depth: evaluation.depth || "Medium",
      specificity: evaluation.specificity || "Medium",
      structure: evaluation.structure || "Medium",
      evidenceCollected: evaluation.evidenceCollected || [],
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      missingConcepts: evaluation.missingConcepts || []
    };
    question.confidence = evaluation.confidence || "MEDIUM";
    question.idealAnswer = evaluation.idealAnswer;
    question.analysisSource = evaluation.analysisSource || "ai";
    question.analysisFallbackReason = evaluation.fallbackReason || "";
    question.status = "answered";

    await question.save();

    if (question.analysisSource === "ai") {
      await incrementAiUsage(req.user._id, "mock_evaluation");
    }

    // Generate natural interviewer reaction (conversational layer)
    let interviewerReaction = null;
    try {
      interviewerReaction = await generateInterviewerReaction({
        questionText: question.questionText,
        transcript,
        evaluation: question.evaluation
      });
    } catch (reactionErr) {
      console.warn("[Interview] Reaction generation failed:", reactionErr.message);
      // Fallback reaction based on evaluation
      const { correctness } = question.evaluation;
      if (correctness === 'High') {
        interviewerReaction = { reaction: "Good. Let's take that a step further.", tone: "affirming" };
      } else if (correctness === 'Low') {
        interviewerReaction = { reaction: "There's a small gap there — let me come at it from a different angle.", tone: "probing" };
      } else {
        interviewerReaction = { reaction: "Okay. Moving on.", tone: "neutral" };
      }
    }

    // Update skill evidence in career profile
    try {
      if (evaluation.correctness === "Medium" || evaluation.correctness === "High") {
        const { UserSkill } = await import("../models/UserSkill.js");
        const { normalizeSkill } = await import("../services/career/taxonomyService.js");
        const normalizedCategory = normalizeSkill(question.category);
        if (normalizedCategory && normalizedCategory.isKnown) {
          const existingSkill = await UserSkill.findOne({ userId: req.user._id, canonicalName: normalizedCategory.canonicalName });
          const newEvidence = {
            description: `Answered interview question on ${question.category} with ${evaluation.correctness} correctness`,
            source: "interview",
            date: new Date(),
            weight: evaluation.correctness === "High" ? 1.5 : 1
          };
          if (existingSkill) {
            existingSkill.evidence.push(newEvidence);
            existingSkill.confidence = Math.min(100, existingSkill.confidence + (evaluation.correctness === "High" ? 10 : 5));
            await existingSkill.save();
          }
        }
      }
    } catch (evErr) {
      console.error("Failed to update UserSkill evidence:", evErr);
    }

    res.status(200).json({
      success: true,
      data: {
        question,
        interviewerReaction  // ← The conversational response to show before "Next Question"
      }
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Run Code (before submission — test only, does not advance state)
// ──────────────────────────────────────────────────────────────────────────────

export async function runCode(req, res, next) {
  try {
    const { questionId } = req.params;
    const { language, code } = req.body;

    const challenge = await InterviewChallenge.findById(questionId).populate("interviewSessionId");
    if (!challenge || challenge.interviewSessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Challenge not found", 404);
    }

    // Only run public test cases (hidden: false) during Run
    const publicTestCases = (challenge.testCases || []).filter(tc => !tc.hidden);

    const executionResult = await executeCode({
      language,
      code,
      testCases: publicTestCases.length > 0 ? publicTestCases : challenge.testCases || []
    });

    res.status(200).json({
      success: true,
      data: {
        passedTests: executionResult.passedTests,
        totalTests: executionResult.totalTests,
        results: executionResult.results,
        isRunOnly: true  // flag so frontend knows this is not final submission
      }
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Submit Coding Answer (final — runs ALL tests, AI review, stores result)
// ──────────────────────────────────────────────────────────────────────────────

export async function submitCodingAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { language, code } = req.body;

    const challenge = await InterviewChallenge.findById(questionId).populate("interviewSessionId");
    if (!challenge || challenge.interviewSessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Challenge not found", 404);
    }

    // Execute against ALL test cases (including hidden)
    const executionResult = await executeCode({
      language,
      code,
      testCases: challenge.testCases || []
    });

    const totalTests = challenge.testCases?.length || 0;

    // AI Code Review
    let aiReview = null;
    let aiReviewSummary = "Not available.";
    try {
      const reviewResult = await evaluateCodingChallenge({
        questionTitle: challenge.question,
        questionDescription: challenge.description || challenge.question,
        language,
        code,
        testResults: `Passed ${executionResult.passedTests} of ${totalTests} test cases.`
      });
      aiReview = reviewResult;
      aiReviewSummary = [
        reviewResult.timeComplexity ? `Time: ${reviewResult.timeComplexity}` : "",
        reviewResult.spaceComplexity ? `Space: ${reviewResult.spaceComplexity}` : "",
        reviewResult.strengths?.length ? `Strengths: ${reviewResult.strengths.join(", ")}` : "",
        reviewResult.potentialIssues?.length ? `Issues: ${reviewResult.potentialIssues.join(", ")}` : ""
      ].filter(Boolean).join(". ");
    } catch (aiError) {
      console.warn("[Interview] AI code review failed:", aiError.message);
    }

    // Generate conversational follow-up for the next question
    let codingFollowUp = null;
    try {
      codingFollowUp = await generateCodingFollowUp({
        questionTitle: challenge.question,
        language,
        code,
        passedTests: executionResult.passedTests,
        totalTests,
        aiReviewSummary
      });
    } catch (cfErr) {
      console.warn("[Interview] Coding follow-up generation failed:", cfErr.message);
      codingFollowUp = {
        comment: `Your solution passed ${executionResult.passedTests} of ${totalTests} test cases.`,
        followUpQuestion: "Can you walk me through your approach and any trade-offs you considered?"
      };
    }

    // Mark challenge as answered and store results
    challenge.status = "answered";
    challenge.executionSummary = {
      passedTests: executionResult.passedTests,
      totalTests
    };
    if (aiReview) {
      challenge.aiReview = {
        metrics: aiReview.metrics || {},
        timeComplexity: aiReview.timeComplexity || "",
        spaceComplexity: aiReview.spaceComplexity || "",
        strengths: aiReview.strengths || [],
        potentialIssues: aiReview.potentialIssues || [],
        optimizationOpportunities: aiReview.optimizationOpportunities || [],
        followUpComment: codingFollowUp?.comment || ""
      };
    }
    await challenge.save();

    console.log(`[Interview State] Coding challenge ${challenge._id} ANSWERED | passed=${executionResult.passedTests}/${totalTests}`);

    res.status(200).json({
      success: true,
      data: {
        passedTests: executionResult.passedTests,
        totalTests,
        results: executionResult.results,
        aiReview,
        codingFollowUp  // ← Shown to candidate as interviewer comment before "Next Question"
      }
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. Complete Session
// ──────────────────────────────────────────────────────────────────────────────

export async function completeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    session.status = "completed";
    session.completedAt = new Date();

    const questions = await InterviewQuestion.find({ sessionId, status: "answered" }).sort({ createdAt: 1 });
    if (questions.length > 0) {
      try {
        const report = await generateCoachingReport({ targetRole: session.targetRole, questions });
        session.finalReport = report;
      } catch (err) {
        console.error("Failed to generate final report", err);
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Get Session Report
// ──────────────────────────────────────────────────────────────────────────────

export async function getSessionReport(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    const questions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 });
    const challenges = await InterviewChallenge.find({ interviewSessionId: sessionId }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: { session, questions, challenges }
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. List Sessions
// ──────────────────────────────────────────────────────────────────────────────

export async function listSessions(req, res, next) {
  try {
    const sessions = await InterviewSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. Transcribe Audio
// ──────────────────────────────────────────────────────────────────────────────

export async function transcribeAudio(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError("No audio file provided", 400);
    }

    const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);
    if (!limitCheck.allowed) {
      throw new AppError("Daily AI limit reached. Please type your answer.", 429);
    }

    const audioStream = fs.createReadStream(req.file.path);
    const transcript = await groqTranscribe(audioStream);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Failed to delete temp audio file:", err);
    });

    res.status(200).json({
      success: true,
      transcript
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
}
