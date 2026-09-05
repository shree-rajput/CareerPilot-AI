import mongoose from "mongoose";
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
  generateCodingFollowUp,
  generatePersonalizedGreeting
} from "../services/ai/aiService.js";
import { Application } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { AppError } from "../utils/errors.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { env } from "../config/env.js";
import { groqTranscribe } from "../services/ai/groqProvider.js";
import { normalizeCodingQuestion } from "../services/codeExecution/questionNormalizationService.js";
import fs from "fs";
import crypto from "crypto";
import { isNovelQuestion, fingerprintQuestion, getNextDiverseCategory } from "../services/interview/questionNoveltyService.js";
import { validateGeneratedQuestion } from "../services/interview/questionValidationService.js";
import { executeCode } from "../services/codeExecution/executionService.js";
import { calculateSessionScores, normalizeQuestionEvaluation, safeScore } from "../services/interview/reportScoringService.js";
import { scoreQuestionFromEvidence } from "../services/interview/deterministicScoringEngine.js";

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

    const userPrefs = req.user?.interviewPreferences || {};
    const primaryRole = (req.user?.targetRoles || []).find(r => r.isPrimary) || req.user?.targetRoles?.[0];

    const finalTargetRole = targetRole || primaryRole?.title || "Software Engineer";
    const finalTechStack = (technologyStack && Array.isArray(technologyStack) && technologyStack.length > 0)
      ? technologyStack
      : (primaryRole?.techStack || req.user?.technicalSkills || []);
    const finalInterviewType = interviewType || userPrefs.defaultInterviewType || "mixed";
    const finalDifficulty = difficulty || userPrefs.defaultDifficulty || "medium";

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
    let jdContext = {
      role: finalTargetRole,
      level: "fresher",
      responsibilities: [],
      requiredSkills: finalTechStack,
      preferredSkills: [],
      technologies: finalTechStack,
      domain: "",
      interviewRelevantTopics: finalTechStack
    };

    if (extractedResumeText || jobDescription) {
      try {
        candidateContext = await extractCandidateContext({ resumeText: extractedResumeText, jobDescription, targetRole: finalTargetRole });
      } catch (err) {
        console.error("Failed to extract candidate context", err);
      }
    }

    if (jobDescription) {
      try {
        const parsedJd = await extractJobDescription(jobDescription);
        if (parsedJd) {
          jdContext = {
            role: parsedJd.role || finalTargetRole,
            level: parsedJd.level || "fresher",
            responsibilities: Array.isArray(parsedJd.responsibilities) ? parsedJd.responsibilities : [],
            requiredSkills: Array.isArray(parsedJd.requiredSkills) ? parsedJd.requiredSkills : finalTechStack,
            preferredSkills: Array.isArray(parsedJd.preferredSkills) ? parsedJd.preferredSkills : [],
            technologies: Array.isArray(parsedJd.technologies) ? parsedJd.technologies : finalTechStack,
            domain: parsedJd.domain || "",
            interviewRelevantTopics: Array.isArray(parsedJd.interviewRelevantTopics) ? parsedJd.interviewRelevantTopics : finalTechStack
          };
        }
      } catch (jdErr) {
        console.warn("Failed to parse JD context cleanly:", jdErr.message);
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

    const clampedQuestions = Math.min(Math.max(numberOfQuestions || 10, 5), 15);

    let interviewPlan = [];
    try {
      const planRes = await generateInterviewPlan({
        targetRole: finalTargetRole,
        technologyStack: finalTechStack,
        interviewType: finalInterviewType,
        difficulty: finalDifficulty,
        durationMinutes: userPrefs.durationMinutes || 30
      });
      interviewPlan = planRes.plan || [];
    } catch (err) {
      console.error("Failed to generate interview plan", err);
    }

    const greeting = generatePersonalizedGreeting(req.user, finalTargetRole);

    const candidateExp = req.body.candidateExperience || (
      /(senior|lead|staff|principal)/i.test(finalTargetRole) ? "senior" :
      /(junior|associate|intern|fresher|entry|student)/i.test(finalTargetRole) ? "fresher" : "fresher"
    );

    const session = new InterviewSession({
      userId: req.user._id,
      applicationId: applicationId || null,
      targetRole: finalTargetRole,
      technologyStack: finalTechStack,
      interviewType: finalInterviewType,
      difficulty: finalDifficulty,
      candidateExperience: candidateExp,
      currentTopicCategory: "Backend",
      currentConcept: "REST Endpoints",
      coveredConcepts: [],
      followUpDepth: 0,
      lastAnswerQuality: "strong",
      jobDescription: jobDescription || "",
      jdContext,
      presenceSignals: {
        enabled: Boolean(req.body.enableVideoPresence),
        cameraAvailable: Boolean(req.body.enableVideoPresence)
      },
      numberOfQuestions: clampedQuestions,
      mode: mode || "realistic",
      status: "in_progress",
      interviewState: "CREATED",
      candidateContext,
      resumeSnapshot,
      interviewSeed: crypto.randomUUID(),
      greeting,
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
        data: {
          type: "question",
          data: lastQuestion,
          greeting: completedQuestions.length === 1 ? session.greeting : undefined
        }
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

    // Cleanup stale pending stubs (>30s old) from past interrupted generations
    await InterviewQuestion.deleteMany({ interviewSessionId: sessionId, status: "pending", createdAt: { $lt: new Date(Date.now() - 30000) } });
    await InterviewChallenge.deleteMany({ interviewSessionId: sessionId, validationStatus: "pending", createdAt: { $lt: new Date(Date.now() - 30000) } });

    // Check pending stubs (generation in-flight < 30s)
    const pendingStub = previousQuestions.find(q => q.status === "pending" && (Date.now() - new Date(q.createdAt).getTime() < 30000));
    const pendingChallenge = previousChallenges.find(c => c.validationStatus === "pending" && (Date.now() - new Date(c.createdAt).getTime() < 30000));
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
              functionName: "twoSum",
              parameters: [
                { name: "nums", type: "integer[]" },
                { name: "target", type: "integer" }
              ],
              returnType: "integer[]",
              starterCode: { javascript: "function twoSum(nums, target) {\n  // Your code here\n}" },
              testCases: [
                { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1], explanation: "nums[0] + nums[1] = 2 + 7 = 9", hidden: false },
                { input: [[3, 2, 4], 6], expectedOutput: [1, 2], explanation: "nums[1] + nums[2] = 2 + 4 = 6", hidden: false }
              ],
              requirements: ["Return the indices as an array [i, j]"],
              constraints: ["O(n) time complexity preferred"],
              evaluationCriteria: ["Correctness", "Complexity", "Edge cases"]
            };

        const normalizedChallenge = normalizeCodingQuestion(aiChallenge);

        stub.question = normalizedChallenge.question;
        stub.description = normalizedChallenge.description;
        stub.technology = normalizedChallenge.technology;
        stub.language = normalizedChallenge.language;
        stub.difficulty = normalizedChallenge.difficulty;
        stub.functionName = normalizedChallenge.functionName;
        stub.parameters = normalizedChallenge.parameters;
        stub.returnType = normalizedChallenge.returnType;
        stub.starterCode = normalizedChallenge.starterCode;
        stub.execution = normalizedChallenge.execution;
        stub.requirements = normalizedChallenge.requirements;
        stub.constraints = normalizedChallenge.constraints;
        stub.evaluationCriteria = normalizedChallenge.evaluationCriteria;
        stub.testCases = normalizedChallenge.testCases;
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

      // Full-Stack topic distribution map for progressive, single-concept interviewing
      const FULLSTACK_TOPIC_MAP = {
        Backend: ["REST API Endpoints", "HTTP Status Codes & Methods", "Input Validation & Sanitization", "Database Queries", "Authentication Basics", "Error Handling & Logging"],
        Frontend: ["React State Management", "Component Props & Design", "API Fetching & Async Data", "Loading & Error States", "Basic Client-side Caching"],
        Database: ["Database Schema Design", "Basic SQL / NoSQL Queries", "Entity Relationships", "Indexing Fundamentals"],
        Architecture: ["Separation of Concerns", "Client-Server Data Flow", "Basic Application Structure"],
        Behavioral: ["Teamwork & Collaboration", "Debugging Complex Bugs", "Handling Technical Disagreements"]
      };

      let targetCategory = session.currentTopicCategory || "Backend";
      let targetConcept = session.currentConcept || "REST API Endpoints";
      let followUpDepth = session.followUpDepth || 0;
      let coveredConcepts = session.coveredConcepts || [];

      if (completedQuestions.length > 0) {
        const lastQ = completedQuestions[completedQuestions.length - 1];
        const correctness = lastQ?.evaluation?.correctness || (lastQ?.analysis?.technicalAccuracy > 60 ? "High" : lastQ?.analysis?.technicalAccuracy > 30 ? "Medium" : "Low");
        const status = lastQ?.evaluation?.answerStatus || "CORRECT_ANSWER";

        if (status === "NO_ANSWER" || correctness === "Low") {
          session.lastAnswerQuality = status === "NO_ANSWER" ? "no_answer" : "weak";
          if (followUpDepth >= 1) {
            if (!coveredConcepts.includes(targetConcept)) coveredConcepts.push(targetConcept);
            followUpDepth = 0;
            const categories = Object.keys(FULLSTACK_TOPIC_MAP);
            const currentIdx = categories.indexOf(targetCategory);
            targetCategory = categories[(currentIdx + 1) % categories.length];
            const availableConcepts = FULLSTACK_TOPIC_MAP[targetCategory] || ["General Concepts"];
            targetConcept = availableConcepts.find(c => !coveredConcepts.includes(c)) || availableConcepts[0];
          } else {
            followUpDepth += 1;
          }
        } else if (status === "PARTIAL_ANSWER" || correctness === "Medium") {
          session.lastAnswerQuality = "partial";
          followUpDepth += 1;
          if (followUpDepth >= 2) {
            if (!coveredConcepts.includes(targetConcept)) coveredConcepts.push(targetConcept);
            followUpDepth = 0;
            const categories = Object.keys(FULLSTACK_TOPIC_MAP);
            const currentIdx = categories.indexOf(targetCategory);
            targetCategory = categories[(currentIdx + 1) % categories.length];
            const availableConcepts = FULLSTACK_TOPIC_MAP[targetCategory] || ["General Concepts"];
            targetConcept = availableConcepts.find(c => !coveredConcepts.includes(c)) || availableConcepts[0];
          }
        } else {
          session.lastAnswerQuality = "strong";
          if (followUpDepth < 1) {
            followUpDepth += 1;
          } else {
            if (!coveredConcepts.includes(targetConcept)) coveredConcepts.push(targetConcept);
            followUpDepth = 0;
            const categories = Object.keys(FULLSTACK_TOPIC_MAP);
            const currentIdx = categories.indexOf(targetCategory);
            targetCategory = categories[(currentIdx + 1) % categories.length];
            const availableConcepts = FULLSTACK_TOPIC_MAP[targetCategory] || ["General Concepts"];
            targetConcept = availableConcepts.find(c => !coveredConcepts.includes(c)) || availableConcepts[0];
          }
        }
      }

      session.currentTopicCategory = targetCategory;
      session.currentConcept = targetConcept;
      session.followUpDepth = followUpDepth;
      session.coveredConcepts = coveredConcepts;
      await session.save();

      const questionContext = {
        targetRole: session.targetRole,
        technologyStack: session.technologyStack,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        candidateExperience: session.candidateExperience || "fresher",
        targetCategory,
        targetConcept,
        followUpDepth,
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

          let enrichedContext = {
            ...questionContext,
            candidateExperience: session.candidateExperience || "fresher"
          };
          if (nextState === "CODING_REVIEW") {
            const lastCodingChallenge = completedChallenges[completedChallenges.length - 1];
            enrichedContext = {
              ...enrichedContext,
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
                candidateExperience: session.candidateExperience || "fresher",
                previousQuestions: completedQuestions,
                previousQuestionText: lastQ.questionText,
                transcript: lastQ.transcript,
                evaluation: lastQ.evaluation,
                currentState: nextState,
                codingContext: enrichedContext.codingContext
              })
            : {
                action: "MOVE_FORWARD",
                nextQuestionText: buildFallbackInterviewQuestion(questionContext).questionText,
                expectedConcepts: []
              };

          aiQuestion = {
            questionText: adaptiveRes.nextQuestionText,
            category: targetCategory,
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
        let validation = { isValid: true, reason: "" };

        if (aiQuestion && aiQuestion.questionText) {
          console.log(`[Interview] AI generated: "${aiQuestion.questionText}"`);
          novelty = isNovelQuestion(aiQuestion.questionText, previousQuestionTexts);
          validation = validateGeneratedQuestion({
            questionText: aiQuestion.questionText,
            candidateContext: session.candidateContext || {},
            targetRole: session.targetRole,
            technologyStack: session.technologyStack,
            difficulty: session.difficulty,
            interviewType: session.interviewType,
            candidateExperience: session.candidateExperience || "fresher"
          });
        } else {
          console.log(`[Interview] AI generation failed or returned empty question:`, aiQuestion);
          validation = { isValid: false, reason: "Empty or null question generated" };
        }

        if ((novelty.isNovel && validation.isValid) || !limitCheck.allowed) {
          break;
        }

        console.log(`[Interview] Question rejected (novelty: ${novelty.isNovel}, valid: ${validation.isValid}, reason: "${validation.reason || novelty.reason}"). Retrying... attempt ${attempts}`);
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

      // Persist question fingerprint and concepts on session for novelty tracking
      if (stub.fingerprint && !session.askedQuestionFingerprints.includes(stub.fingerprint)) {
        session.askedQuestionFingerprints.push(stub.fingerprint);
      }
      if (stub.expectedConcepts && stub.expectedConcepts.length > 0) {
        for (const c of stub.expectedConcepts) {
          if (!session.askedConcepts.includes(c)) {
            session.askedConcepts.push(c);
          }
        }
      }
      await session.save();

      if (stub.generationSource === "ai") {
        await incrementAiUsage(req.user._id, "mock_question");
      }

      return res.status(201).json({
        success: true,
        data: {
          type: "question",
          data: stub,
          greeting: completedQuestions.length === 0 ? session.greeting : undefined
        }
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

    // 1. Validate questionId format
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      const err = new AppError("Invalid question ID format", 400, "INVALID_QUESTION_ID");
      err.field = "questionId";
      throw err;
    }

    // 2. Validate payload: support transcript OR answer OR text
    const rawAnswer = req.body?.transcript ?? req.body?.answer ?? req.body?.text;
    const transcript = String(rawAnswer || "").trim();
    const { metrics } = req.body;

    if (!transcript) {
      const err = new AppError("Answer text cannot be empty. Please type or speak your answer.", 400, "MISSING_ANSWER_TEXT");
      err.field = "transcript";
      throw err;
    }

    // 3. Query Question & Session Ownership
    const question = await InterviewQuestion.findById(questionId).populate("sessionId");
    if (!question) {
      // Check if it's an InterviewChallenge instead
      const challenge = await InterviewChallenge.findById(questionId);
      if (challenge) {
        const err = new AppError("This is a coding challenge question. Use submitCodingAnswer instead.", 400, "WRONG_ENDPOINT_FOR_CHALLENGE");
        err.field = "questionId";
        throw err;
      }
      const err = new AppError("Interview question not found", 404, "QUESTION_NOT_FOUND");
      err.field = "questionId";
      throw err;
    }

    if (!question.sessionId) {
      const err = new AppError("Associated interview session was not found", 404, "SESSION_NOT_FOUND");
      err.field = "sessionId";
      throw err;
    }

    if (question.sessionId.userId.toString() !== req.user._id.toString()) {
      const err = new AppError("You do not have permission to access this interview session", 403, "UNAUTHORIZED_QUESTION_ACCESS");
      err.field = "sessionId";
      throw err;
    }

    if (question.sessionId.status === "completed") {
      const err = new AppError("Interview session is already completed", 409, "SESSION_ALREADY_COMPLETED");
      err.field = "sessionId";
      throw err;
    }

    // 4. Idempotency & Duplicate Submission check
    if (question.status === "answered") {
      const existingClean = (question.transcript || "").trim().toLowerCase();
      const submittedClean = transcript.toLowerCase();
      if (existingClean === submittedClean) {
        console.log(`[Interview] Idempotent retry detected for question ${questionId}. Returning saved evaluation.`);
        let interviewerReaction = null;
        try {
          interviewerReaction = await generateInterviewerReaction({
            questionText: question.questionText,
            transcript: question.transcript,
            evaluation: question.evaluation
          });
        } catch (rErr) {
          interviewerReaction = { reaction: "Answer already analyzed. Moving forward.", tone: "affirming" };
        }

        return res.status(200).json({
          success: true,
          data: {
            question,
            interviewerReaction,
            isIdempotentRetry: true
          }
        });
      }

      const err = new AppError("This question has already been answered and evaluated", 409, "QUESTION_ALREADY_ANSWERED");
      err.field = "questionId";
      throw err;
    }

    // 5. Persist Answer FIRST (Candidate work is safe in DB before AI processing!)
    question.transcript = transcript;
    question.communicationMetrics = metrics || {};
    question.status = "answered";

    if (req.body.deliverySignals && typeof req.body.deliverySignals === "object") {
      question.deliverySignals = {
        speakingPace: Number(req.body.deliverySignals.speakingPace || metrics?.speakingPace || 0),
        fillerWords: Number(req.body.deliverySignals.fillerWords || metrics?.fillerWords || 0),
        longPauses: Number(req.body.deliverySignals.longPauses || metrics?.longPauses || 0),
        hesitationScore: Number(req.body.deliverySignals.hesitationScore || 0),
        observedNotes: String(req.body.deliverySignals.observedNotes || ""),
        suggestion: String(req.body.deliverySignals.suggestion || ""),
        unavailable: Boolean(req.body.deliverySignals.unavailable)
      };
    } else if (metrics && (metrics.speakingPace || metrics.fillerWords || metrics.longPauses)) {
      question.deliverySignals = {
        speakingPace: Number(metrics.speakingPace || 0),
        fillerWords: Number(metrics.fillerWords || 0),
        longPauses: Number(metrics.longPauses || 0),
        hesitationScore: Math.min(100, ((metrics.fillerWords || 0) * 10) + ((metrics.longPauses || 0) * 15)),
        observedNotes: `Observed pace: ${metrics.speakingPace || 130} WPM with ${metrics.fillerWords || 0} filler words and ${metrics.longPauses || 0} pauses.`,
        suggestion: (metrics.longPauses || 0) > 2 ? "Take a short pause before answering and structure into 2-3 key points." : "Good, steady delivery pace.",
        unavailable: false
      };
    } else {
      question.deliverySignals = { unavailable: true };
    }

    if (req.body.presenceSignals && typeof req.body.presenceSignals === "object") {
      question.presenceSignals = {
        cameraAvailable: Boolean(req.body.presenceSignals.cameraAvailable),
        gazeConsistency: String(req.body.presenceSignals.gazeConsistency || "Consistent"),
        postureNotes: String(req.body.presenceSignals.postureNotes || "Upright"),
        observedNotes: String(req.body.presenceSignals.observedNotes || ""),
        suggestion: String(req.body.presenceSignals.suggestion || ""),
        unavailable: Boolean(req.body.presenceSignals.unavailable)
      };
    } else {
      question.presenceSignals = { unavailable: true };
    }

    await question.save();

    // 6. Perform Evaluation & Scoring
    const rawClean = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const nonAnswerPhrases = [
      "no", "no idea", "idk", "dont know", "i dont know", "i do not know",
      "not sure", "no clue", "none", "pass", "skip", "n a", "na", "dunno",
      "have no idea", "i have no idea", "sorry no idea", "no answer", "dont know answer",
      "nothing", "cant answer", "i cant answer", "i cannot answer"
    ];

    const isNonAnswer = rawClean.length < 3 || nonAnswerPhrases.some(p => rawClean === p || rawClean.startsWith("i dont know") || rawClean.startsWith("i do not know") || rawClean.startsWith("no idea"));

    let stage1Output = null;

    if (isNonAnswer) {
      console.log(`[Interview] Non-answer detected for question ${questionId}: "${transcript}". Processing deterministically.`);
      stage1Output = {
        answerStatus: "NO_ANSWER",
        evidence: {
          demonstratedConcepts: [],
          missingConcepts: question.expectedConcepts || [],
          incorrectClaims: [],
          reasoningSignals: [],
          practicalSignals: [],
          communicationSignals: { clarity: "Candidate stated uncertainty or declined answer" },
          uncertaintyExpressed: true,
          isCorruptedTranscription: false
        },
        evidenceCollected: ["Candidate gave a non-answer response."],
        strengths: [],
        weaknesses: ["Unable to demonstrate technical knowledge on this question."],
        missingConcepts: question.expectedConcepts || [],
        confidence: "HIGH",
        idealAnswer: {
          text: "A complete answer would cover: " + (question.expectedConcepts || []).join(", "),
          explanation: "Core expected concepts."
        },
        analysisSource: "deterministic_non_answer"
      };
    } else {
      try {
        const limitCheck = await checkAiLimit(req.user._id, "mock_evaluation", env.aiLimitMockEvaluations);
        const evaluationContext = {
          questionText: question.questionText,
          category: question.category,
          difficulty: question.difficulty,
          expectedConcepts: question.expectedConcepts,
          transcript,
          metrics
        };
        stage1Output = limitCheck.allowed
          ? await evaluateInterviewAnswer(evaluationContext)
          : buildFallbackInterviewEvaluation(evaluationContext, `Daily mock evaluation AI limit reached.`);
      } catch (aiErr) {
        console.error("[Interview] AI evaluation error. Falling back gracefully:", aiErr.message);
        stage1Output = buildFallbackInterviewEvaluation({
          questionText: question.questionText,
          expectedConcepts: question.expectedConcepts,
          transcript,
          metrics
        }, "AI service error during evaluation");
      }
    }

    const deterministicResult = scoreQuestionFromEvidence(stage1Output, {
      expectedConcepts: question.expectedConcepts,
      questionType: question.category,
      isFollowUp: Boolean(question.followUpStrategy && question.followUpStrategy.length > 0)
    });

    question.evaluation = {
      answerStatus: stage1Output.answerStatus || (isNonAnswer ? "NO_ANSWER" : "CORRECT_ANSWER"),
      correctnessScore: deterministicResult.analysis.technicalAccuracy,
      relevance: deterministicResult.analysis.technicalAccuracy !== null && deterministicResult.analysis.technicalAccuracy > 60 ? "High" : deterministicResult.analysis.technicalAccuracy > 30 ? "Medium" : "Low",
      correctness: deterministicResult.analysis.technicalAccuracy !== null && deterministicResult.analysis.technicalAccuracy > 60 ? "High" : deterministicResult.analysis.technicalAccuracy > 30 ? "Medium" : "Low",
      depth: deterministicResult.analysis.depth !== null && deterministicResult.analysis.depth > 60 ? "High" : deterministicResult.analysis.depth > 30 ? "Medium" : "Low",
      specificity: deterministicResult.analysis.technicalAccuracy !== null && deterministicResult.analysis.technicalAccuracy > 60 ? "High" : "Low",
      structure: deterministicResult.analysis.communication !== null && deterministicResult.analysis.communication > 60 ? "High" : "Low",
      evidenceCollected: stage1Output.evidenceCollected || [],
      strengths: deterministicResult.feedback.strengths,
      weaknesses: deterministicResult.feedback.weaknesses,
      missingConcepts: deterministicResult.feedback.missingConcepts
    };
    question.confidence = deterministicResult.confidence;
    question.idealAnswer = deterministicResult.idealAnswer || question.idealAnswer;
    question.analysisSource = stage1Output.analysisSource || (isNonAnswer ? "deterministic_non_answer" : "ai");
    question.analysisFallbackReason = stage1Output.fallbackReason || "";
    question.analysis = deterministicResult.analysis;
    question.feedback = deterministicResult.feedback;

    await question.save();

    // 7. Update Session State Machine
    try {
      const sess = question.sessionId;
      if (sess && sess.save) {
        const status = question.evaluation?.answerStatus;
        const correctness = question.evaluation?.correctness;
        if (status === "NO_ANSWER" || correctness === "Low") {
          sess.lastAnswerQuality = status === "NO_ANSWER" ? "no_answer" : "weak";
        } else if (status === "PARTIAL_ANSWER" || correctness === "Medium") {
          sess.lastAnswerQuality = "partial";
        } else {
          sess.lastAnswerQuality = "strong";
        }
        await sess.save();
      }
    } catch (sErr) {
      console.warn("[Interview] Failed to update session answer quality:", sErr.message);
    }

    if (question.analysisSource === "ai") {
      await incrementAiUsage(req.user._id, "mock_evaluation");
    }

    let interviewerReaction = null;
    try {
      interviewerReaction = await generateInterviewerReaction({
        questionText: question.questionText,
        transcript,
        evaluation: question.evaluation
      });
    } catch (reactionErr) {
      const { correctness } = question.evaluation;
      if (correctness === 'High') {
        interviewerReaction = { reaction: "Good explanation. Let me ask a follow-up on that.", tone: "affirming" };
      } else if (correctness === 'Low') {
        interviewerReaction = { reaction: "I see your approach. Let's look at another aspect.", tone: "probing" };
      } else {
        interviewerReaction = { reaction: "Okay. Let's build on that concept.", tone: "neutral" };
      }
    }

    // 8. Update Skill Evidence
    try {
      if (question.evaluation.correctness === "Medium" || question.evaluation.correctness === "High") {
        const { UserSkill } = await import("../models/UserSkill.js");
        const { normalizeSkill } = await import("../services/career/taxonomyService.js");
        const normalizedCategory = normalizeSkill(question.category);
        if (normalizedCategory && normalizedCategory.isKnown) {
          const existingSkill = await UserSkill.findOne({ userId: req.user._id, canonicalName: normalizedCategory.canonicalName });
          const newEvidence = {
            description: `Answered interview question on ${question.category} with ${question.evaluation.correctness} correctness`,
            source: "interview",
            date: new Date(),
            weight: question.evaluation.correctness === "High" ? 1.5 : 1
          };
          if (existingSkill) {
            existingSkill.evidence.push(newEvidence);
            existingSkill.confidence = Math.min(100, existingSkill.confidence + (question.evaluation.correctness === "High" ? 10 : 5));
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
        interviewerReaction
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

    let challenge = await InterviewChallenge.findById(questionId).populate("interviewSessionId");
    if (!challenge) {
      challenge = await InterviewChallenge.findOne({ _id: questionId });
    }

    if (!challenge) {
      throw new AppError("Challenge not found", 404);
    }

    const sessionUserId = challenge.interviewSessionId?.userId
      ? challenge.interviewSessionId.userId.toString()
      : challenge.interviewSessionId?.toString();

    if (sessionUserId && sessionUserId !== req.user._id.toString()) {
      throw new AppError("Unauthorized access to this challenge", 403);
    }

    const rawLang = String(language || challenge.language || "javascript").toLowerCase();
    const cleanLanguage = rawLang === "js" ? "javascript" : rawLang === "py" ? "python" : rawLang;

    const executionContract = {
      mode: challenge.execution?.mode || "FUNCTION",
      functionName: challenge.execution?.functionName || challenge.functionName || "solution",
      parameters: challenge.execution?.parameters || challenge.parameters || [],
      returnType: challenge.execution?.returnType || challenge.returnType || "AUTO"
    };

    // Only run public test cases (hidden: false) during Run
    const publicTestCases = (challenge.testCases || []).filter(tc => !tc.hidden);

    const executionResult = await executeCode({
      language: cleanLanguage,
      code: code || "",
      testCases: publicTestCases.length > 0 ? publicTestCases : challenge.testCases || [],
      executionContract
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
    console.error("[Interview] runCode error:", error);
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

    let challenge = await InterviewChallenge.findById(questionId).populate("interviewSessionId");
    if (!challenge) {
      challenge = await InterviewChallenge.findOne({ _id: questionId });
    }

    if (!challenge) {
      throw new AppError("Challenge not found", 404);
    }

    const sessionUserId = challenge.interviewSessionId?.userId
      ? challenge.interviewSessionId.userId.toString()
      : challenge.interviewSessionId?.toString();

    if (sessionUserId && sessionUserId !== req.user._id.toString()) {
      throw new AppError("Unauthorized access to this challenge", 403);
    }

    const rawLang = String(language || challenge.language || "javascript").toLowerCase();
    const cleanLanguage = rawLang === "js" ? "javascript" : rawLang === "py" ? "python" : rawLang;

    const executionContract = {
      mode: challenge.execution?.mode || "FUNCTION",
      functionName: challenge.execution?.functionName || challenge.functionName || "solution",
      parameters: challenge.execution?.parameters || challenge.parameters || [],
      returnType: challenge.execution?.returnType || challenge.returnType || "AUTO"
    };

    // Execute against ALL test cases (including hidden)
    const executionResult = await executeCode({
      language: cleanLanguage,
      code: code || "",
      testCases: challenge.testCases || [],
      executionContract
    });

    const totalTests = challenge.testCases?.length || 0;
    const passedTests = executionResult?.passedTests || 0;

    // AI Code Review
    let aiReview = null;
    let aiReviewSummary = "Not available.";
    try {
      const reviewResult = await evaluateCodingChallenge({
        questionTitle: challenge.question,
        questionDescription: challenge.description || challenge.question,
        language: cleanLanguage,
        code: code || "",
        testResults: `Passed ${passedTests} of ${totalTests} test cases.`
      });
      aiReview = reviewResult;
      aiReviewSummary = [
        reviewResult?.timeComplexity ? `Time: ${reviewResult.timeComplexity}` : "",
        reviewResult?.spaceComplexity ? `Space: ${reviewResult.spaceComplexity}` : "",
        reviewResult?.strengths?.length ? `Strengths: ${reviewResult.strengths.join(", ")}` : "",
        reviewResult?.potentialIssues?.length ? `Issues: ${reviewResult.potentialIssues.join(", ")}` : ""
      ].filter(Boolean).join(". ");
    } catch (aiError) {
      console.warn("[Interview] AI code review failed:", aiError.message);
    }

    // Generate conversational follow-up for the next question
    let codingFollowUp = null;
    try {
      codingFollowUp = await generateCodingFollowUp({
        questionTitle: challenge.question,
        language: cleanLanguage,
        code: code || "",
        passedTests,
        totalTests,
        aiReviewSummary
      });
    } catch (cfErr) {
      console.warn("[Interview] Coding follow-up generation failed:", cfErr.message);
      codingFollowUp = {
        comment: `Your solution passed ${passedTests} of ${totalTests} test cases.`,
        followUpQuestion: "Can you walk me through your approach and any trade-offs you considered?"
      };
    }

    // Mark challenge as answered and store results safely
    challenge.status = "answered";
    challenge.executionSummary = {
      passedTests,
      totalTests
    };
    if (aiReview) {
      challenge.aiReview = {
        metrics: {
          correctness: typeof aiReview.metrics?.correctness === 'number' ? aiReview.metrics.correctness : (passedTests === totalTests ? 100 : 50),
          efficiency: typeof aiReview.metrics?.efficiency === 'number' ? aiReview.metrics.efficiency : 70,
          codeQuality: typeof aiReview.metrics?.codeQuality === 'number' ? aiReview.metrics.codeQuality : 70,
          edgeCases: typeof aiReview.metrics?.edgeCases === 'number' ? aiReview.metrics.edgeCases : 70
        },
        timeComplexity: String(aiReview.timeComplexity || ""),
        spaceComplexity: String(aiReview.spaceComplexity || ""),
        strengths: Array.isArray(aiReview.strengths) ? aiReview.strengths : [],
        potentialIssues: Array.isArray(aiReview.potentialIssues) ? aiReview.potentialIssues : [],
        optimizationOpportunities: Array.isArray(aiReview.optimizationOpportunities) ? aiReview.optimizationOpportunities : [],
        followUpComment: String(codingFollowUp?.comment || "")
      };
    }

    // Safely normalize difficulty enum value before saving to prevent Mongoose enum ValidationError
    if (challenge.difficulty) {
      const lowerDiff = String(challenge.difficulty).toLowerCase();
      challenge.difficulty = ["easy", "medium", "hard"].includes(lowerDiff) ? lowerDiff : "medium";
    }

    await challenge.save();

    // Advance session interviewState to CODING_REVIEW
    try {
      const parentSessionId = challenge.interviewSessionId?._id || challenge.interviewSessionId;
      if (parentSessionId) {
        await InterviewSession.findByIdAndUpdate(parentSessionId, { interviewState: "CODING_REVIEW" });
      }
    } catch (sessErr) {
      console.warn("[Interview] Failed to update session state to CODING_REVIEW:", sessErr.message);
    }

    console.log(`[Interview State] Coding challenge ${challenge._id} ANSWERED | passed=${passedTests}/${totalTests}`);

    res.status(200).json({
      success: true,
      data: {
        passedTests,
        totalTests,
        results: executionResult?.results || [],
        aiReview,
        codingFollowUp
      }
    });
  } catch (error) {
    console.error("[Interview] submitCodingAnswer error:", error);
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
    const challenges = await InterviewChallenge.find({ interviewSessionId: sessionId, status: "answered" }).sort({ createdAt: 1 });

    if (questions.length > 0 || challenges.length > 0) {
      try {
        const report = await generateCoachingReport({ targetRole: session.targetRole, questions });
        session.finalReport = report;
      } catch (err) {
        console.error("Failed to generate final report", err);
      }
    }

    // Compute finite numeric session scores
    const { overallScore, scores } = calculateSessionScores(session, questions, challenges);
    session.overallScore = overallScore;
    session.scores = scores;

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

    const rawQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 }).lean();
    const challenges = await InterviewChallenge.find({ interviewSessionId: sessionId }).sort({ createdAt: 1 }).lean();

    const questions = rawQuestions.map(normalizeQuestionEvaluation);

    // Compute scores on the fly if missing or zero
    if (!session.overallScore || session.overallScore === 0) {
      const computed = calculateSessionScores(session, questions, challenges);
      session.overallScore = computed.overallScore;
      session.scores = computed.scores;
      await InterviewSession.updateOne({ _id: session._id }, { overallScore: session.overallScore, scores: session.scores });
    }

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

// ──────────────────────────────────────────────────────────────────────────────
// 10. Get History & Progression Analytics (/interview-history)
// ──────────────────────────────────────────────────────────────────────────────

export async function getHistory(req, res, next) {
  try {
    const { role, type, status, search } = req.query;
    const filter = { userId: req.user._id };

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.interviewType = type;
    }
    if (role) {
      filter.targetRole = { $regex: role, $options: "i" };
    }
    if (search) {
      filter.$or = [
        { targetRole: { $regex: search, $options: "i" } },
        { technologyStack: { $elemMatch: { $regex: search, $options: "i" } } }
      ];
    }

    const sessions = await InterviewSession.find(filter).sort({ createdAt: -1 }).lean();

    const { calculateCandidateProgression } = await import("../services/interview/interviewAnalyticsService.js");
    const progression = await calculateCandidateProgression(req.user._id, { role });

    res.status(200).json({
      success: true,
      data: {
        sessions,
        progression
      }
    });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 11. Get Interview Replay (/interview-replay/:sessionId)
// ──────────────────────────────────────────────────────────────────────────────

export async function getReplay(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id }).lean();

    if (!session) {
      throw new AppError("Interview session not found", 404);
    }

    const rawQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 }).lean();
    const challenges = await InterviewChallenge.find({ interviewSessionId: sessionId }).sort({ createdAt: 1 }).lean();

    const normalizedQuestions = rawQuestions.map(normalizeQuestionEvaluation);

    // Merge verbal questions and coding challenges into single chronological timeline
    const timeline = [];

    normalizedQuestions.forEach((q, idx) => {
      timeline.push({
        id: q._id,
        createdAt: q.createdAt,
        type: "VERBAL",
        questionType: q.questionType,
        category: q.category,
        technology: q.technology,
        concept: q.concept,
        difficulty: q.difficulty,
        questionText: q.questionText,
        expectedConcepts: q.expectedConcepts || [],
        userAnswer: {
          transcript: q.transcript || "",
          userAudioUrl: q.userAnswerAudioUrl || null,
        },
        evaluation: {
          technicalAccuracy: q.analysis?.technicalAccuracy ?? null,
          communication: q.analysis?.communication ?? null,
          correctness: q.analysis?.scoreBand || q.evaluation?.correctness || "N/A",
          relevance: q.evaluation?.relevance || "N/A",
          strengths: q.feedback?.strengths || q.evaluation?.strengths || [],
          weaknesses: q.feedback?.weaknesses || q.evaluation?.weaknesses || [],
          missingConcepts: q.feedback?.missingConcepts || q.evaluation?.missingConcepts || [],
          idealAnswer: q.idealAnswer || { text: "N/A", explanation: "" },
        },
        deliverySignals: q.deliverySignals || { unavailable: true },
        presenceSignals: q.presenceSignals || { unavailable: true }
      });
    });

    challenges.forEach((c) => {
      timeline.push({
        id: c._id,
        createdAt: c.createdAt,
        type: "CODING",
        category: "Coding",
        difficulty: c.difficulty || "medium",
        questionText: c.question || "Coding Challenge",
        description: c.description || c.question,
        userAnswer: {
          code: c.userCode || "",
          language: c.language || "javascript",
        },
        executionSummary: c.executionSummary || { passedTests: 0, totalTests: 0 },
        codeReview: c.aiReview || {
          metrics: { correctness: null, efficiency: null, codeQuality: null },
          timeComplexity: "N/A",
          spaceComplexity: "N/A",
          strengths: c.executionSummary?.passedTests > 0 ? [`Passed ${c.executionSummary.passedTests} test case(s)`] : [],
          potentialIssues: []
        }
      });
    });

    timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json({
      success: true,
      data: {
        session,
        timeline,
        turnsCount: timeline.length
      }
    });
  } catch (error) {
    next(error);
  }
}
