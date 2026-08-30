import * as jobService from "../services/career/jobService.js";

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
      userId: req.user._id
    });

    // Attach isSaved flag per job for the authenticated user
    const userId = String(req.user._id);
    const jobsWithSaved = jobs.map(job => ({
      ...job.toObject(),
      isSaved: job.savedBy?.some(id => String(id) === userId) || false
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
    jobObj.isSaved = job.savedBy?.some(id => String(id) === userId) || false;
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
    const job = await jobService.deactivateJob(req.params.id);
    res.status(200).json({ status: "success", data: job });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/:id/save
 * Toggle save/bookmark a job for the authenticated user.
 */
export const saveJob = async (req, res, next) => {
  try {
    const result = await jobService.toggleSaveJob(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/:id/match
 * Run the AI match pipeline against the user's latest resume,
 * without creating an application.
 */
export const matchJob = async (req, res, next) => {
  try {
    const result = await jobService.matchJobToProfile(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/:id/should-apply
 * Returns a verdict: APPLY | MAYBE | LOW_PRIORITY with reasoning.
 */
export const shouldApply = async (req, res, next) => {
  try {
    const result = await jobService.shouldApplyRecommendation(req.params.id, req.user._id);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};
