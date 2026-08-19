/**
 * Analytics service — all metrics derived from real MongoDB data only.
 * No AI, no invented stats. Everything is aggregated from the user's actual records.
 */

import { Application } from "../../models/Application.js";
import { MatchResult } from "../../models/MatchResult.js";
import { Resume } from "../../models/Resume.js";

const POSITIVE_STATUSES = ["oa", "interview", "offer"];
const ADVANCED_STATUSES = ["interview", "offer"];

/**
 * Dashboard summary stats for a user.
 * @param {string} userId
 */
export async function getDashboardStats(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [applications, matchResults, resumeCount] = await Promise.all([
    Application.find({ userId }).lean(),
    MatchResult.find({ userId }).lean(),
    Resume.countDocuments({ userId, isActive: true })
  ]);

  const total = applications.length;
  const thisMonth = applications.filter((a) => new Date(a.createdAt) >= startOfMonth).length;
  const applied = applications.filter((a) => a.status !== "saved").length;
  const positiveResponse = applications.filter((a) =>
    POSITIVE_STATUSES.includes(a.status)
  ).length;
  const interviews = applications.filter((a) =>
    ADVANCED_STATUSES.includes(a.status)
  ).length;
  const offers = applications.filter((a) => a.status === "offer").length;

  const responseRate = applied > 0 ? Math.round((positiveResponse / applied) * 100) : 0;
  const interviewRate = positiveResponse > 0
    ? Math.round((interviews / positiveResponse) * 100)
    : 0;
  const offerRate = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;

  const scores = matchResults.map((m) => m.overallScore);
  const averageMatchScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  // Top missing skill gaps across all match results
  const gapCounts = {};
  for (const mr of matchResults) {
    for (const skill of mr.missingSkills || []) {
      gapCounts[skill] = (gapCounts[skill] || 0) + 1;
    }
  }
  const topSkillGaps = Object.entries(gapCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));

  return {
    total,
    thisMonth,
    applied,
    responseRate,
    interviews,
    interviewRate,
    offers,
    offerRate,
    averageMatchScore,
    resumeVersions: resumeCount,
    topSkillGaps
  };
}

/**
 * Application trend by month (last 6 months).
 */
export async function getApplicationTrends(userId) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const results = await Application.aggregate([
    { $match: { userId, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  return results.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    applications: r.count
  }));
}

/**
 * Status distribution.
 */
export async function getStatusDistribution(userId) {
  const results = await Application.aggregate([
    { $match: { userId } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  return results.map((r) => ({ status: r._id, count: r.count }));
}
