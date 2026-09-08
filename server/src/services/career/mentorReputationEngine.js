import { MentorReputation } from "../../models/MentorReputation.js";
import { MentorProfile } from "../../models/MentorProfile.js";
import { MentorshipReview } from "../../models/MentorshipReview.js";
import MentorshipSession from "../../models/MentorshipSession.js";
import { MentorFeedback } from "../../models/MentorFeedback.js";
import { MentorReport } from "../../models/MentorReport.js";
import { User } from "../../models/User.js";

/**
 * Calculates Bayesian confidence-weighted rating.
 * Formula: Weighted Rating = (v/(v+m)) * R + (m/(v+m)) * C
 * where v = number of reviews, m = minimum reviews threshold (3), R = average rating, C = prior average (4.5)
 */
export function calculateBayesianRating(reviewsCount, rawAverage, priorMean = 4.5, minThreshold = 3) {
  if (reviewsCount === 0) return priorMean;
  const v = reviewsCount;
  const m = minThreshold;
  return Number((((v / (v + m)) * rawAverage) + ((m / (v + m)) * priorMean)).toFixed(2));
}

/**
 * Recalculates full multi-dimensional reputation for a mentor and promotes/demotes state based on evidence.
 */
export async function updateMentorReputation(mentorUserId) {
  const mentorUser = await User.findById(mentorUserId);
  if (!mentorUser) return null;

  // 1. Fetch Session Counts
  const totalSessions = await MentorshipSession.countDocuments({ mentorId: mentorUserId });
  const completedSessions = await MentorshipSession.countDocuments({ mentorId: mentorUserId, status: "completed" });

  // 2. Fetch Structured Student Feedback
  const feedbacks = await MentorFeedback.find({ mentorId: mentorUserId }).lean();
  const reviews = await MentorshipReview.find({ mentorId: mentorUserId }).lean();

  let rawAverageRating = 5.0;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    rawAverageRating = sum / reviews.length;
  }

  const weightedRating = calculateBayesianRating(reviews.length, rawAverageRating);

  // 3. Repeat Students Calculation
  const studentSessionCounts = await MentorshipSession.aggregate([
    { $match: { mentorId: mentorUser._id, status: "completed" } },
    { $group: { _id: "$studentId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  const repeatStudentsCount = studentSessionCounts.length;

  // 4. Structured Signals (Problem Solved, Relevance, Rebooking)
  let problemSolvedYes = 0;
  let totalProblemSolved = 0;
  let relevantYes = 0;
  let rebookYes = 0;

  feedbacks.forEach(f => {
    if (f.problemSolved) {
      totalProblemSolved++;
      if (f.problemSolved === "yes") problemSolvedYes++;
    }
    if (f.wasRelevant) relevantYes++;
    if (f.wouldBookAgain) rebookYes++;
  });

  const problemResolutionRate = totalProblemSolved > 0
    ? Math.round((problemSolvedYes / totalProblemSolved) * 100)
    : 100;
  const relevanceRate = feedbacks.length > 0
    ? Math.round((relevantYes / feedbacks.length) * 100)
    : 100;
  const rebookingRate = feedbacks.length > 0
    ? Math.round((rebookYes / feedbacks.length) * 100)
    : 100;

  // 5. Reliability Calculation (No-Shows & Cancellations penalty)
  const missedByMentor = await MentorshipSession.countDocuments({
    mentorId: mentorUserId,
    isNoShow: "mentor"
  });
  const cancelledByMentor = await MentorshipSession.countDocuments({
    mentorId: mentorUserId,
    status: "cancelled",
    cancelledBy: mentorUserId
  });

  const penalty = (missedByMentor * 20) + (cancelledByMentor * 5);
  const reliabilityScore = Math.max(0, 100 - penalty);

  // 6. Check Active Unresolved Reports/Complaints
  const activeReportsCount = await MentorReport.countDocuments({
    mentorId: mentorUserId,
    status: { $in: ["pending", "under_investigation"] }
  });

  // 7. Progressive Trust State Evaluation
  let trustLevel = "probation";

  if (mentorUser.mentorStatus === "suspended" || mentorUser.mentorStatus === "restricted") {
    trustLevel = mentorUser.mentorStatus;
  } else if (activeReportsCount > 0) {
    trustLevel = "restricted";
    mentorUser.mentorStatus = "restricted";
    await mentorUser.save();
  } else if (completedSessions >= 25 && weightedRating >= 4.6 && repeatStudentsCount >= 3 && reliabilityScore >= 90) {
    trustLevel = "trusted";
    mentorUser.mentorStatus = "trusted";
    await mentorUser.save();
  } else if (completedSessions >= 5 && weightedRating >= 4.4 && reliabilityScore >= 80) {
    trustLevel = "verified";
    mentorUser.mentorStatus = "verified";
    await mentorUser.save();
  } else {
    trustLevel = "probation";
    if (mentorUser.mentorStatus !== "probation" && !["restricted", "suspended"].includes(mentorUser.mentorStatus)) {
      mentorUser.mentorStatus = "probation";
      await mentorUser.save();
    }
  }

  // 8. Update or Upsert MentorReputation Document
  const reputation = await MentorReputation.findOneAndUpdate(
    { mentorId: mentorUserId },
    {
      mentorId: mentorUserId,
      overallRating: weightedRating,
      totalSessions,
      completedSessions,
      repeatStudentsCount,
      problemResolutionRate,
      relevanceRate,
      rebookingRate,
      reliabilityScore,
      trustLevel,
      lastCalculatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  // 9. Update MentorProfile & User cache
  const maxWeekly = trustLevel === "probation" ? 5 : (trustLevel === "trusted" ? 20 : 10);
  await MentorProfile.findOneAndUpdate(
    { userId: mentorUserId },
    {
      rating: weightedRating,
      reviewsCount: reviews.length,
      completedSessionsCount: completedSessions,
      reputationStatus: trustLevel,
      maxWeeklySessions: maxWeekly
    }
  );

  await User.findByIdAndUpdate(mentorUserId, {
    "mentorProfile.rating": weightedRating,
    "mentorProfile.reviewsCount": reviews.length,
    "mentorProfile.completedSessions": completedSessions
  });

  return reputation;
}
