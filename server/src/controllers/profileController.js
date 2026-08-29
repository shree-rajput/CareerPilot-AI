import { asyncHandler } from "../utils/asyncHandler.js";
import { updateUserReadinessScore } from "../services/career/readinessService.js";
import { getNextBestActions, dismissAction, snoozeAction } from "../services/career/nextBestActionService.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    "name",
    "phone",
    "education",
    "targetRoles",
    "targetCompanies",
    "preferredLocations",
    "experienceLevel",
    "technicalSkills",
    "primaryTechStack",
    "interviewPreferences"
  ];

  for (const key of allowedUpdates) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      req.user[key] = req.body[key];
    }
  }

  await req.user.save();
  await updateUserReadinessScore(req.user.id, "Updated Profile Info");

  return res.status(200).json({ user: req.user.toSafeObject() });
});

export const getReadiness = asyncHandler(async (req, res) => {
  const user = await updateUserReadinessScore(req.user.id, "Readiness Check");
  return res.status(200).json({
    success: true,
    readinessScore: user.readinessScore,
    readinessBreakdown: user.readinessBreakdown,
    readinessHistory: user.readinessHistory
  });
});

export const getActions = asyncHandler(async (req, res) => {
  const actions = await getNextBestActions(req.user.id);
  return res.status(200).json({
    success: true,
    data: actions
  });
});

export const dismissUserAction = asyncHandler(async (req, res) => {
  const { actionId } = req.params;
  const actions = await dismissAction(req.user.id, actionId);
  return res.status(200).json({
    success: true,
    data: actions,
    message: "Action dismissed successfully"
  });
});

export const snoozeUserAction = asyncHandler(async (req, res) => {
  const { actionId } = req.params;
  const { hours } = req.body;
  const actions = await snoozeAction(req.user.id, actionId, hours || 24);
  return res.status(200).json({
    success: true,
    data: actions,
    message: "Action snoozed successfully"
  });
});

