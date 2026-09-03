import { Job } from "../../models/Job.js";
import { extractJobDescription } from "../ai/aiService.js";
import { normalizeSkill } from "./taxonomyService.js";

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
    requiredSkills: formatSkillList(extractedData?.requiredSkills),
    preferredSkills: formatSkillList(extractedData?.preferredSkills),
    softSkills: formatSkillList(extractedData?.softSkills),
    isActive: true
  });

  return await newJob.save();
}

export function formatSkillList(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.map(s => {
    let name = "";
    let importance = "MEDIUM";
    if (typeof s === "string") {
      name = s.trim();
    } else if (s && typeof s === "object") {
      name = s.skillName || s.name || s.canonicalName || "";
      importance = s.importance || "MEDIUM";
    }
    if (!name) return null;

    const normalized = normalizeSkill(name);
    return {
      skillName: normalized ? normalized.canonicalName : name,
      importance
    };
  }).filter(s => s && s.skillName);
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
 * Soft delete or remove a job opportunity for a specific user.
 * Preserves Application history if the candidate has applied/interviewed.
 */
export async function deleteUserJobOpportunity(jobId, userId) {
  const { Application } = await import("../../models/Application.js");
  const { AppError } = await import("../../utils/errors.js");

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  }

  const userIdStr = String(userId);
  const isSavedByUser = job.savedBy.some(id => String(id) === userIdStr);
  const application = await Application.findOne({ userId, jobId });

  if (!isSavedByUser && !application) {
    throw new AppError("Access denied: You do not have permission to delete this job.", 403, "FORBIDDEN");
  }

  // Determine if meaningful application activity exists
  const hasActiveApplication = application && (
    !["saved", "discovered", "draft"].includes(application.status) ||
    (application.statusHistory && application.statusHistory.length > 1)
  );

  if (hasActiveApplication) {
    // Preserve Application history while removing from Job Board / Saved list
    job.savedBy = job.savedBy.filter(id => String(id) !== userIdStr);
    await job.save();

    return {
      success: true,
      message: "Opportunity removed from Job Board. Application history preserved.",
      preservedApplication: true,
      jobId: job._id
    };
  }

  // Safe delete: Clean up draft application & remove from savedBy
  if (application) {
    await Application.deleteOne({ _id: application._id });
  }

  job.savedBy = job.savedBy.filter(id => String(id) !== userIdStr);
  if (job.savedBy.length === 0) {
    job.isActive = false;
  }
  await job.save();

  return {
    success: true,
    message: "Job opportunity deleted successfully.",
    preservedApplication: false,
    jobId: job._id
  };
}

/**
 * Legacy deactivateJob wrapper.
 */
export async function deactivateJob(jobId, userId) {
  if (userId) {
    return await deleteUserJobOpportunity(jobId, userId);
  }
  const job = await Job.findByIdAndUpdate(jobId, { isActive: false }, { new: true });
  if (!job) throw new Error("Job not found.");
  return job;
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
  const { User } = await import("../../models/User.js");
  const { UserSkill } = await import("../../models/UserSkill.js");
  const { Project } = await import("../../models/Project.js");
  const { runMatchPipeline } = await import("../matching/matchEngine.js");
  const { AppError } = await import("../../utils/errors.js");

  const [user, resume, userSkills, projects, job] = await Promise.all([
    User.findById(userId).lean(),
    Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).lean(),
    UserSkill.find({ userId }).lean(),
    Project.find({ userId }).lean(),
    Job.findById(jobId).lean()
  ]);

  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");

  // Validate JD description length
  if (!job.description || job.description.trim().length < 20) {
    throw new AppError("There's not enough job description data to generate a reliable analysis.", 400, "JOB_DATA_INSUFFICIENT");
  }

  const candidateContext = {
    user,
    userSkills,
    projects,
    careerProfile: {
      targetRoles: user?.targetRoles || [],
      experienceLevel: user?.experienceLevel || "student"
    }
  };

  // Build structured extractedJd from stored Job fields
  const extractedJd = {
    title: job.title || job.role || "",
    company: job.company || "",
    requiredSkills: (job.requiredSkills || []).map(s => typeof s === "string" ? s : s.skillName || s.name || "").filter(Boolean),
    preferredSkills: (job.preferredSkills || []).map(s => typeof s === "string" ? s : s.skillName || s.name || "").filter(Boolean),
    responsibilities: job.description ? [job.description.substring(0, 300)] : [],
    educationRequirement: job.experienceLevel || "",
    experienceYears: null
  };

  const matchResult = await runMatchPipeline(resume?.structuredData || {}, extractedJd, candidateContext);

  return {
    hasResume: !!resume,
    resumeId: resume?._id || null,
    resumeName: resume?.name || "Career Profile",
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
