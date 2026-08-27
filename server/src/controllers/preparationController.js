import * as preparationService from "../services/career/preparationService.js";

export const generateDailyPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetRole, generatedFor } = req.body;
    const plan = await preparationService.generateDailyPlan(userId, targetRole, generatedFor);
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
