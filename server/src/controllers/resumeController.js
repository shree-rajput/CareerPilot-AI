import { env } from "../config/env.js";
import { Resume } from "../models/Resume.js";
import { structureResume } from "../services/ai/aiService.js";
import { compareResumeVersions } from "../services/resume/diffService.js";
import { extractPdfText, extractTxtText } from "../services/resume/pdfParser.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";

/**
 * POST /api/resume/upload
 * Accepts multipart/form-data with a `resume` file field.
 */
export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file uploaded. Please attach a PDF or TXT file.", 400, "NO_FILE");
  }

  const { mimetype, originalname, buffer, size } = req.file;
  const maxBytes = env.maxFileSizeMb * 1024 * 1024;

  if (size > maxBytes) {
    throw new AppError(
      `File too large. Maximum allowed size is ${env.maxFileSizeMb} MB.`,
      413,
      "FILE_TOO_LARGE"
    );
  }

  const isPdf = mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf");
  const isTxt = mimetype === "text/plain" || originalname.toLowerCase().endsWith(".txt");

  if (!isPdf && !isTxt) {
    throw new AppError("Only PDF and TXT files are accepted.", 415, "UNSUPPORTED_FILE_TYPE");
  }

  // Check AI usage limit
  const { allowed, used, limit } = await checkAiLimit(
    req.user._id,
    "resume_analysis",
    env.aiLimitResumeAnalysis
  );

  if (!allowed) {
    throw new AppError(
      `Daily resume analysis limit reached (${used}/${limit}). Try again tomorrow.`,
      429,
      "AI_DAILY_LIMIT"
    );
  }

  // Extract raw text
  let rawText;
  try {
    rawText = isPdf
      ? await extractPdfText(buffer)
      : extractTxtText(buffer);
  } catch (err) {
    throw err; // Already an AppError from pdfParser
  }

  // Structure with AI
  let structuredData = null;
  try {
    structuredData = await structureResume(rawText);
    await incrementAiUsage(req.user._id, "resume_analysis");
  } catch (err) {
    // AI failure is non-fatal — save with null structuredData, user can retry
    console.error("Resume structuring AI error:", err.message);
  }

  // Build name from filename
  const baseName = originalname.replace(/\.(pdf|txt)$/i, "").replace(/[-_]/g, " ");
  const label = req.body.label?.trim() || "";
  const parentVersionId = req.body.parentVersionId || null;

  // Determine version number
  let version = 1;
  if (parentVersionId) {
    const parent = await Resume.findOne({ _id: parentVersionId, userId: req.user._id });
    if (parent) version = parent.version + 1;
  }

  const resume = await Resume.create({
    userId: req.user._id,
    name: baseName || "My Resume",
    label,
    originalFilename: originalname,
    fileType: isPdf ? "pdf" : "txt",
    rawText,
    structuredData,
    version,
    parentVersionId: parentVersionId || null
  });

  return res.status(201).json({
    message: structuredData
      ? "Resume uploaded and structured successfully."
      : "Resume uploaded. AI structuring failed — you can retry analysis.",
    resume: {
      _id: resume._id,
      name: resume.name,
      label: resume.label,
      fileType: resume.fileType,
      version: resume.version,
      hasStructuredData: Boolean(structuredData),
      createdAt: resume.createdAt
    }
  });
});

/**
 * GET /api/resume
 * List all active resumes for the authenticated user.
 */
export const getResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ userId: req.user._id, isActive: true })
    .sort({ createdAt: -1 })
    .select("-rawText -structuredData")
    .lean();

  return res.json({ resumes });
});

/**
 * GET /api/resume/:id
 * Get full resume detail including structured data.
 */
export const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id }).lean();

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  return res.json({ resume });
});

/**
 * DELETE /api/resume/:id
 * Soft-delete a resume.
 */
export const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  resume.isActive = false;
  await resume.save();

  return res.json({ message: "Resume deleted." });
});

/**
 * GET /api/resume/diff?v1=:id&v2=:id
 * Compare two resume versions.
 */
export const diffResumeVersions = asyncHandler(async (req, res) => {
  const { v1, v2 } = req.query;

  if (!v1 || !v2) {
    throw new AppError("Both v1 and v2 query parameters are required.", 400, "MISSING_PARAMS");
  }

  const [resumeA, resumeB] = await Promise.all([
    Resume.findOne({ _id: v1, userId: req.user._id }).select("rawText name version label").lean(),
    Resume.findOne({ _id: v2, userId: req.user._id }).select("rawText name version label").lean()
  ]);

  if (!resumeA || !resumeB) {
    throw new AppError("One or both resume versions not found.", 404, "RESUME_NOT_FOUND");
  }

  const diff = compareResumeVersions(resumeA.rawText, resumeB.rawText);

  return res.json({
    versionA: { _id: resumeA._id, name: resumeA.name, version: resumeA.version, label: resumeA.label },
    versionB: { _id: resumeB._id, name: resumeB.name, version: resumeB.version, label: resumeB.label },
    diff
  });
});
