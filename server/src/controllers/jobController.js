import * as jobService from "../services/career/jobService.js";
import { ingestJobOpportunity } from "../services/jobIngestionService.js";
import { extractPdfTextWithQualityCheck } from "../services/pdfExtractionService.js";
import { Job } from "../models/Job.js";

/**
 * POST /api/jobs/ingest
 * Single Shared Ingestion Pipeline Endpoint.
 * Ingests job opportunities from Chrome Extension, PDF Upload, URL, or Manual form.
 */
export const ingestJob = async (req, res, next) => {
  try {
    const result = await ingestJobOpportunity(req.body, req.user._id);
    const dto = await jobService.formatJobDTO(result.job, req.user._id);
    res.status(200).json({
      status: "success",
      data: {
        ...result,
        job: dto,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/upload-jd-pdf
 * Processes uploaded JD PDF file with extraction quality confidence check.
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

    const dto = await jobService.formatJobDTO(ingestionResult.job, req.user._id);

    res.status(200).json({
      status: "success",
      data: {
        ...ingestionResult,
        job: dto,
      },
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

    // Query canonical jobs captured/viewed or saved by the authenticated user
    const jobs = await Job.find({
      $or: [{ viewedBy: userId }, { savedBy: userId }],
      isActive: true,
    }).sort({ createdAt: -1 });

    const inboxDTOs = await Promise.all(
      jobs.map((job) => jobService.formatJobDTO(job, userId))
    );

    res.status(200).json({ status: "success", data: inboxDTOs.filter(Boolean) });
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const job = await jobService.extractAndCreateJob(req.body);
    const dto = await jobService.formatJobDTO(job, req.user._id);
    res.status(201).json({ status: "success", data: dto });
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

    const dtos = await Promise.all(
      jobs.map((job) => jobService.formatJobDTO(job, req.user._id))
    );

    res.status(200).json({ status: "success", data: dtos.filter(Boolean) });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    const dto = await jobService.formatJobDTO(job, req.user._id);
    res.status(200).json({ status: "success", data: dto });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.params.id, req.body);
    const dto = await jobService.formatJobDTO(job, req.user._id);
    res.status(200).json({ status: "success", data: dto });
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
    const job = await jobService.getJobById(req.params.id);
    const dto = await jobService.formatJobDTO(job, req.user._id);
    res.status(200).json({ status: "success", data: { ...result, job: dto } });
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

