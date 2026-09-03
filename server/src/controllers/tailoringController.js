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
  const { resumeId, applicationId, companyName, jobTitle, targetJobId, versionName, acceptedChanges } = req.body;

  if (!resumeId) throw new AppError("resumeId is required.", 400, "VALIDATION_ERROR");

  const originalResume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
  if (!originalResume) throw new AppError("Original resume not found.", 404, "RESUME_NOT_FOUND");

  const rootId = originalResume.versionTreeRootId || originalResume._id;

  // Calculate next version in lineage chain
  const highestVersionResume = await Resume.findOne({
    userId: req.user._id,
    $or: [{ _id: rootId }, { versionTreeRootId: rootId }, { parentVersionId: rootId }],
  }).sort({ version: -1 });

  const nextVersionNum = highestVersionResume ? highestVersionResume.version + 1 : originalResume.version + 1;

  let application = null;
  if (applicationId) {
    application = await Application.findOne({ _id: applicationId, userId: req.user._id });
  }

  const targetCompanyStr = companyName || application?.company || "";
  const targetRoleStr = jobTitle || application?.position || application?.role || "";

  const defaultVersionName =
    versionName ||
    `${originalResume.name} (Tailored v${nextVersionNum}${targetRoleStr ? ` - ${targetRoleStr}` : ""})`;

  // Clone structured data and raw text
  let structuredData = JSON.parse(JSON.stringify(originalResume.structuredData || {}));
  let rawText = originalResume.rawText || "";

  if (Array.isArray(acceptedChanges)) {
    for (const change of acceptedChanges) {
      if (!change.original || !change.suggestion) continue;
      if (rawText.includes(change.original)) {
        rawText = rawText.replace(change.original, change.suggestion);
      }
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
    parentVersionId: originalResume._id,
    versionTreeRootId: rootId,
    createdFrom: "tailor",
    templateId: originalResume.templateId || "classic",
    rawText,
    structuredData,
    isActive: true,
    fileKey: originalResume.fileKey || "",
    originalFilename: originalResume.originalFilename || "tailored_resume.pdf",
    auditTrail: [
      {
        action: "created_via_tailoring",
        performedBy: req.user._id,
        details: `Tailored version created from parent version ${originalResume.version}`,
        timestamp: new Date(),
      },
    ],
  });

  // Link to existing application or auto-create draft application if company/role passed
  if (application) {
    application.resumeVersionId = newVersion._id;
    if (application.auditTrail) {
      application.auditTrail.push({
        action: "linked_tailored_resume",
        performedBy: req.user._id,
        details: `Linked tailored resume version ${newVersion.version}`,
        timestamp: new Date(),
      });
    }
    await application.save();
  } else if (targetCompanyStr || targetRoleStr || targetJobId) {
    application = await Application.create({
      userId: req.user._id,
      company: targetCompanyStr || "Target Company",
      position: targetRoleStr || "Target Position",
      status: "draft",
      resumeVersionId: newVersion._id,
      jobId: targetJobId || null,
      source: "tailor_flow",
      auditTrail: [
        {
          action: "auto_created_from_tailor",
          performedBy: req.user._id,
          details: "Draft application auto-created from resume tailoring flow",
          timestamp: new Date(),
        },
      ],
    });
  }

  return res.status(201).json({
    message: "Tailored resume version saved successfully.",
    resume: newVersion,
    application: application || null,
  });
});

