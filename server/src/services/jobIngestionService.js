import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";
import { Resume } from "../models/Resume.js";
import { extractJobDescription } from "./ai/aiService.js";
import { formatSkillList, matchJobToProfile } from "./career/jobService.js";
import { AppError } from "../utils/errors.js";

/**
 * Clean and canonicalize URLs by removing common tracking parameters.
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeUrl(rawUrl = "") {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl);
    // Remove UTM & tracking query parameters
    const paramsToClean = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "refId", "trackingId", "trk"];
    paramsToClean.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch (e) {
    return rawUrl.trim();
  }
}

/**
 * Normalize job titles for fuzzy deduplication.
 * E.g., "Software Engineer II" -> "software engineer 2"
 * @param {string} title
 * @returns {string}
 */
export function normalizeJobTitle(title = "") {
  if (!title) return "";
  let norm = title.toLowerCase().trim();
  norm = norm.replace(/\bii\b/g, "2");
  norm = norm.replace(/\biii\b/g, "3");
  norm = norm.replace(/\biv\b/g, "4");
  norm = norm.replace(/[^a-z0-9\s]/g, " ");
  return norm.replace(/\s+/g, " ").trim();
}

/**
 * Single Shared Job Ingestion Pipeline.
 * Handles Chrome Extension, JD PDF Upload, URL, and Manual job captures.
 *
 * @param {Object} payload Ingestion parameters
 * @param {string} userId Authenticated User ID
 * @returns {Promise<Object>} Ingestion result with Job, Application, Match, & Resume Recommendation
 */
