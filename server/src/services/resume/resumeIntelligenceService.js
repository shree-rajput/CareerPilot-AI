import { Resume } from "../../models/Resume.js";
import { Job } from "../../models/Job.js";
import { executeAiTask } from "../ai/orchestrator.js";
import { updateUserReadinessScore } from "../career/readinessService.js";

/**
 * Analyzes a resume against a job description.
 * 
 * @param {string} resumeId - Resume ID
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeResumeAgainstJob(resumeId, jobId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new Error("Resume not found.");
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new Error("Job not found.");
  }

  const result = await executeAiTask("ANALYZE_RESUME_AGAINST_JOB", {
    resumeData: resume.structuredData,
    jdText: job.description || "",
    jdRequirements: (job.requirements || []).join("\n")
  });

  // Update resume with results
  resume.matchScore = result.matchScore;
  resume.atsScore = result.atsScore;
  resume.keywordCoverage = result.keywordCoverage;
  resume.missingSkills = result.missingSkills;
  resume.healthIndicators = result.healthIndicators;
  resume.aiSuggestions = result.aiSuggestions;

  await resume.save();

  // Recalculate readiness score for candidate
  await updateUserReadinessScore(userId, "Completed Resume ATS Analysis");

  return result;
}

/**
 * Gets an inline AI suggestion for improving a specific section of a resume.
 * 
 * @param {string} text - Selection text
 * @param {string} context - Resume section context
 * @param {string} instruction - Special phrasing instructions
 * @returns {Promise<string>} Improved text recommendation
 */
export async function getInlineResumeSuggestion(text, context, instruction) {
  const result = await executeAiTask("GET_INLINE_RESUME_SUGGESTION", {
    text,
    context,
    instruction
  });

  if (result && result.suggestion) {
    return result.suggestion;
  }
  
  throw new Error("Invalid response from suggestion engine");
}
