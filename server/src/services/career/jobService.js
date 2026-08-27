import { Job } from "../../models/Job.js";
import { extractJobDescription } from "../ai/aiService.js";

/**
 * Creates a new Job from manual input or an extraction source.
 * It uses AI to parse the job description and extract structured skills.
 */
export async function extractAndCreateJob({ title, company, description, location, employmentType, experienceLevel, source, url }) {
  if (!description) {
    throw new Error("Job description is required for extraction.");
  }

  // Use AI to extract required/preferred skills
  let extractedData;
  try {
    extractedData = await extractJobDescription(description);
  } catch (error) {
    console.error("[JobService] JD Extraction failed, falling back to empty skills:", error);
    extractedData = {
      requiredSkills: [],
      preferredSkills: [],
      softSkills: []
    };
  }

  // Create Job in database
  const newJob = new Job({
    title,
    company,
    description,
    location: location || "",
    employmentType: employmentType || "",
    experienceLevel: experienceLevel || "",
    source: source || "manual",
    url: url || "",
    requiredSkills: extractedData.requiredSkills || [],
    preferredSkills: extractedData.preferredSkills || [],
    softSkills: extractedData.softSkills || [],
    isActive: true
  });

  return await newJob.save();
}

/**
 * Get all jobs, optionally filtered.
 */
export async function getJobs(filter = {}) {
  return await Job.find(filter).sort({ createdAt: -1 });
}

/**
 * Get a specific job by ID.
 */
export async function getJobById(jobId) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  return job;
}

/**
 * Update an existing job.
 */
export async function updateJob(jobId, updateData) {
  const job = await Job.findByIdAndUpdate(jobId, updateData, { new: true, runValidators: true });
  if (!job) {
    throw new Error("Job not found.");
  }
  return job;
}

/**
 * Soft delete or deactivate a job.
 */
export async function deactivateJob(jobId) {
  return await updateJob(jobId, { isActive: false });
}
