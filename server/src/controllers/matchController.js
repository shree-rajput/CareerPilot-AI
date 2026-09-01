import crypto from "crypto";
import { Application } from "../models/Application.js";
import { MatchResult } from "../models/MatchResult.js";
import { Resume } from "../models/Resume.js";
import { explainMatchResult } from "../services/ai/aiService.js";
import { runMatchPipeline } from "../services/matching/matchEngine.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

function hashText(text) {
  return crypto
    .createHash("sha256")
    .update(text || "")
    .digest("hex")
    .slice(0, 16);
}

/**
 * POST /api/match
 * Body: { applicationId, resumeId }
 */
export const runMatch = asyncHandler(async (req, res) => {
  const { applicationId, resumeId } = req.body;

  if (!applicationId || !resumeId) {
    throw new AppError(
      "applicationId and resumeId are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  // Fetch application and resume, verify ownership
  const [application, resume] = await Promise.all([
    Application.findOne({ _id: applicationId, userId: req.user._id }).lean(),
    Resume.findOne({ _id: resumeId, userId: req.user._id }).lean(),
  ]);

  if (!application)
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  if (!resume) throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");

  if (!resume.structuredData) {
    throw new AppError(
      "This resume has no structured data. Please re-upload the resume so it can be processed by the AI.",
      422,
      "RESUME_NOT_STRUCTURED",
    );
  }

  if (!application.extractedJd) {
    throw new AppError(
      "This job description has not been extracted yet. Please wait for extraction or re-save the application.",
      422,
      "JD_NOT_EXTRACTED",
    );
  }

  // Cache check — if same resume + JD already matched, return cached result
  const resumeHash = hashText(JSON.stringify(resume.structuredData));

  const jdHash = hashText(JSON.stringify(application.extractedJd));

  const cached = await MatchResult.findOne({
    resumeHash,
    jdHash,
    userId: req.user._id,
  }).lean();

  if (cached) {
    // Update application to link this match result
    await Application.findByIdAndUpdate(applicationId, {
      matchResultId: cached._id,
    });
    return res.json({ matchResult: cached, cached: true });
  }

  // Run the semantic match pipeline (embedding + cosine similarity + scoring)
  const pipelineResult = await runMatchPipeline(
    resume.structuredData,
    application.extractedJd,
  );

  // Get AI explanation (non-fatal — score already calculated)
  let explanation = "";
  const { allowed } = await checkAiLimit(
    req.user._id,
    "match_explanation",
    env.aiLimitMatchExplanation,
  );

  if (allowed) {
    try {
      explanation = await explainMatchResult({
        overallScore: pipelineResult.overallScore,
        matchedSkills: pipelineResult.matchedSkills,
        partialSkills: pipelineResult.partialSkills,
        missingSkills: pipelineResult.missingSkills,
        role: application.role,
        company: application.company,
      });
      await incrementAiUsage(req.user._id, "match_explanation");
    } catch (err) {
      console.error("Match explanation AI error:", err.message);
      explanation =
        "AI explanation unavailable. Your match score is based on semantic similarity analysis.";
    }
  }

  const matchResult = await MatchResult.create({
    userId: req.user._id,
    applicationId,
    resumeId,
    resumeHash,
    jdHash,
    overallScore: pipelineResult.overallScore,
    categoryScores: pipelineResult.categoryScores,
    fitBreakdown: pipelineResult.fitBreakdown,
    matchedSkills: pipelineResult.matchedSkills,
    partialSkills: pipelineResult.partialSkills,
    missingSkills: pipelineResult.missingSkills,
    criticalGaps: pipelineResult.criticalGaps || [],
    importantGaps: pipelineResult.importantGaps || [],
    niceToHaveGaps: pipelineResult.niceToHaveGaps || [],
    actionPlan: pipelineResult.actionPlan || [],
    evidence: pipelineResult.evidence,
    explanation,
  });


  // Link to application
  await Application.findByIdAndUpdate(applicationId, {
    matchResultId: matchResult._id,
    resumeVersionId: resumeId,
  });

  return res.status(201).json({ matchResult, cached: false });
});

/**
 * GET /api/match/:id
 */
export const getMatchResult = asyncHandler(async (req, res) => {
  const matchResult = await MatchResult.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).lean();

  if (!matchResult) {
    throw new AppError("Match result not found.", 404, "MATCH_NOT_FOUND");
  }

  return res.json({ matchResult });
});
