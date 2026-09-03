import * as projectService from "../services/career/projectService.js";

export const createProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const project = await projectService.createProject(userId, req.body);
    res.status(201).json({ status: "success", data: project });
  } catch (error) {
    next(error);
  }
};

export const generateInterviewKit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await projectService.generateInterviewKit(id);
    res.status(200).json({ status: "success", data: kit });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projects = await projectService.getProjects(userId);
    res.status(200).json({ status: "success", data: projects });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.status(200).json({ status: "success", data: project });
  } catch (error) {
    next(error);
  }
};

export const askCodebase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { query, codeSnippet } = req.body;
    
    // dynamically import projectIntelligence to avoid circular dependencies if any
    const { askMyCodebase } = await import("../services/ai/projectIntelligence.js");
    
    const answer = await askMyCodebase(id, req.user.id, query, codeSnippet);
    res.status(200).json({ status: "success", data: answer });
  } catch (error) {
    next(error);
  }
};

export const realityCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { claims } = req.body;
    
    const { generateRealityCheck } = await import("../services/ai/projectIntelligence.js");
    
    const result = await generateRealityCheck(id, req.user.id, claims || []);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const syncProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const synced = await projectService.syncProjectsFromResume(userId);
    res.status(200).json({ status: "success", data: synced });
  } catch (error) {
    next(error);
  }
};
