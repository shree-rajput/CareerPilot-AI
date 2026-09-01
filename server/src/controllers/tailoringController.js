// import { env } from "../config/env.js";
// import { Application } from "../models/Application.js";
// import { MatchResult } from "../models/MatchResult.js";
// import { Resume } from "../models/Resume.js";
// import { generateTailoringRecommendations } from "../services/ai/aiService.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
// import { AppError } from "../utils/errors.js";

// /**
//  * POST /api/tailor
//  * Body: { applicationId, resumeId }
//  */
// export const tailorResume = asyncHandler(async (req, res) => {
//   const { applicationId, resumeId } = req.body;

//   if (!applicationId || !resumeId) {
//     throw new AppError("applicationId and resumeId are required.", 400, "VALIDATION_ERROR");
//   }

//   // Fetch data
//   const [application, resume, matchResult] = await Promise.all([
//     Application.findOne({ _id: applicationId, userId: req.user._id }).lean(),
//     Resume.findOne({ _id: resumeId, userId: req.user._id }).lean(),
//     MatchResult.findOne({ applicationId, resumeId, userId: req.user._id }).lean()
//   ]);

//   if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
//   if (!resume) throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");

//   // We don't strictly require a match result, but it helps the AI target gaps
//   const missingSkills = matchResult?.missingSkills || [];
//   const matchedSkills = matchResult?.matchedSkills || [];

//   // Check AI usage limit
//   const { allowed, used, limit } = await checkAiLimit(
//     req.user._id,
//     "tailoring",
//     env.aiLimitTailoring
//   );

//   if (!allowed) {
//     throw new AppError(
//       `Daily tailoring limit reached (${used}/${limit}). Try again tomorrow.`,
//       429,
//       "AI_DAILY_LIMIT"
//     );
//   }

//   // Call AI
//   const recommendations = await generateTailoringRecommendations({
//     resumeText: resume.rawText,
//     jdText: application.jobDescription,
//     missingSkills,
//     matchedSkills,
//     role: application.role,
//     company: application.company
//   });

//   await incrementAiUsage(req.user._id, "tailoring");

//   return res.json({ recommendations });
// });

import { env } from "../config/env.js";
import { Application } from "../models/Application.js";
import { MatchResult } from "../models/MatchResult.js";
import { Resume } from "../models/Resume.js";
import { generateTailoringRecommendations } from "../services/ai/aiService.js";
import { resumeTailoringService } from "../services/resume/resumeTailoringService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";
import { atsOptimizationService } from "../services/resume/atsOptimizationService.js";
/**
 * POST /api/tailor
 * Body: { applicationId, resumeId }
 */
export const tailorResume = asyncHandler(async (req, res) => {
  const { applicationId, resumeId } = req.body;

  if (!applicationId || !resumeId) {
    throw new AppError(
      "applicationId and resumeId are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const [application, resume, matchResult] = await Promise.all([
    Application.findOne({
      _id: applicationId,
      userId: req.user._id,
    }).lean(),

    Resume.findOne({
      _id: resumeId,
      userId: req.user._id,
    }).lean(),

    MatchResult.findOne({
      applicationId,
      resumeId,
      userId: req.user._id,
    }).lean(),
  ]);

  if (!application) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  if (!matchResult) {
    throw new AppError(
      "Match result not found. Run resume matching first.",
      404,
      "MATCH_RESULT_NOT_FOUND",
    );
  }

  /***
   * Buld and check the resume ats score
   */
  const atsAnalysis = atsOptimizationService.calculateScore({
    resume,
    application,
    matchResult,
  });
  /**
   * Build deterministic tailoring analysis.
   */
  const tailoringAnalysis = resumeTailoringService.tailorResume({
    resume,
    application,
    matchResult,
  });

  /**
   * Check AI usage limit.
   */
  const { allowed, used, limit } = await checkAiLimit(
    req.user._id,
    "tailoring",
    env.aiLimitTailoring,
  );

  if (!allowed) {
    throw new AppError(
      `Daily tailoring limit reached (${used}/${limit}). Try again tomorrow.`,
      429,
      "AI_DAILY_LIMIT",
    );
  }

  /**
   * AI is used only for wording/explanation.
   * It does NOT calculate matching scores.
   */
  const recommendations = await generateTailoringRecommendations({
    resumeText: resume.rawText,
    jdText: application.jobDescription,

    missingSkills: matchResult.missingSkills || [],

    matchedSkills: matchResult.matchedSkills || [],

    partialSkills: matchResult.partialSkills || [],

    evidence: matchResult.evidence || [],

    role: application.role,
    company: application.company,

    tailoringAnalysis,
  });

  await incrementAiUsage(req.user._id, "tailoring");

  return res.json({
    success: true,

    data: {
      ats: atsAnalysis,

      match: {
        overallScore: matchResult.overallScore,
        categoryScores: matchResult.categoryScores,

        matchedSkills: matchResult.matchedSkills,

        partialSkills: matchResult.partialSkills,

        missingSkills: matchResult.missingSkills,
      },

      tailoring: {
        analysis: tailoringAnalysis,
        recommendations,
      },
    },
  });
});

/**
 * POST /api/tailor/save-version
 * Creates a new Resume version based on accepted tailoring recommendations without overwriting original.
 */
export const saveTailoredVersion = asyncHandler(async (req, res) => {
  const { resumeId, applicationId, versionName, acceptedChanges } = req.body;

  if (!resumeId) throw new AppError("resumeId is required.", 400, "VALIDATION_ERROR");

  const originalResume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
  if (!originalResume) throw new AppError("Original resume not found.", 404, "RESUME_NOT_FOUND");

  let application = null;
  if (applicationId) {
    application = await Application.findOne({ _id: applicationId, userId: req.user._id });
  }

  // Count existing versions for this user
  const existingCount = await Resume.countDocuments({ userId: req.user._id });
  const nextVersionNum = existingCount + 1;

  const targetCompany = application?.company ? ` - ${application.company}` : "";
  const targetRole = application?.role ? ` (${application.role})` : "";
  const defaultVersionName = versionName || `${originalResume.name} v${nextVersionNum}${targetRole}${targetCompany}`;

  // Clone structured data and raw text
  let structuredData = JSON.parse(JSON.stringify(originalResume.structuredData || {}));
  let rawText = originalResume.rawText || "";

  // Apply accepted rephrasing to summary / bullet points if provided
  if (Array.isArray(acceptedChanges)) {
    for (const change of acceptedChanges) {
      if (!change.original || !change.suggestion) continue;
      // Perform text replacement in raw text
      if (rawText.includes(change.original)) {
        rawText = rawText.replace(change.original, change.suggestion);
      }
      // Apply to structured summary if applicable
      if (change.section === "summary" && structuredData.summary) {
        if (structuredData.summary.includes(change.original)) {
          structuredData.summary = structuredData.summary.replace(change.original, change.suggestion);
        }
      }
    }
  }

  const newVersion = await Resume.create({
    userId: req.user._id,
    name: defaultVersionName,
    version: nextVersionNum,
    rawText,
    structuredData,
    atsScore: originalResume.atsScore || 75,
    contentScore: originalResume.contentScore || 80,
    isActive: true,
    fileKey: originalResume.fileKey || "",
    originalFilename: originalResume.originalFilename || "tailored_resume.pdf"
  });

  // Link new version to application if provided
  if (application) {
    application.resumeVersionId = newVersion._id;
    await application.save();
  }

  return res.status(201).json({
    message: "Tailored resume version saved successfully.",
    resume: newVersion
  });
});

