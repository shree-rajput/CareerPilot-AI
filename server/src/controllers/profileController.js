import { asyncHandler } from "../utils/asyncHandler.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    "name",
    "phone",
    "education",
    "targetRoles",
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

  return res.status(200).json({ user: req.user.toSafeObject() });
});
