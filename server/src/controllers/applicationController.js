import { z } from "zod";
import { env } from "../config/env.js";
import { Application } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { MatchResult } from "../models/MatchResult.js";
import { extractJobDescription } from "../services/ai/aiService.js";
import { getApplicationIntelligence } from "../services/career/careerIntelligenceService.js";
import { executeAiTask } from "../services/ai/orchestrator.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";

const createApplicationSchema = z.object({
  company: z.string().trim().min(1).max(150),
  role: z.string().trim().min(1).max(150),
  jobDescription: z.string().trim().min(50, "Please paste the full job description (at least 50 characters)."),
  jobUrl: z.string().trim().url().optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional()
});

const updateApplicationSchema = z.object({
  status: z.enum(["saved", "applied", "screening", "interview", "offer", "rejected"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(100).optional().or(z.literal("")),
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

  const { company, role, jobDescription, jobUrl, location, notes } = parsed.data;

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
    location: location || "",
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
 * POST /api/applications/external
 * Endpoint for browser extension to capture application data
 */
export const captureExternalApplication = asyncHandler(async (req, res) => {
  const parsed = createApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || "Invalid request.", 400, "VALIDATION_ERROR");
  }

  const { company, role, jobDescription, jobUrl, location, notes } = parsed.data;

  // We do NOT extract JD here to make the extension capture instant.
  // The user can trigger JD extraction later from the dashboard.
  
  const app = await Application.create({
    userId: req.user._id,
    company,
    role,
    jobDescription,
    extractedJd: null, 
    jobUrl: jobUrl || "",
    location: location || "",
    notes: notes || "",
    statusHistory: [{ status: "saved" }]
  });

  return res.status(201).json({
    message: "Application captured via extension.",
    application: app
  });
});

/**
 * GET /api/applications
 */
export const getApplications = asyncHandler(async (req, res) => {
  const { status, search, sort } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { company: { $regex: search, $options: "i" } },
      { role: { $regex: search, $options: "i" } }
    ];
  }

  let sortObj = { createdAt: -1 };
  if (sort === "dateApplied") sortObj = { dateApplied: -1 };
  if (sort === "dateAppliedAsc") sortObj = { dateApplied: 1 };
  if (sort === "oldest") sortObj = { createdAt: 1 };

  const applications = await Application.find(filter)
    .sort(sortObj)
    .select("-jobDescription -extractedJd.responsibilities")
    .populate("matchResultId", "overallScore")
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
  if (updates.location !== undefined) app.location = updates.location;
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

/**
 * POST /api/applications/:id/cover-letter
 * Generate a tailored cover letter for the application.
 */
export const generateCoverLetter = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!app) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  // Get user's resume (latest active)
  const resume = await Resume.findOne({ userId: req.user._id, isActive: true })
    .sort({ createdAt: -1 })
    .select("name rawText structuredData")
    .lean();

  const tone = req.body.tone || "professional"; // professional | enthusiastic | concise
  const highlight = req.body.highlight || "";

  const systemPrompt = `You are an expert cover letter writer. Write a compelling, personalized cover letter for a job application.

Rules:
- Never invent credentials, degrees, companies, or achievements not in the resume.
- Use specific details from the resume and JD.
- Keep it under 350 words.
- Tone: ${tone}.
- Format: 3 paragraphs (hook + match + call-to-action). No subject line. No "Dear Hiring Manager" unless explicitly requested.
- Return JSON: { coverLetter: string, wordCount: number }`;

  const prompt = `Company: ${app.company}
Role: ${app.role}
Job Description Summary: ${app.jobDescription?.slice(0, 1500) || "N/A"}
Resume Summary: ${resume?.rawText?.slice(0, 2000) || "N/A"}
${highlight ? `Candidate wants to highlight: ${highlight}` : ""}`;

  try {
    const result = await executeAiTask("COPILOT_CHAT", {
      systemOverride: systemPrompt,
      message: prompt,
      history: []
    });
    return res.json({
      status: "success",
      data: {
        coverLetter: result?.reply || result?.coverLetter || "",
        company: app.company,
        role: app.role
      }
    });
  } catch (err) {
    throw new AppError(
      `Cover letter generation failed: ${err.message}. Please try again.`,
      502,
      "COVER_LETTER_FAILED"
    );
  }
});