export async function ingestJobOpportunity(payload = {}, userId) {
  const rawJob = payload.rawJobData || payload;

  const title = (rawJob.title || payload.title || "").trim();
  const company = (rawJob.company || payload.company || "").trim();
  const description = (rawJob.description || payload.extractedText || payload.description || "").trim();

  // Boundary Validation BEFORE Database Operations
  if (!title) {
    throw new AppError("Job title is required for ingestion", 400, "MISSING_TITLE");
  }
  if (!company) {
    throw new AppError("Company name is required for ingestion", 400, "MISSING_COMPANY");
  }

  // Determine Source & SourceType
  const rawSource = (payload.source || rawJob.source || "manual").toLowerCase();
  let sourceType = payload.sourceType;
  if (!sourceType) {
    if (["linkedin", "indeed", "generic", "naukri", "wellfound"].includes(rawSource)) {
      sourceType = "extension";
    } else {
      sourceType = "manual";
    }
  }

  const sourceUrl = payload.sourceUrl || rawJob.url || payload.url || "";
  const externalJobId = payload.externalJobId || rawJob.externalJobId || "";
  const location = (rawJob.location || payload.location || "").trim();
  const employmentType = (rawJob.employmentType || payload.employmentType || "").trim();
  const salaryDisplay = (rawJob.salary || payload.salaryDisplay || payload.salary || "").trim();

  // Normalize Workplace/Remote Status
  const rawWorkplace = (rawJob.workplaceType || payload.workplaceType || payload.remoteStatus || "").toLowerCase();
  let remoteStatus = "";
  if (rawWorkplace.includes("remote")) remoteStatus = "remote";
  else if (rawWorkplace.includes("hybrid")) remoteStatus = "hybrid";
  else if (rawWorkplace.includes("onsite") || rawWorkplace.includes("on-site")) remoteStatus = "onsite";

  // Normalize Extraction Confidence to Number (0-100)
  const rawConfidence = payload.extractionConfidence || rawJob.extractionConfidence || 100;
  let numConfidence = 100;
  if (typeof rawConfidence === "number") {
    numConfidence = rawConfidence;
  } else if (typeof rawConfidence === "string") {
    const u = rawConfidence.toUpperCase();
    if (u === "HIGH") numConfidence = 90;
    else if (u === "MEDIUM") numConfidence = 70;
    else if (u === "LOW") numConfidence = 40;
    else {
      const parsed = parseInt(rawConfidence, 10);
      numConfidence = isNaN(parsed) ? 100 : parsed;
    }
  }

  const canonicalUrl = sanitizeUrl(sourceUrl);
  const normTitle = normalizeJobTitle(title);

  // Development safe payload log
  if (process.env.NODE_ENV !== "production") {
    console.log("[jobIngestionService] Ingesting Job Payload:", {
      title,
      company,
      location,
      rawSource,
      sourceType,
      externalJobId,
      canonicalUrl,
      remoteStatus,
      numConfidence,
      descriptionLength: description.length,
    });
  }

  // 1. Deduplication Check
  let existingJob = null;
  if (canonicalUrl) {
    existingJob = await Job.findOne({ canonicalUrl, isActive: true });
  }
  if (!existingJob && externalJobId) {
    existingJob = await Job.findOne({ externalJobId, isActive: true });
  }
  if (!existingJob && company && normTitle) {
    existingJob = await Job.findOne({
      company: new RegExp(`^${company.replace(/[-[\]{}()*+?~\\^$|#\s]/g, "\\$&")}$`, "i"),
      normalizedTitle: normTitle,
      isActive: true,
    });
  }

  let job = existingJob;
  let isDuplicate = false;

  if (job) {
    isDuplicate = true;
    // Ensure user is in savedBy array
    if (!job.savedBy.some((id) => String(id) === String(userId))) {
      job.savedBy.push(userId);
      await job.save();
    }
  } else {
    // 2. AI Structured JD Extraction
    let extractedData = {
      requiredSkills: [],
      preferredSkills: [],
      softSkills: [],
      responsibilities: [],
      qualifications: [],
      technologies: [],
      experienceRequirement: "",
      educationRequirement: "",
    };

    if (description.length >= 20) {
      try {
        const aiExtracted = await extractJobDescription(description);
        extractedData = {
          requiredSkills: formatSkillList(aiExtracted?.requiredSkills),
          preferredSkills: formatSkillList(aiExtracted?.preferredSkills),
          softSkills: formatSkillList(aiExtracted?.softSkills),
          responsibilities: Array.isArray(aiExtracted?.responsibilities) ? aiExtracted.responsibilities : [],
          qualifications: Array.isArray(aiExtracted?.qualifications) ? aiExtracted.qualifications : [],
          technologies: Array.isArray(aiExtracted?.technologies) ? aiExtracted.technologies : [],
          experienceRequirement: aiExtracted?.experienceRequirement || "",
          educationRequirement: aiExtracted?.educationRequirement || "",
        };
      } catch (err) {
        console.error("[jobIngestionService] AI Extraction error:", err.message);
      }
    }

    // 3. Create Job
    job = new Job({
      title,
      company,
      description: description || `${title} position at ${company}`,
      location,
      employmentType,
      remoteStatus,
      source: rawSource,
      sourceType,
      url: sourceUrl || canonicalUrl,
      canonicalUrl,
      externalJobId,
      normalizedTitle: normTitle,
      salaryDisplay,
      extractionConfidence: numConfidence,
      savedBy: [userId],
      responsibilities: extractedData.responsibilities,
      qualifications: extractedData.qualifications,
      technologies: extractedData.technologies,
      experienceRequirement: extractedData.experienceRequirement,
      educationRequirement: extractedData.educationRequirement,
      requiredSkills: extractedData.requiredSkills,
      preferredSkills: extractedData.preferredSkills,
      softSkills: extractedData.softSkills,
      isActive: true,
    });

    await job.save();
  }

  // 4. Calculate Candidate Match & Resume Recommendation
  let matchResult = null;
  let recommendedResume = null;
  let allResumes = [];

  try {
    allResumes = await Resume.find({ userId, isActive: true }).sort({ createdAt: -1 });

    if (allResumes.length > 0) {
      let highestScore = -1;
      for (const resItem of allResumes) {
        const result = await matchJobToProfile(job._id, userId);
        const score = result?.overallScore || 0;
        if (score > highestScore) {
          highestScore = score;
          matchResult = result;
          recommendedResume = resItem;
        }
      }
    }
  } catch (err) {
    console.error("[jobIngestionService] Match execution error:", err.message);
  }

  if (!recommendedResume && allResumes.length > 0) {
    recommendedResume = allResumes[0];
  }

  // 5. Auto-Draft Application Creation
  let application = await Application.findOne({ userId, jobId: job._id });

  const extractedJdObject = {
    title: job.title,
    company: job.company,
    requiredSkills: job.requiredSkills.map((s) => s.skillName),
    preferredSkills: job.preferredSkills.map((s) => s.skillName),
    responsibilities: job.responsibilities || [],
    educationRequirement: job.educationRequirement || "",
    experienceRequirement: job.experienceRequirement || "",
  };

  if (!application) {
    const safeCompany = job.company.substring(0, 150);
    const safeRole = job.title.substring(0, 150);

    application = new Application({
      userId,
      jobId: job._id,
      company: safeCompany,
      role: safeRole,
      position: safeRole,
      jobDescription: job.description,
      extractedJd: extractedJdObject,
      status: "saved", // Default initial state "saved/discovered"
      source: sourceType === "extension" ? "extension_capture" : sourceType,
      location: job.location,
      jobUrl: job.url || canonicalUrl,
      resumeVersionId: recommendedResume?._id || null,
      statusHistory: [
        {
          fromStatus: "",
          toStatus: "saved",
          changedBy: sourceType === "extension" ? "extension_capture" : "manual",
          source: sourceType === "extension" ? "extension_capture" : "manual_upload",
          confidence: numConfidence >= 80 ? "high" : numConfidence >= 50 ? "medium" : "low",
          evidence: `Captured from ${job.company} - ${job.title}`,
          note: `Captured via ${sourceType === "extension" ? "Chrome Extension" : sourceType === "pdf" ? "JD PDF Upload" : sourceType}`,
        },
      ],
    });
    await application.save();
  }

  return {
    isDuplicate,
    job,
    application,
    matchResult: matchResult || { overallScore: 0, matchedSkills: [], missingSkills: [], partialSkills: [] },
    recommendedResume: recommendedResume
      ? {
          id: recommendedResume._id,
          name: recommendedResume.name || `Version ${recommendedResume.version || 1}`,
          version: recommendedResume.version || 1,
        }
      : null,
  };
}
