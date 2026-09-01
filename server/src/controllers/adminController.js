import { User } from "../models/User.js";
import { createError } from "../utils/error.js";
import { createNotification } from "../services/notification/notificationService.js";

/**
 * Gets list of mentors pending verification.
 */
export async function getPendingMentors(req, res, next) {
  try {
    const mentors = await User.find({
      mentorStatus: { $in: ["pending", "under_review"] }
    })
      .select("name email avatar mentorStatus mentorProfile createdAt")
      .lean();

    res.status(200).json({
      success: true,
      data: mentors
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies or updates mentor status (approved, verified, rejected, suspended).
 */
export async function updateMentorVerification(req, res, next) {
  try {
    const { mentorId } = req.params;
    const { status, notes } = req.body; // status: 'approved', 'verified', 'rejected', 'suspended'

    const allowed = ["approved", "verified", "rejected", "suspended", "under_review"];
    if (!allowed.includes(status)) {
      return next(createError(400, `Invalid verification status. Allowed: ${allowed.join(", ")}`));
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return next(createError(404, "Mentor user not found."));
    }

    mentor.mentorStatus = status;
    await mentor.save();

    // Trigger notification to mentor
    const isApprovedOrVerified = status === "approved" || status === "verified";
    await createNotification({
      userId: mentorId,
      type: isApprovedOrVerified ? "MENTOR_ACCEPTED" : "MENTOR_REJECTED",
      title: isApprovedOrVerified ? "Mentor Verification Approved! 🎉" : "Mentor Application Update",
      message: isApprovedOrVerified
        ? `Congratulations ${mentor.name}! Your mentor profile has been verified. You can now accept student bookings.`
        : `Your mentor application status has been updated to ${status}. ${notes || ""}`,
      entityType: "mentor_verification",
      actionUrl: "/mentor/dashboard"
    });

    res.status(200).json({
      success: true,
      data: mentor.toSafeObject(),
      message: `Mentor verification status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
}
