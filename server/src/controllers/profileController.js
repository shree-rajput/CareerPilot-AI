import { asyncHandler } from "../utils/asyncHandler.js";
import { updateUserReadinessScore } from "../services/career/readinessService.js";
import { getNextBestActions, dismissAction, snoozeAction } from "../services/career/nextBestActionService.js";
import { UserSkill } from "../models/UserSkill.js";
import { normalizeSkill } from "../services/career/taxonomyService.js";

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

export const confirmExtractedProfile = asyncHandler(async (req, res) => {
  const { skills, targetRoles } = req.body;

  // Process and save skills to UserSkill with evidence
  if (Array.isArray(skills)) {
    for (const skillObj of skills) {
      const normalized = normalizeSkill(skillObj.name);
      if (!normalized) continue;

      const existingSkill = await UserSkill.findOne({
        userId: req.user._id,
        canonicalName: normalized.canonicalName
      });

      const newEvidence = {
        description: "Confirmed from AI Extraction",
        source: "resume",
        date: new Date(),
        weight: 1
      };

      if (existingSkill) {
        existingSkill.evidence.push(newEvidence);
        // Simple recalculation: max out at 95 confidence
        existingSkill.confidence = Math.min(95, existingSkill.confidence + 15);
        await existingSkill.save();
      } else {
        await UserSkill.create({
          userId: req.user._id,
          canonicalName: normalized.canonicalName,
          category: normalized.category,
          proficiency: 50,
          confidence: 60,
          evidence: [newEvidence]
        });
      }
    }
  }

  // Update target roles if provided
  if (Array.isArray(targetRoles) && targetRoles.length > 0) {
    const formattedRoles = targetRoles.map((role, idx) => ({
      title: role,
      techStack: [],
      isPrimary: idx === 0
    }));
    req.user.targetRoles = formattedRoles;
    await req.user.save();
  }
  
  await updateUserReadinessScore(req.user.id, "Confirmed AI Extracted Profile");

  return res.status(200).json({ success: true, message: "Profile updated from extraction", user: req.user.toSafeObject() });
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

