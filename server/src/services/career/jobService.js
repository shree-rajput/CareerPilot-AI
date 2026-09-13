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
    const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, "i");
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
  const { Application } = await import("../../models/Application.js");
  const { createInitialStatusHistory } = await import("./statusTransitionEngine.js");
  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found.");

  const userIdStr = String(userId);
  const alreadySaved = job.savedBy.some(id => String(id) === userIdStr);

  if (alreadySaved) {
    job.savedBy = job.savedBy.filter(id => String(id) !== userIdStr);
    // If the application is merely "saved", remove it from the board.
    await Application.findOneAndDelete({ 
      userId, 
      jobId, 
      status: { $in: ["saved", "discovered", "draft"] } 
    });
  } else {
    job.savedBy.push(userId);
    // Ensure an Application exists for the Job Board
    const existingApp = await Application.findOne({ userId, jobId });
    if (!existingApp) {
      await Application.create({
        userId,
        jobId,
        company: job.company,
        role: job.title,
        jobDescription: job.description,
        jobUrl: job.url || job.canonicalUrl || "",
        location: job.location || "",
        status: "saved",
        source: "job_board_save",
        statusHistory: [createInitialStatusHistory("saved", {
          changedBy: "manual",
          source: "job_board_save",
          note: "User saved job from inbox/search",
        })]
      });
    }
  }

  await job.save();
  return { saved: !alreadySaved, savedCount: job.savedBy.length };
}

/**
 * Formats a canonical Job model and user-specific intelligence into a unified DTO.
 * Guarantees that Job Board, Job Inbox, Extension, and Job Detail consume 100% consistent fields.
 */
export async function formatJobDTO(job, userId) {
  if (!job) return null;
  const { Application } = await import("../../models/Application.js");
  const { MatchResult } = await import("../../models/MatchResult.js");
  const { Resume } = await import("../../models/Resume.js");

  const userIdStr = String(userId);
  const rawJobObj = typeof job.toObject === "function" ? job.toObject() : job;
  const jobId = rawJobObj._id || rawJobObj.id;

  // 1. Fetch user-specific Application, MatchResult, and Resume recommendation in parallel
  const [application, matchResult, resume] = await Promise.all([
    Application.findOne({ userId, jobId }).lean(),
    MatchResult.findOne({ userId, jobId }).sort({ createdAt: -1 }).lean(),
    Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).lean()
  ]);

  // Determine skill extraction status
  const requiredList = (rawJobObj.requiredSkills || []).map(s => typeof s === "string" ? s : s.skillName || s.name || "").filter(Boolean);
  const preferredList = (rawJobObj.preferredSkills || []).map(s => typeof s === "string" ? s : s.skillName || s.name || "").filter(Boolean);
  const softList = (rawJobObj.softSkills || []).map(s => typeof s === "string" ? s : s.skillName || s.name || "").filter(Boolean);

  let skillsStatus = "COMPLETED";
  if (requiredList.length === 0 && preferredList.length === 0 && softList.length === 0) {
    if ((rawJobObj.description || "").length < 20) {
      skillsStatus = "PENDING";
    } else {
      skillsStatus = "NONE_DETECTED";
    }
  }

  const isSaved = (rawJobObj.savedBy || []).some(id => String(id) === userIdStr);
  const isViewed = (rawJobObj.viewedBy || []).some(id => String(id) === userIdStr);

  return {
    id: String(rawJobObj._id),
    _id: String(rawJobObj._id),
    title: rawJobObj.title || "Untitled Position",
    company: rawJobObj.company || "Unknown Company",
    location: rawJobObj.location || "",
    remoteStatus: rawJobObj.remoteStatus || "",
    employmentType: rawJobObj.employmentType || "",
    salaryDisplay: rawJobObj.salaryDisplay || "",
    description: rawJobObj.description || "",
    source: rawJobObj.source || "manual",
    sourceType: rawJobObj.sourceType || "manual",
    sourceUrl: rawJobObj.url || rawJobObj.canonicalUrl || "",
    canonicalUrl: rawJobObj.canonicalUrl || "",
    externalJobId: rawJobObj.externalJobId || "",
    createdAt: rawJobObj.createdAt,
    updatedAt: rawJobObj.updatedAt,
    isSaved,
    isViewed,

    requiredSkills: rawJobObj.requiredSkills || [],
    preferredSkills: rawJobObj.preferredSkills || [],
    softSkills: rawJobObj.softSkills || [],

    skills: {
      status: skillsStatus,
      required: requiredList,
      preferred: preferredList,
      soft: softList
    },

    matchScore: matchResult?.overallScore != null ? matchResult.overallScore : null,
    match: matchResult ? {
      score: matchResult.overallScore,
      matchedSkills: matchResult.matchedSkills || [],
      missingSkills: matchResult.missingSkills || [],
      partialSkills: matchResult.partialSkills || [],
      categoryScores: matchResult.categoryScores || {},
      analyzedAt: matchResult.createdAt
    } : null,

    recommendedResume: resume ? {
      id: String(resume._id),
      name: resume.name || `Version ${resume.version || 1}`,
      version: resume.version || 1
    } : null,

    application: application ? {
      id: String(application._id),
      applicationId: String(application._id),
      status: application.status,
      appliedAt: application.dateApplied || application.createdAt
    } : null,

    userState: {
      isSaved,
      isViewed
    }
  };
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
  const { MatchResult } = await import("../../models/MatchResult.js");
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

  const matchPipelineResult = await runMatchPipeline(resume?.structuredData || {}, extractedJd, candidateContext);

  // Persist MatchResult directly with jobId and userId
  if (resume) {
    try {
      await MatchResult.findOneAndUpdate(
        { userId, jobId: job._id },
        {
          userId,
          jobId: job._id,
          resumeId: resume._id,
          resumeHash: `res_${resume._id}`,
          jdHash: `job_${job._id}`,
          overallScore: matchPipelineResult.overallScore,
          categoryScores: matchPipelineResult.categoryScores || {},
          fitBreakdown: matchPipelineResult.fitBreakdown || {},
          matchedSkills: matchPipelineResult.matchedSkills || [],
          partialSkills: matchPipelineResult.partialSkills || [],
          missingSkills: matchPipelineResult.missingSkills || [],
          criticalGaps: matchPipelineResult.criticalGaps || [],
          explanation: matchPipelineResult.explanation || ""
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error("[jobService] Failed to persist MatchResult:", e.message);
    }
  }

  return {
    hasResume: !!resume,
    resumeId: resume?._id || null,
    resumeName: resume?.name || "Career Profile",
    ...matchPipelineResult
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