/**
 * POST /api/applications/:id/recruiter-message
 * Generate a short recruiter outreach or follow-up message.
 */
export const generateRecruiterMessage = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!app) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  const messageType = req.body.type || "application"; // application | followup | thankyou
  const recruiterName = req.body.recruiterName || "";

  const typeInstructions = {
    application: "Write a short, professional LinkedIn message or email introducing yourself and expressing interest in the role.",
    followup: "Write a polite follow-up message 1-2 weeks after applying, referencing the application and reaffirming interest.",
    thankyou: "Write a brief thank-you note after an interview, referencing specific topics discussed."
  };

  const systemPrompt = `You are a career coach helping candidates write effective recruiter messages.
${typeInstructions[messageType] || typeInstructions.application}
Keep it under 150 words. Be specific, not generic. Return JSON: { message: string }`;

  const prompt = `Company: ${app.company}\nRole: ${app.role}${recruiterName ? `\nRecruiter Name: ${recruiterName}` : ""}\nApplication Status: ${app.status}`;

  try {
    const result = await executeAiTask("COPILOT_CHAT", {
      systemOverride: systemPrompt,
      message: prompt,
      history: []
    });
    return res.json({
      status: "success",
      data: {
        message: result?.reply || result?.message || "",
        type: messageType
      }
    });
  } catch (err) {
    throw new AppError(`Message generation failed: ${err.message}`, 502, "MESSAGE_GENERATION_FAILED");
  }
});

/**
 * GET /api/applications/:id/readiness
 * Return application readiness breakdown (resume, match, ATS, cover letter).
 */
export const getApplicationReadiness = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.user._id })
    .populate("matchResultId", "overallScore categoryScores matchedSkills missingSkills")
    .lean();

  if (!app) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  // Get resume ATS score if a resume is linked
  let resumeScore = null;
  let resumeName = null;
  if (app.resumeVersionId) {
    const resume = await Resume.findOne({ _id: app.resumeVersionId, userId: req.user._id })
      .select("name atsScore")
      .lean();
    if (resume) {
      resumeScore = resume.atsScore;
      resumeName = resume.name;
    }
  }

  const matchScore = app.matchResultId?.overallScore ?? null;
  const atsScore = resumeScore;
  // Compute overall readiness (weighted average of what we know)
  const components = [
    { name: "Resume", score: atsScore, weight: 0.35, icon: "📄" },
    { name: "Job Match", score: matchScore, weight: 0.40, icon: "🎯" },
    { name: "Cover Letter", score: null, weight: 0.15, icon: "✉️", missing: true },
    { name: "Interview Readiness", score: null, weight: 0.10, icon: "🎤", missing: true }
  ];

  const knownComponents = components.filter(c => c.score !== null);
  const overallReadiness = knownComponents.length > 0
    ? Math.round(knownComponents.reduce((sum, c) => sum + c.score * c.weight, 0) /
        knownComponents.reduce((sum, c) => sum + c.weight, 0))
    : 0;

  return res.json({
    status: "success",
    data: {
      overallReadiness,
      resumeScore,
      resumeName,
      matchScore,
      atsScore,
      matchedSkills: app.matchResultId?.matchedSkills || [],
      missingSkills: app.matchResultId?.missingSkills || [],
      components,
      recommendation: overallReadiness >= 85
        ? "Your application looks strong. Apply with confidence."
        : overallReadiness >= 70
          ? "Good application. Consider tailoring your resume before applying."
          : "Improve your resume match and ATS score before applying."
    }
  });
});
