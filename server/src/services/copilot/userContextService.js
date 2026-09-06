import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import { Application } from "../../models/Application.js";
import { MatchResult } from "../../models/MatchResult.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { InterviewQuestion } from "../../models/InterviewQuestion.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { getCareerIntelligence } from "../career/careerIntelligenceService.js";
import { getNextBestActions } from "../career/nextBestActionService.js";

/**
 * UserContextService
 * Central registry for targeted fetching of candidate data for Copilot.
 * 
 * Design Principles:
 * 1. Fetch only what is requested.
 * 2. Return data in a compact, structured format optimized for LLM context.
 */

export async function getProfile(userId) {
  const user = await User.findById(userId).select("name email experienceLevel").lean();
  return user ? {
    name: user.name || "Candidate",
    email: user.email || "",
    experienceLevel: user.experienceLevel || "Student / Entry-level"
  } : null;
}

export async function getCareerGoals(userId) {
  const user = await User.findById(userId).select("targetRoles targetCompanies preferredLocations placementDeadline readinessScore readinessBreakdown").lean();
  return user ? {
    targetRoles: user.targetRoles || [],
    targetCompanies: user.targetCompanies || [],
    preferredLocations: user.preferredLocations || [],
    placementDeadline: user.placementDeadline ? new Date(user.placementDeadline).toDateString() : "Not specified",
    overallReadinessScore: user.readinessScore ?? 0,
    readinessBreakdown: user.readinessBreakdown || {}
  } : null;
}

export async function getTargetRoles(userId) {
  const user = await User.findById(userId).select("targetRoles").lean();
  return user?.targetRoles || [];
}

export async function getSkills(userId) {
  // Can expand to use UserSkill collection if needed
  const user = await User.findById(userId).select("technicalSkills").lean();
  return user?.technicalSkills || [];
}

export async function getSkillGaps(userId) {
  const intel = await getCareerIntelligence(userId).catch(() => null);
  if (!intel || !intel.skillGaps) return [];
  
  return intel.skillGaps.map(g => ({
    skill: g.skill,
    status: g.status, // strong | needs_improvement | missing
    priority: g.priority, // high | medium | low
    evidence: g.evidence || "",
    whyItMatters: g.whyItMatters || ""
  }));
}

export async function getResume(userId) {
  const resume = await Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).lean();
  if (!resume) return null;

  const structuredData = resume.structuredData || {};
  return {
    fileName: resume.name || "Resume",
    atsScore: resume.atsScore ?? resume.healthIndicators?.ats ?? null,
    healthIndicators: resume.healthIndicators || {},
    missingSkills: resume.missingSkills || [],
    summary: structuredData.summary || "",
    skills: (structuredData.skills || []).map(s => typeof s === "string" ? { name: s } : {
      name: s.canonicalName || s.name,
      category: s.category,
      proficiency: s.proficiency
    }),
    experience: (structuredData.experience || []).map(e => ({
      company: e.company || "",
      role: e.role || "",
      duration: `${e.startDate || ""} - ${e.endDate || ""}`,
      description: (e.description || "").substring(0, 150)
    })),
    education: structuredData.education || []
  };
}

export async function getResumeAnalysis(userId) {
  const resume = await Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).select("healthIndicators atsScore missingSkills").lean();
  if (!resume) return null;
  return {
    atsScore: resume.atsScore ?? resume.healthIndicators?.ats ?? null,
    contentScore: resume.healthIndicators?.content ?? null,
    clarityScore: resume.healthIndicators?.clarity ?? null,
    missingSkills: resume.missingSkills || []
  };
}

export async function getProjects(userId) {
  const resume = await Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).select("structuredData.projects").lean();
  if (!resume || !resume.structuredData || !resume.structuredData.projects) return [];

  return resume.structuredData.projects.map(p => ({
    name: p.name || "Project",
    description: (p.description || "").substring(0, 150),
    problemSolved: (p.problemSolved || "").substring(0, 100),
    technologies: p.technologies || [],
    role: p.role || ""
  }));
}

export async function getApplications(userId, limit = 5) {
  const apps = await Application.find({ userId }).sort({ updatedAt: -1 }).limit(limit).lean();
  return apps.map(app => ({
    id: app._id,
    company: app.company,
    role: app.role,
    status: app.status,
    appliedAt: app.appliedAt,
    lastUpdated: app.updatedAt
  }));
}

