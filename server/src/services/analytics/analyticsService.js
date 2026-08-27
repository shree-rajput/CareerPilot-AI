/**
 * Analytics service — all metrics derived from real MongoDB data only.
 * No AI, no invented stats. Everything is aggregated from the user's actual records.
 */

import { Application } from "../../models/Application.js";
import { MatchResult } from "../../models/MatchResult.js";
import { Resume } from "../../models/Resume.js";
import { User } from "../../models/User.js";
import { Rejection } from "../../models/Rejection.js";

const POSITIVE_STATUSES = ["oa", "interview", "offer"];
const ADVANCED_STATUSES = ["interview", "offer"];

/**
 * Dashboard summary stats for a user.
 * @param {string} userId
 */
export async function getDashboardStats(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [applications, matchResults, resumeCount, user, rejections] = await Promise.all([
    Application.find({ userId }).lean(),
    MatchResult.find({ userId }).lean(),
    Resume.countDocuments({ userId, isActive: true }),
    User.findById(userId).lean(),
    Rejection.find({ userId }).lean()
  ]);

  const total = applications.length;
  const thisMonth = applications.filter((a) => new Date(a.createdAt) >= startOfMonth).length;
  
  // Pipeline counts
  const pipeline = {
    saved: applications.filter(a => a.status === "saved").length,
    applied: applications.filter(a => a.status === "applied").length,
    interviewing: applications.filter(a => ADVANCED_STATUSES.includes(a.status)).length,
    offered: applications.filter(a => a.status === "offer").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  const applied = applications.filter((a) => a.status !== "saved").length;
  const positiveResponse = applications.filter((a) =>
    POSITIVE_STATUSES.includes(a.status)
  ).length;
  const interviews = pipeline.interviewing;
  const offers = pipeline.offered;

  const responseRate = applied > 0 ? Math.round((positiveResponse / applied) * 100) : 0;
  const interviewRate = positiveResponse > 0
    ? Math.round((interviews / positiveResponse) * 100)
    : 0;
  const offerRate = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;

  const scores = matchResults.map((m) => m.overallScore);
  const averageMatchScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

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
    
  // Primary Target Role
  const primaryRole = user?.targetRoles?.find(r => r.isPrimary) || user?.targetRoles?.[0] || null;

  // Calculate Deterministic Readiness Score (0-100)
  let readinessScore = 0;
  const breakdown = { profile: 0, resume: 0, match: 0, performance: 0 };
  
  if (primaryRole) breakdown.profile += 10;
  if (user?.technicalSkills?.length > 2 || primaryRole?.techStack?.length > 2) breakdown.profile += 10;
  readinessScore += breakdown.profile;
  
  if (resumeCount > 0) breakdown.resume = 20;
  readinessScore += breakdown.resume;
  
  if (averageMatchScore > 0) {
    breakdown.match = Math.round((averageMatchScore / 100) * 30);
    readinessScore += breakdown.match;
  }
  
  // Performance based on response rate
  if (applied > 0) {
    const cappedResponseRate = Math.min(responseRate, 20);
    breakdown.performance = Math.round((cappedResponseRate / 20) * 30);
    readinessScore += breakdown.performance;
  }

  // Rejection bottlenecks
  const stageRejections = rejections.reduce((acc, curr) => {
    acc[curr.stage] = (acc[curr.stage] || 0) + 1;
    return acc;
  }, {});

  const bottleneck = Object.entries(stageRejections).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Next Best Actions
  const priorities = [];
  if (!primaryRole) {
    priorities.push({ type: 'profile', text: 'Set a primary target role to focus your efforts.', action: '/profile' });
  } else if (resumeCount === 0) {
    priorities.push({ type: 'resume', text: 'Upload your first resume to match against jobs.', action: '/resume' });
  } else if (total === 0) {
    priorities.push({ type: 'apply', text: 'Save or track your first job application.', action: '/applications' });
  } else if (pipeline.applied === 0 && pipeline.saved > 0) {
    priorities.push({ type: 'apply', text: 'You have saved jobs. Apply to them to start your pipeline.', action: '/applications' });
  } else if (bottleneck === "resume_screen") {
    priorities.push({ type: 'resume', text: 'Your resume is not passing screening. Try tailoring it better or building new projects.', action: '/resume' });
  } else if (bottleneck === "oa") {
    priorities.push({ type: 'practice', text: 'You are failing Online Assessments. Focus heavily on practice.', action: '/interview' });
  } else if (topSkillGaps.length > 0) {
    priorities.push({ type: 'skill', text: `Work on missing skills like: ${topSkillGaps[0].skill}`, action: '/resume' });
  } else {
    priorities.push({ type: 'apply', text: 'Keep applying! Your pipeline looks healthy.', action: '/applications' });
  }

  const recentApplications = applications
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return {
    // Core Placement Command Center Data
    readiness: {
      score: readinessScore,
      breakdown
    },
    pipeline,
    primaryRole,
    priorities,
    recentApplications,
    bottleneck,
    
    // Legacy metrics
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

/**
 * Retrieves rejection intelligence for a user, highlighting bottlenecks and weak topics.
 */
export async function getRejectionIntelligence(userId) {
  const rejections = await Rejection.find({ userId }).lean();

  const stages = {};
  const weakTopics = {};

  rejections.forEach(r => {
    stages[r.stage] = (stages[r.stage] || 0) + 1;
    (r.weakTopics || []).forEach(t => {
      weakTopics[t] = (weakTopics[t] || 0) + 1;
    });
  });

  const sortedWeakTopics = Object.entries(weakTopics)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));

  const sortedStages = Object.entries(stages)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count }));

  return {
    totalRejections: rejections.length,
    bottleneckStage: sortedStages[0]?.stage || null,
    stageBreakdown: sortedStages,
    topWeakTopics: sortedWeakTopics.slice(0, 5)
  };
}
