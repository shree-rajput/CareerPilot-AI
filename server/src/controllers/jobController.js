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
    const jobs = await jobService.getJobs(req.query);
    res.status(200).json({ status: "success", data: jobs });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({ status: "success", data: job });
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
