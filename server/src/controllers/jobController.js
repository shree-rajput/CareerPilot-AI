import * as jobService from "../services/career/jobService.js";
import { ingestJobOpportunity } from "../services/jobIngestionService.js";
import { extractPdfTextWithQualityCheck } from "../services/pdfExtractionService.js";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";

/**
 * POST /api/jobs/ingest
 * Single Shared Ingestion Pipeline Endpoint.
 * Ingests job opportunities from Chrome Extension, PDF Upload, URL, or Manual form.
 */
export const ingestJob = async (req, res, next) => {
  try {
    const result = await ingestJobOpportunity(req.body, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/upload-jd-pdf
 * Processes uploaded JD PDF file with extraction quality confidence check.
 * If confidence >= 60%, automatically executes shared ingestion pipeline.
 * If confidence < 60%, returns low confidence status with extracted text for user review/editing.
 */
export const uploadJdPdf = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ status: "error", message: "PDF file is required." });
    }

    const extractionResult = await extractPdfTextWithQualityCheck(req.file.buffer);

    if (!extractionResult.isHighConfidence && !req.body.forceSave) {
      return res.status(200).json({
        status: "low_confidence",
        qualityScore: extractionResult.qualityScore,
        extractedText: extractionResult.text,
        message: extractionResult.message,
      });
    }

    // High confidence or forced save — proceed with single shared ingestion pipeline
    const ingestionResult = await ingestJobOpportunity(
      {
        sourceType: "pdf",
        extractedText: extractionResult.text,
        extractionConfidence: extractionResult.qualityScore,
        title: req.body.title || "Uploaded Position",
        company: req.body.company || "Company",
      },
      req.user._id
    );

    res.status(200).json({
      status: "success",
      data: ingestionResult,
      qualityScore: extractionResult.qualityScore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/jobs/inbox
 * Returns captured opportunities for the authenticated user's Job Inbox,
 * including source transparency, match scores, recommended resume, & linked application details.
 */
export const getJobInbox = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch applications created for this user with job references
    const applications = await Application.find({ userId })
      .populate("jobId")
      .populate("resumeVersionId")
      .populate("matchResultId")
      .sort({ createdAt: -1 })
      .lean();

    const inboxItems = applications.map((app) => {
      const job = app.jobId || {};
      const matchResult = app.matchResultId || {};
      const resume = app.resumeVersionId || {};

      return {
        applicationId: app._id,
        jobId: job._id || null,
        company: app.company || job.company || "Company",
        title: app.role || job.title || "Position",
        location: app.location || job.location || "",
        sourceType: job.sourceType || app.source || "manual",
        sourceUrl: app.jobUrl || job.url || "",
        status: app.status || "saved",
        capturedAt: app.createdAt,
        matchScore: matchResult.overallScore || 0,
        matchedSkills: matchResult.matchedSkills || [],
        missingSkills: matchResult.missingSkills || [],
        recommendedResume: resume._id
          ? {
              id: resume._id,
              name: resume.name || `Version ${resume.version || 1}`,
              version: resume.version || 1,
            }
          : null,
      };
    });

    res.status(200).json({ status: "success", data: inboxItems });
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const job = await jobService.extractAndCreateJob(req.body);
    res.status(201).json({ status: "success", data: job });
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (req, res, next) => {
  try {
    const { search, remoteStatus, employmentType, experienceLevel, savedOnly } = req.query;
    const jobs = await jobService.getJobs({
      search,
      remoteStatus,
      employmentType,
      experienceLevel,
      savedOnly: savedOnly === "true",
      userId: req.user._id,
    });

    const userId = String(req.user._id);
    const jobsWithSaved = jobs.map((job) => ({
      ...job.toObject(),
      isSaved: job.savedBy?.some((id) => String(id) === userId) || false,
    }));

    res.status(200).json({ status: "success", data: jobsWithSaved });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    const userId = String(req.user._id);
    const jobObj = job.toObject();
    jobObj.isSaved = job.savedBy?.some((id) => String(id) === userId) || false;
    res.status(200).json({ status: "success", data: jobObj });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.params.id, req.body);
    res.status(200).json({ status: "success", data: job });
  } catch (error) {
    next(error);
  }
};

export const deactivateJob = async (req, res, next) => {
  try {
    const result = await jobService.deleteUserJobOpportunity(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const saveJob = async (req, res, next) => {
  try {
    const result = await jobService.toggleSaveJob(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const matchJob = async (req, res, next) => {
  try {
    const result = await jobService.matchJobToProfile(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const shouldApply = async (req, res, next) => {
  try {
    const result = await jobService.shouldApplyRecommendation(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};
