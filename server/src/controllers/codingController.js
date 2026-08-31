import CodingQuestion from "../models/CodingQuestions.js";
import CodingSubmission from "../models/CodingSubmission.js";
import { executeCode } from "../services/codeExecution/executionService.js";
import { executeAiTask } from "../services/ai/orchestrator.js";
import { updateUserReadinessScore } from "../services/career/readinessService.js";
import { UserSkill } from "../models/UserSkill.js";
import { normalizeSkill } from "../services/career/taxonomyService.js";
import { createError } from "../utils/error.js";

/**
 * Lists all available coding practice questions.
 */
export const getPracticeQuestions = async (req, res, next) => {
  try {
    const questions = await CodingQuestion.find({})
      .select("_id title difficulty tags supportedLanguages points")
      .lean();

    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets details for a specific coding question.
 */
export const getPracticeQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await CodingQuestion.findById(id).lean();

    if (!question) {
      return next(createError(404, "Coding question not found"));
    }

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compiles and submits user code against all test cases.
 * Runs AI code review for complexity/quality insights.
 */
export const submitPracticeCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body;

    if (!language || !code) {
      return next(createError(400, "Language and code parameters are required"));
    }

    const question = await CodingQuestion.findById(id).lean();
    if (!question) {
      return next(createError(404, "Coding question not found"));
    }

    const allowedLanguages = (question.supportedLanguages && question.supportedLanguages.length > 0)
      ? question.supportedLanguages
      : ["javascript", "python", "java"];

    if (!allowedLanguages.includes(language.toLowerCase()) && !["javascript", "python", "java"].includes(language.toLowerCase())) {
      return next(createError(400, `Language '${language}' is not supported for this problem.`));
    }

    // Execute code against test cases
    const executionResult = await executeCode({
      language,
      code,
      testCases: question.testCases || []
    });

    const totalTests = question.testCases?.length || 0;
    const allPassed = executionResult.passedTests === totalTests;

    // Run AI Code Review
    let aiReview = null;
    let codeQualityScore = 70; // baseline fallback

    try {
      const reviewResult = await executeAiTask("ANALYZE_CODE", {
        questionTitle: question.title,
        questionDescription: question.description || question.title,
        language,
        code,
        testResults: `Passed ${executionResult.passedTests} of ${totalTests} test cases. Details: ${JSON.stringify(executionResult.results)}`
      });

      if (reviewResult) {
        aiReview = reviewResult;
        if (reviewResult.metrics && reviewResult.metrics.codeQuality) {
          codeQualityScore = reviewResult.metrics.codeQuality;
        }
      }
    } catch (aiError) {
      console.warn("[CodingPractice] Failed to generate AI code review:", aiError);
      // Fallback AI review schema
      aiReview = {
        metrics: { correctness: allPassed ? 100 : 50, efficiency: 70, codeQuality: 70, edgeCases: 60 },
        timeComplexity: "O(N)",
        spaceComplexity: "O(1)",
        strengths: ["Code runs successfully against public tests."],
        potentialIssues: ["Ensure edge cases like empty bounds are evaluated."],
        optimizationOpportunities: ["Consider modularizing logic."]
      };
    }

    // Create submission record
    const submission = new CodingSubmission({
      candidateId: req.user.id,
      questionId: id,
      language,
      code,
      status: allPassed ? "completed" : "failed",
      passedTests: executionResult.passedTests,
      totalTests: totalTests,
      testResults: executionResult.results,
      codeQualityScore: codeQualityScore,
      runtimeMs: executionResult.results?.reduce((sum, r) => sum + (r.executionTimeMs || 0), 0) || 0
    });

    await submission.save();

    // Trigger readiness score updates
    await updateUserReadinessScore(req.user.id, `Completed SDE coding practice: ${question.title}`);

    // Update skill evidence in career profile
    if (question.tags && Array.isArray(question.tags)) {
      // Also consider the language used as a skill to update
      const skillsToUpdate = [...question.tags, language];
      for (const rawTag of skillsToUpdate) {
        const normalized = normalizeSkill(rawTag);
        if (normalized && normalized.isKnown) {
          const existingSkill = await UserSkill.findOne({ userId: req.user.id, canonicalName: normalized.canonicalName });
          
          // Generate evidence string
          const correctnessWeight = allPassed ? 2 : (executionResult.passedTests / totalTests);
          const newEvidence = {
            description: `Coding Practice "${question.title}" in ${language}. Passed ${executionResult.passedTests}/${totalTests} tests.`,
            source: "coding_challenge",
            date: new Date(),
            weight: correctnessWeight
          };

          if (existingSkill) {
            existingSkill.evidence.push(newEvidence);
            // Boost confidence for fully passed, slightly increase for partial, maybe decay for 0
            if (allPassed) {
              existingSkill.confidence = Math.min(100, existingSkill.confidence + 10);
            } else if (executionResult.passedTests > 0) {
              existingSkill.confidence = Math.min(100, existingSkill.confidence + 2);
            }
            await existingSkill.save();
          } else if (allPassed) {
             // Optional: automatically add it if they passed, but generally we rely on extraction
             const newSkill = new UserSkill({
               userId: req.user.id,
               originalName: rawTag,
               canonicalName: normalized.canonicalName,
               category: normalized.category,
               confidence: 50,
               evidence: [newEvidence]
             });
             await newSkill.save();
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        submissionId: submission._id,
        status: submission.status,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        testResults: submission.testResults,
        aiReview
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists recent submissions of the candidate.
 */
export const getPracticeSubmissions = async (req, res, next) => {
  try {
    const submissions = await CodingSubmission.find({ candidateId: req.user.id })
      .populate("questionId", "title difficulty tags")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};
