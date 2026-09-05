import { z } from "zod";
import { env } from "../config/env.js";
import { Application, STATUS_VALUES } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { MatchResult } from "../models/MatchResult.js";
import { extractJobDescription } from "../services/ai/aiService.js";
import { getApplicationIntelligence } from "../services/career/careerIntelligenceService.js";
import { executeAiTask } from "../services/ai/orchestrator.js";
import { EmailEventRecord } from "../models/EmailEventRecord.js";
import { Notification } from "../models/Notification.js";
import { classifyEmailEvent } from "../services/career/emailClassificationService.js";
import { matchEmailToApplication } from "../services/career/applicationMatchingService.js";
import { validateAndApplyTransition, canTransitionStatus } from "../services/career/statusTransitionEngine.js";
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
  status: z.enum(STATUS_VALUES).optional(),
  notes: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  dateApplied: z.string().datetime({ offset: true }).optional().nullable(),
  interviewDate: z.string().datetime({ offset: true }).optional().nullable(),
  resumeVersionId: z.string().optional().nullable(),
  statusNote: z.string().trim().max(500).optional(),
  source: z.string().optional(),
  evidence: z.string().optional(),
  changedBy: z.string().optional()
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

  // Get user's resume (latest active or linked)
  let resume = null;
  if (app.resumeVersionId) {
    resume = await Resume.findOne({ _id: app.resumeVersionId, userId: req.user._id }).lean();
  }
  if (!resume) {
    resume = await Resume.findOne({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean();
  }

  const tone = req.body.tone || "professional";
  const highlight = req.body.highlight || "";

  try {
    const result = await executeAiTask("GENERATE_COVER_LETTER", {
      company: app.company,
      role: app.role,
      tone,
      highlight,
      jobDescription: app.jobDescription || "",
      resumeText: resume?.rawText || ""
    });

    return res.json({
      status: "success",
      data: {
        coverLetter: result?.coverLetter || "",
        wordCount: result?.wordCount || 0,
        highlightsUsed: result?.highlightsUsed || [],
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

  let resume = null;
  if (app.resumeVersionId) {
    resume = await Resume.findOne({ _id: app.resumeVersionId, userId: req.user._id }).lean();
  }
  if (!resume) {
    resume = await Resume.findOne({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean();
  }

  const messageType = req.body.type || "application";
  const recruiterName = req.body.recruiterName || "";

  try {
    const result = await executeAiTask("GENERATE_RECRUITER_MESSAGE", {
      company: app.company,
      role: app.role,
      type: messageType,
      recruiterName,
      jobDescription: app.jobDescription || "",
      resumeText: resume?.rawText || ""
    });

    return res.json({
      status: "success",
      data: {
        message: result?.message || "",
        subjectLine: result?.subjectLine || "",
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

/**
 * POST /api/applications/confirm-suggestion
 * Confirm or dismiss a status change suggestion.
 */
export const confirmStatusSuggestion = asyncHandler(async (req, res) => {
  const { applicationId, suggestionId, action } = req.body;
  if (!applicationId || !suggestionId || !action) {
    throw new AppError(
      "applicationId, suggestionId, and action ('confirm' | 'dismiss') are required.",
      400,
      "VALIDATION_ERROR"
    );
  }

  const app = await Application.findOne({ _id: applicationId, userId: req.user._id });
  if (!app) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  const suggestion = app.pendingStatusSuggestions.id(suggestionId);
  if (!suggestion) throw new AppError("Status suggestion not found.", 404, "SUGGESTION_NOT_FOUND");

  if (action === "confirm") {
    const fromStatus = app.status;
    app.status = suggestion.suggestedStatus;
    app.statusHistory.push({
      fromStatus,
      toStatus: suggestion.suggestedStatus,
      changedBy: suggestion.source || "auto_stale",
      note: suggestion.reason,
      timestamp: new Date(),
    });
    app.lastActivityAt = new Date();
    suggestion.status = "confirmed";
  } else {
    suggestion.status = "dismissed";
  }

  await app.save();
  return res.json({ message: `Suggestion ${action}ed successfully.`, application: app });
});

/**
 * POST /api/applications/bulk-status
 * Perform bulk status updates with strict ownership validation across all targets.
 */
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { applicationIds, newStatus, note } = req.body;
  if (!Array.isArray(applicationIds) || applicationIds.length === 0 || !newStatus) {
    throw new AppError("applicationIds array and newStatus are required.", 400, "VALIDATION_ERROR");
  }

  const apps = await Application.find({
    _id: { $in: applicationIds },
    userId: req.user._id,
  });

  if (apps.length !== applicationIds.length) {
    throw new AppError("Unauthorized access to one or more target applications.", 403, "FORBIDDEN");
  }

  for (const app of apps) {
    const fromStatus = app.status;
    app.status = newStatus;
    app.statusHistory.push({
      fromStatus,
      toStatus: newStatus,
      changedBy: "manual",
      note: note || "Bulk status update",
      timestamp: new Date(),
    });
    app.lastActivityAt = new Date();
    await app.save();
  }

  return res.json({
    message: `Successfully updated ${apps.length} applications to ${newStatus}.`,
    updatedCount: apps.length,
  });
});

/**
 * POST /api/applications/email-events
 * Process email lifecycle events with multi-signal classification, matching, idempotency, and transition validation.
 */
export const processEmailEvent = asyncHandler(async (req, res) => {
  const {
    messageId,
    threadId,
    senderName,
    senderEmail,
    senderDomain,
    subject,
    bodyText,
    links,
    timestamp,
  } = req.body || {};

  if (!messageId || typeof messageId !== "string") {
    throw new AppError("messageId string is required.", 400, "VALIDATION_ERROR");
  }

  // 1. Idempotency Check: Prevent duplicate processing of the same email
  const existingRecord = await EmailEventRecord.findOne({ userId: req.user._id, messageId }).lean();
  if (existingRecord) {
    return res.status(200).json({
      status: "ALREADY_PROCESSED",
      message: "Email message already processed.",
      record: existingRecord,
    });
  }

  // 2. Classify Event
  const emailData = {
    messageId,
    threadId: threadId || "",
    senderName: senderName || "",
    senderEmail: senderEmail || "",
    senderDomain: senderDomain || (senderEmail ? senderEmail.split("@")[1] : ""),
    subject: subject || "",
    bodyText: bodyText || "",
    links: Array.isArray(links) ? links : [],
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  };

  const classified = classifyEmailEvent(emailData);

  if (!classified.isApplicationRelevant) {
    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: "NOT_APPLICATION_RELEVANT",
      detectedStatus: "saved",
      confidence: "low",
      confidenceScore: 0,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      actionTaken: "IGNORED_NOT_RELEVANT",
    });

    return res.status(200).json({
      status: "NOT_APPLICATION_RELEVANT",
      classified,
      record,
    });
  }

  // 3. Application Matching
  const matchResult = await matchEmailToApplication(req.user._id, emailData, classified);

  if (matchResult.isAmbiguous) {
    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: classified.eventType,
      detectedStatus: classified.detectedStatus,
      confidence: "medium",
      confidenceScore: matchResult.confidenceScore,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      evidence: classified.evidenceSnippet,
      matchSignals: matchResult.matchSignals,
      actionTaken: "AMBIGUOUS_MATCH_REQUIRES_SELECTION",
    });

    return res.status(200).json({
      status: "AMBIGUOUS_MATCH",
      classified,
      matchResult,
      matchingCandidates: matchResult.matchingCandidates,
      record,
    });
  }

  if (!matchResult.matchedApplication || matchResult.confidence?.toUpperCase() === "LOW") {
    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: classified.eventType,
      detectedStatus: classified.detectedStatus,
      confidence: matchResult.confidence?.toLowerCase() || "low",
      confidenceScore: matchResult.confidenceScore,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      evidence: classified.evidenceSnippet,
      matchSignals: matchResult.matchSignals,
      actionTaken: "IGNORED_LOW_CONFIDENCE",
    });

    return res.status(200).json({
      status: "NO_MATCHING_APPLICATION",
      classified,
      matchResult,
      record,
    });
  }

  const app = await Application.findOne({ _id: matchResult.matchedApplication._id, userId: req.user._id });

  // 4. Validate Status Transition
  const canTransition = canTransitionStatus(app.status, classified.detectedStatus, "email");
  if (!canTransition) {
    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: classified.eventType,
      detectedStatus: classified.detectedStatus,
      confidence: matchResult.confidence?.toLowerCase() || "low",
      confidenceScore: matchResult.confidenceScore,
      matchedApplicationId: app._id,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      evidence: classified.evidenceSnippet,
      matchSignals: matchResult.matchSignals,
      actionTaken: "IGNORED_FORBIDDEN_TRANSITION",
    });

    return res.status(200).json({
      status: "FORBIDDEN_TRANSITION",
      reason: `Cannot transition application from '${app.status}' to '${classified.detectedStatus}'.`,
      application: app,
      classified,
      record,
    });
  }

  // 5. Apply Automatic Update (HIGH Confidence) or Pending Suggestion (MEDIUM Confidence)
  const isHighMatch = matchResult.confidence?.toUpperCase() === "HIGH";
  const isHighEvent = classified.eventConfidence?.toUpperCase() === "HIGH";

  if (isHighMatch && isHighEvent) {
    const transition = validateAndApplyTransition(app, {
      targetStatus: classified.detectedStatus,
      source: "email",
      confidence: "high",
      evidence: classified.evidenceSnippet,
      note: `Email event: ${classified.eventType} (${classified.evidenceSnippet})`,
    });

    await app.save();

    // Create In-App Notification
    await Notification.create({
      userId: req.user._id,
      type: "APPLICATION_STATUS",
      title: `${app.company} Application Updated`,
      message: `Status for ${app.role} at ${app.company} updated to ${classified.detectedStatus.toUpperCase()} based on email event.`,
      entityType: "application",
      entityId: app._id.toString(),
      actionUrl: `/applications/${app._id}`,
      idempotencyKey: `email-${messageId}`,
    }).catch(() => {});

    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: classified.eventType,
      detectedStatus: classified.detectedStatus,
      confidence: "high",
      confidenceScore: matchResult.confidenceScore,
      matchedApplicationId: app._id,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      evidence: classified.evidenceSnippet,
      matchSignals: matchResult.matchSignals,
      actionTaken: "AUTOMATIC_UPDATE",
    });

    return res.status(200).json({
      status: "AUTOMATIC_UPDATE",
      application: app,
      classified,
      record,
    });
  } else {
    // Medium confidence -> create pending suggestion
    app.pendingStatusSuggestions.push({
      suggestedStatus: classified.detectedStatus,
      reason: classified.evidenceSnippet || `Email event detected: ${classified.eventType}`,
      source: "email",
      status: "pending",
      createdAt: new Date(),
    });

    await app.save();

    const record = await EmailEventRecord.create({
      userId: req.user._id,
      messageId,
      threadId: emailData.threadId,
      eventType: classified.eventType,
      detectedStatus: classified.detectedStatus,
      confidence: "medium",
      confidenceScore: matchResult.confidenceScore,
      matchedApplicationId: app._id,
      sender: emailData.senderName,
      senderEmail: emailData.senderEmail,
      senderDomain: emailData.senderDomain,
      subject: emailData.subject,
      receivedAt: emailData.timestamp,
      evidence: classified.evidenceSnippet,
      matchSignals: matchResult.matchSignals,
      actionTaken: "SUGGESTION_CREATED",
    });

    return res.status(200).json({
      status: "SUGGESTION_CREATED",
      application: app,
      classified,
      record,
    });
  }
});


