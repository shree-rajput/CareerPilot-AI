import * as skillService from "../services/career/skillService.js";

export const normalizeSkill = async (req, res, next) => {
  try {
    const { skillName } = req.body;
    const skill = await skillService.normalizeSkill(skillName);
    res.status(200).json({ status: "success", data: skill });
  } catch (error) {
    next(error);
  }
};

export const updateUserSkill = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { skillName, proficiencyDelta, confidenceDelta, source } = req.body;
    const userSkill = await skillService.updateUserSkill(userId, skillName, { proficiencyDelta, confidenceDelta, source });
    res.status(200).json({ status: "success", data: userSkill });
  } catch (error) {
    next(error);
  }
};

export const calculateSkillGaps = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetSkills } = req.body;
    const gaps = await skillService.calculateSkillGaps(userId, targetSkills);
    res.status(200).json({ status: "success", data: gaps });
  } catch (error) {
    next(error);
  }
};

export const getUserSkills = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const skills = await skillService.getUserSkills(userId);
    res.status(200).json({ status: "success", data: skills });
  } catch (error) {
    next(error);
  }
};