export async function getApplication(userId, applicationId) {
  if (!applicationId) return null;
  const app = await Application.findOne({ _id: applicationId, userId }).lean();
  if (!app) return null;
  
  return {
    id: app._id,
    company: app.company,
    role: app.role,
    status: app.status,
    appliedAt: app.appliedAt,
    jobDescription: app.jobDescription ? app.jobDescription.substring(0, 300) : null,
    requiredSkills: app.extractedJd?.requiredSkills || []
  };
}

export async function getMatchResult(userId, applicationId) {
  if (!applicationId) return null;
  const match = await MatchResult.findOne({ 
    userId, 
    $or: [{ applicationId: applicationId }, { jobId: applicationId }] 
  }).lean();
  if (!match) return null;

  return {
    overallScore: match.overallScore,
    matchedSkills: match.matchedSkills || [],
    missingSkills: match.missingSkills || [],
    suggestions: match.suggestions || []
  };
}

export async function getInterviewHistory(userId, limit = 5) {
  const sessions = await InterviewSession.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  
  let weaknesses = [];
  if (sessions.length > 0) {
    const sessionIds = sessions.map(s => s._id);
    const questions = await InterviewQuestion.find({ sessionId: { $in: sessionIds } }).lean();
    
    for (const q of questions) {
      const acc = q.analysis?.technicalAccuracy ?? 0;
      if (acc > 0 && acc < 60) {
        weaknesses.push({
          category: q.category || "General",
          question: q.questionText,
          accuracyScore: acc,
          feedback: q.analysis?.feedbackSummary || "Needs technical depth"
        });
      }
    }
  }

  return {
    totalSessions: sessions.length,
    recentSessions: sessions.map(s => ({
      id: s._id,
      title: s.title || s.type || "Interview",
      score: s.overallScore ?? s.score ?? null,
      date: s.createdAt ? new Date(s.createdAt).toDateString() : null
    })),
    recentWeaknesses: weaknesses.slice(0, 5)
  };
}

export async function getPreparationProgress(userId) {
  const activePlan = await PreparationPlan.findOne({ userId, isActive: true }).lean();
  if (!activePlan) return null;

  return {
    targetRole: activePlan.targetRole || "General",
    totalTasks: activePlan.actionItems?.length || 0,
    completedTasks: (activePlan.actionItems || []).filter(i => i.status === "completed").length,
    pendingPriorityTasks: (activePlan.actionItems || [])
      .filter(i => i.status === "pending")
      .map(i => ({ title: i.title, priority: i.priority, timeMinutes: i.estimatedTimeMinutes }))
  };
}

export async function getDashboardAnalytics(userId) {
  const [user, apps, sessions, actions] = await Promise.all([
    User.findById(userId).select("readinessScore targetRoles").lean(),
    Application.find({ userId }).select("status").lean(),
    InterviewSession.find({ userId }).select("overallScore").lean(),
    getNextBestActions(userId).catch(() => [])
  ]);

  const activeApps = apps.filter(a => !['rejected', 'withdrawn', 'offer_accepted'].includes(a.status)).length;
  const interviewingApps = apps.filter(a => a.status === 'interviewing').length;

  return {
    readinessScore: user?.readinessScore ?? null,
    targetRoles: user?.targetRoles || [],
    applications: {
      active: activeApps,
      interviewing: interviewingApps,
      total: apps.length
    },
    interviewsCompleted: sessions.length,
    nextBestActions: (actions || []).slice(0, 3).map(a => ({
      title: a.title,
      priority: a.priority
    }))
  };
}

/**
 * Registry of available data sources mapping string keys to fetching functions
 */
export const ContextSources = {
  profile: getProfile,
  careerGoals: getCareerGoals,
  targetRoles: getTargetRoles,
  skills: getSkills,
  skillGaps: getSkillGaps,
  resume: getResume,
  resumeAnalysis: getResumeAnalysis,
  projects: getProjects,
  applications: getApplications,
  application: getApplication, // requires entityId
  matchResult: getMatchResult, // requires entityId
  interviewHistory: getInterviewHistory,
  preparationProgress: getPreparationProgress,
  dashboardAnalytics: getDashboardAnalytics
};
