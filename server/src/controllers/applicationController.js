import { z } from "zod";
import { env } from "../config/env.js";
import { Application } from "../models/Application.js";
import { extractJobDescription } from "../services/ai/aiService.js";
import { getApplicationIntelligence } from "../services/career/careerIntelligenceService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";

const createApplicationSchema = z.object({
  company: z.string().trim().min(1).max(150),
  role: z.string().trim().min(1).max(150),
  jobDescription: z.string().trim().min(50, "Please paste the full job description (at least 50 characters)."),
  jobUrl: z.string().trim().url().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional()
});

const updateApplicationSchema = z.object({
  status: z.enum(["saved", "applied", "oa", "interview", "offer", "rejected", "withdrawn"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  dateApplied: z.string().datetime({ offset: true }).optional().nullable(),
  interviewDate: z.string().datetime({ offset: true }).optional().nullable(),
  resumeVersionId: z.string().optional().nullable(),
  statusNote: z.string().trim().max(500).optional()
});

/**
 * POST /api/applications
 */
export const createApplication = asyncHandler(async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || "Invalid request.", 400, "VALIDATION_ERROR");
  }

  const { company, role, jobDescription, jobUrl, notes } = parsed.data;

  // Check AI limit for JD extraction
  const { allowed, used, limit } = await checkAiLimit(
    req.user._id,
    "jd_analysis",
    env.aiLimitJdAnalysis
  );

  if (!allowed) {
    throw new AppError(
      `Daily job description analysis limit reached (${used}/${limit}). Try again tomorrow.`,
      429,
      "AI_DAILY_LIMIT"
    );
  }

  // Extract JD with AI (must succeed)
  let extractedJd = null;
  try {
    extractedJd = await extractJobDescription(jobDescription);
    await incrementAiUsage(req.user._id, "jd_analysis");
  } catch (err) {
    console.error("JD extraction AI error:", err.message);
    throw new AppError(
      `Job description extraction failed: ${err.message || "Unknown AI error"}. Please try again.`,
      502,
      "JD_EXTRACTION_FAILED"
    );
  }

  const app = await Application.create({
    userId: req.user._id,
    company,
    role,
    jobDescription,
    extractedJd,
    jobUrl: jobUrl || "",
    notes: notes || "",
    statusHistory: [{ status: "saved" }]
  });

  return res.status(201).json({
    message: "Application saved.",
    application: app,
    aiExtracted: Boolean(extractedJd),
    aiLimitWarning: !allowed
      ? `JD analysis limit reached (${used}/${limit}). Requirements extraction skipped.`
      : null
  });
});

/**
 * GET /api/applications
 */
export const getApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const applications = await Application.find(filter)
    .sort({ createdAt: -1 })
    .select("-jobDescription -extractedJd.responsibilities")
    .lean();

  return res.json({ applications });
});

/**
 * GET /api/applications/:id
 */
export const getApplication = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id })
    .populate("matchResultId", "overallScore matchedSkills partialSkills missingSkills")
    .lean();

  if (!app) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  return res.json({ application: app });
});

/**
 * GET /api/applications/:id/intelligence
 */
export const getApplicationIntelligenceSummary = asyncHandler(async (req, res) => {
  const intelligence = await getApplicationIntelligence(req.user._id, req.params.id);

  if (!intelligence) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  return res.json({ intelligence });
});

/**
 * PATCH /api/applications/:id
 */
export const updateApplication = asyncHandler(async (req, res) => {
  const parsed = updateApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || "Invalid request.", 400, "VALIDATION_ERROR");
  }

  const updates = parsed.data;
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id });

  if (!app) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  // If status changed, append to history
  if (updates.status && updates.status !== app.status) {
    app.statusHistory.push({
      status: updates.status,
      changedAt: new Date(),
      note: updates.statusNote || ""
    });
    app.status = updates.status;

    // Auto-set dateApplied when moving to "applied"
    if (updates.status === "applied" && !app.dateApplied) {
      app.dateApplied = new Date();
    }
  }

  if (updates.notes !== undefined) app.notes = updates.notes;
  if (updates.dateApplied !== undefined) app.dateApplied = updates.dateApplied ? new Date(updates.dateApplied) : null;
  if (updates.interviewDate !== undefined) app.interviewDate = updates.interviewDate ? new Date(updates.interviewDate) : null;
  if (updates.resumeVersionId !== undefined) app.resumeVersionId = updates.resumeVersionId || null;

  await app.save();

  return res.json({ application: app });
});

/**
 * DELETE /api/applications/:id
 */
export const deleteApplication = asyncHandler(async (req, res) => {
  const result = await Application.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

  if (!result) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  return res.json({ message: "Application deleted." });
});
