import { env } from "../config/env.js";
import { Application } from "../models/Application.js";
import { MatchResult } from "../models/MatchResult.js";
import { Resume } from "../models/Resume.js";
import { generateTailoringRecommendations } from "../services/ai/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";

/**
 * POST /api/tailor
 * Body: { applicationId, resumeId }
 */
export const tailorResume = asyncHandler(async (req, res) => {
  const { applicationId, resumeId } = req.body;

  if (!applicationId || !resumeId) {
    throw new AppError("applicationId and resumeId are required.", 400, "VALIDATION_ERROR");
  }

  // Fetch data
  const [application, resume, matchResult] = await Promise.all([
    Application.findOne({ _id: applicationId, userId: req.user._id }).lean(),
    Resume.findOne({ _id: resumeId, userId: req.user._id }).lean(),
    MatchResult.findOne({ applicationId, resumeId, userId: req.user._id }).lean()
  ]);

  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  if (!resume) throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  
  // We don't strictly require a match result, but it helps the AI target gaps
  const missingSkills = matchResult?.missingSkills || [];
  const matchedSkills = matchResult?.matchedSkills || [];

  // Check AI usage limit
  const { allowed, used, limit } = await checkAiLimit(
    req.user._id,
    "tailoring",
    env.aiLimitTailoring
  );

  if (!allowed) {
    throw new AppError(
      `Daily tailoring limit reached (${used}/${limit}). Try again tomorrow.`,
      429,
      "AI_DAILY_LIMIT"
    );
  }

  // Call AI
  const recommendations = await generateTailoringRecommendations({
    resumeText: resume.rawText,
    jdText: application.jobDescription,
    missingSkills,
    matchedSkills,
    role: application.role,
    company: application.company
  });

  await incrementAiUsage(req.user._id, "tailoring");

  return res.json({ recommendations });
});
