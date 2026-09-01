import * as preparationService from "../services/career/preparationService.js";

export const getPreparationDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dashboard = await preparationService.getPreparationDashboard(userId);
    res.status(200).json({ status: "success", data: dashboard });
  } catch (error) {
    next(error);
  }
};

export const updateSkillStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skillName } = req.params;
    const { status } = req.body;
    const result = await preparationService.updateSkillStatus(userId, skillName, status);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const toggleActionPlanStep = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skillName } = req.params;
    const { stepNumber, completed } = req.body;
    const result = await preparationService.toggleActionPlanStep(userId, skillName, stepNumber, completed);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const generateSkillVerificationAssessment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skillName } = req.params;
    const assessment = await preparationService.generateSkillVerificationAssessment(userId, skillName);
    res.status(200).json({ status: "success", data: assessment });
  } catch (error) {
    next(error);
  }
};

export const submitSkillVerificationAssessment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skillName } = req.params;
    const { answers } = req.body;
    const result = await preparationService.submitSkillVerificationAssessment(userId, skillName, answers);
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
};

export const generateDailyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetRole, generatedFor } = req.body;
    const plan = await preparationService.generateDailyPlan(userId, { targetRole, generatedFor });
    res.status(201).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const updateActionItemStatus = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { status } = req.body;
    const plan = await preparationService.updateActionItemStatus(id, itemId, status);
    res.status(200).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const getActivePlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const plan = await preparationService.getActivePlan(userId);
    res.status(200).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const archivePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await preparationService.archivePlan(id);
    res.status(200).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};
