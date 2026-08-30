import { Job } from "../../models/Job.js";
import { extractJobDescription } from "../ai/aiService.js";

/**
 * Creates a new Job from manual input or an extraction source.
 * It uses AI to parse the job description and extract structured skills.
 */
export async function extractAndCreateJob({ title, company, description, location, employmentType, experienceLevel, source, url, salaryMin, salaryMax, salaryCurrency, salaryDisplay, remoteStatus, sponsorshipAvailable, isInternship, isNewGrad, postedDate }) {
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
    salaryMin: salaryMin || null,
    salaryMax: salaryMax || null,
    salaryCurrency: salaryCurrency || "INR",
    salaryDisplay: salaryDisplay || "",
    remoteStatus: remoteStatus || "",
    sponsorshipAvailable: sponsorshipAvailable ?? null,
    isInternship: isInternship || false,
    isNewGrad: isNewGrad || false,
    postedDate: postedDate || null,
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
export async function getJobs({ search, remoteStatus, employmentType, experienceLevel, savedOnly, userId } = {}) {
  const query = { isActive: true };

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [{ title: searchRegex }, { company: searchRegex }];
  }
  if (remoteStatus) query.remoteStatus = remoteStatus;
  if (employmentType) query.employmentType = employmentType;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (savedOnly && userId) query.savedBy = userId;

  return await Job.find(query).sort({ createdAt: -1 });
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

/**
 * Toggle save/bookmark a job for a user.
 * Returns { saved: boolean, savedCount: number }
 */
export async function toggleSaveJob(jobId, userId) {
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found.");

  const userIdStr = String(userId);
  const alreadySaved = job.savedBy.some(id => String(id) === userIdStr);

  if (alreadySaved) {
    job.savedBy = job.savedBy.filter(id => String(id) !== userIdStr);
  } else {
    job.savedBy.push(userId);
  }

  await job.save();
  return { saved: !alreadySaved, savedCount: job.savedBy.length };
}

/**
 * Run the match pipeline between a job and the user's latest resume
 * WITHOUT requiring an application to exist first.
 *
 * Returns a lightweight match result with scores and skill lists.
 */
export async function matchJobToProfile(jobId, userId) {
  const { Resume } = await import("../../models/Resume.js");
  const { runMatchPipeline } = await import("../matching/matchEngine.js");

  // Get latest resume for user
  const resume = await Resume.findOne({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  if (!resume) {
    return {
      hasResume: false,
      overallScore: 0,
      categoryScores: {},
      matchedSkills: [],
      partialSkills: [],
      missingSkills: [],
      explanation: "No resume found. Upload a resume to see your match score."
    };
  }

  const job = await Job.findById(jobId).lean();
  if (!job) throw new Error("Job not found.");

  // Build a minimal extractedJd structure from job's stored skills
  const extractedJd = {
    requiredSkills: job.requiredSkills.map(s => s.skillName),
    preferredSkills: job.preferredSkills.map(s => s.skillName),
    responsibilities: [],
    educationRequirement: "",
    experienceYears: null
  };

  const matchResult = await runMatchPipeline(resume.structuredData, extractedJd);

  return {
    hasResume: true,
    resumeId: resume._id,
    resumeName: resume.name,
    ...matchResult
  };
}

/**
 * AI "Should I Apply?" recommendation.
 *
 * Analyzes job vs profile match and returns:
 * - verdict: "APPLY" | "MAYBE" | "LOW_PRIORITY"
 * - reasoning: string explanation
 * - effort: "LOW" | "MEDIUM" | "HIGH"
 * - tailoringRecommended: boolean
 */
export async function shouldApplyRecommendation(jobId, userId) {
  const matchData = await matchJobToProfile(jobId, userId);

  const score = matchData.overallScore || 0;
  const matched = matchData.matchedSkills?.length || 0;
  const missing = matchData.missingSkills?.length || 0;
  const partial = matchData.partialSkills?.length || 0;

  let verdict, reasoning, effort, tailoringRecommended;

  if (!matchData.hasResume) {
    return {
      verdict: "UNKNOWN",
      reasoning: "Upload a resume to get a personalized recommendation.",
      effort: "HIGH",
      tailoringRecommended: true,
      matchScore: 0,
      matchBreakdown: {}
    };
  }

  if (score >= 80) {
    verdict = "APPLY";
    const missingNote = missing > 0
      ? ` The ${missing} missing skill${missing > 1 ? "s" : ""} (${matchData.missingSkills.slice(0, 3).join(", ")}) ${missing > 1 ? "appear" : "appears"} to be preferred rather than required.`
      : " You meet virtually all the stated requirements.";
    reasoning = `Your profile matches ${score}% of the core requirements. You have strong evidence for ${matched} key skill${matched !== 1 ? "s" : ""}.${missingNote}`;
    effort = missing === 0 ? "LOW" : "LOW";
    tailoringRecommended = score < 90;
  } else if (score >= 60) {
    verdict = "MAYBE";
    reasoning = `Your profile covers ${score}% of requirements with ${matched} strong matches. You're missing ${missing} skill${missing !== 1 ? "s" : ""} (${matchData.missingSkills.slice(0, 3).join(", ")}). Tailoring your resume and addressing the gaps could make this a strong application.`;
    effort = "MEDIUM";
    tailoringRecommended = true;
  } else {
    verdict = "LOW_PRIORITY";
    reasoning = `Your current profile matches only ${score}% of the stated requirements. You'd need to significantly bridge ${missing} skill gap${missing !== 1 ? "s" : ""} before this role becomes a strong fit. Consider adding relevant projects or certifications first.`;
    effort = "HIGH";
    tailoringRecommended = true;
  }

  return {
    verdict,
    reasoning,
    effort,
    tailoringRecommended,
    matchScore: score,
    matchedSkills: matchData.matchedSkills,
    missingSkills: matchData.missingSkills,
    partialSkills: matchData.partialSkills,
    matchBreakdown: matchData.categoryScores || {}
  };
}
