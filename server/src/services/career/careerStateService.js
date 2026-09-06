import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import { Application } from "../../models/Application.js";
import { UserSkill } from "../../models/UserSkill.js";
import { Project } from "../../models/Project.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import CodingSubmission from "../../models/CodingSubmission.js";
import { MatchResult } from "../../models/MatchResult.js";

/**
 * Builds the Canonical Career State for a candidate.
 * Unifies all user signals into one structured, evidence-backed read model.
 * 
 * @param {string} userId - Mongo ObjectId string of the user
 * @returns {Promise<Object>} Canonical Career State
 */
export async function getCanonicalCareerState(userId) {
  const [
    user,
    resumes,
    applications,
    userSkills,
    projects,
    interviews,
    prepPlans,
    codingSubmissions,
    matchResults
  ] = await Promise.all([
    User.findById(userId).lean(),
    Resume.find({ userId }).sort({ createdAt: -1 }).lean(),
    Application.find({ userId }).sort({ createdAt: -1 }).lean(),
    UserSkill.find({ userId }).lean(),
    Project.find({ userId }).sort({ relevance: -1, createdAt: -1 }).lean(),
    InterviewSession.find({ userId }).sort({ createdAt: -1 }).lean(),
    PreparationPlan.find({ userId }).sort({ createdAt: -1 }).lean(),
    CodingSubmission.find({ candidateId: userId }).sort({ createdAt: -1 }).lean(),
    MatchResult.find({ userId }).sort({ createdAt: -1 }).lean()
  ]);

  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  // Active Resume Selection
  const activeResume = resumes.find(r => r.isActive) || resumes[0] || null;

  // Primary Role & Target Info
  const primaryRole = (user.targetRoles || []).find(r => r.isPrimary) || user.targetRoles?.[0] || {
    title: "Software Engineer",
    techStack: ["JavaScript", "React", "Node.js"]
  };

  const targetRoles = (user.targetRoles || []).map(r => r.title || r).filter(Boolean);
  const targetCompanies = user.targetCompanies || [];
  const targetLocations = user.targetLocations || [];

  // Skill Classification by Provenance & Evidence
  const verifiedSkills = [];
  const derivedSkills = [];
  const inferredSkills = [];
  const unknownSkills = [];

  for (const skill of userSkills) {
    const prov = skill.provenance || "DERIVED";
    const item = {
      name: skill.canonicalName,
      category: skill.category || "other",
      proficiency: skill.proficiency || 0,
      confidence: skill.confidence || 0,
      provenance: prov,
      status: skill.status || "NOT_STARTED",
      evidenceCount: (skill.evidence || []).length,
      lastUpdated: skill.lastUpdated || skill.updatedAt
    };

    if (prov === "VERIFIED" || skill.status === "VERIFIED") {
      verifiedSkills.push(item);
    } else if (prov === "DERIVED") {
      derivedSkills.push(item);
    } else if (prov === "INFERRED") {
      inferredSkills.push(item);
    } else {
      unknownSkills.push(item);
    }
  }

  // Application Pipeline Metrics
  const activeApplications = applications.filter(a => !["rejected", "withdrawn"].includes(a.status));
  const rejectedApplications = applications.filter(a => a.status === "rejected");
  const interviewStageApps = applications.filter(a => ["screening", "oa", "interview", "offer"].includes(a.status));

  // Active Preparation Plan
  const activePrepPlan = prepPlans.find(p => p.isActive) || prepPlans[0] || null;
  const pendingPrepTasks = activePrepPlan?.actionItems?.filter(item => item.status === "pending") || [];
  const completedPrepTasks = activePrepPlan?.actionItems?.filter(item => item.status === "completed") || [];

  // Coding Practice Summary
  const passedSubmissions = codingSubmissions.filter(s => s.status === "completed" || s.verdict === "ACCEPTED");

  // Historical Interview Metrics
  const completedInterviews = interviews.filter(i => i.status === "completed");
  const interviewScores = completedInterviews.map(i => i.overallScore || 0).filter(s => s > 0);
  const avgInterviewScore = interviewScores.length > 0
    ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length)
    : 0;

  return {
    profile: {
      userId: user._id,
      name: user.name,
      email: user.email,
      experienceLevel: user.experienceLevel || "fresher",
      targetRoles,
      primaryRoleTitle: primaryRole.title || "Software Engineer",
      primaryTechStack: primaryRole.techStack || user.technicalSkills || [],
      targetCompanies,
      targetLocations,
      careerDeadline: user.careerDeadline || null,
      availablePrepMinutesPerDay: user.availablePrepMinutesPerDay || 45,
      readinessScore: user.readinessScore || 0,
      readinessBreakdown: user.readinessBreakdown || null
    },
    resume: {
      hasResume: Boolean(activeResume),
      resumeId: activeResume?._id || null,
      atsScore: activeResume?.healthIndicators?.ats || 0,
      skillsFoundCount: activeResume?.structuredData?.skills?.length || 0,
      projectsCount: activeResume?.structuredData?.projects?.length || 0,
      updatedAt: activeResume?.updatedAt || null
    },
    skills: {
      total: userSkills.length,
      verified: verifiedSkills,
      derived: derivedSkills,
      inferred: inferredSkills,
      unknown: unknownSkills,
      allNames: userSkills.map(s => s.canonicalName)
    },
    projects: {
      count: projects.length,
      items: projects.map(p => ({
        id: p._id,
        name: p.name,
        technologies: p.technologies || [],
        complexity: p.complexity || "medium",
        confidence: p.confidence || 70,
        evidenceSource: p.evidenceSource || "user"
      }))
    },
    applications: {
      total: applications.length,
      activeCount: activeApplications.length,
      interviewStageCount: interviewStageApps.length,
      rejectedCount: rejectedApplications.length,
      items: applications.slice(0, 10).map(a => ({
        id: a._id,
        company: a.company,
        role: a.role,
        status: a.status,
        dateApplied: a.dateApplied || a.createdAt,
        lastActivityAt: a.lastActivityAt || a.updatedAt
      }))
    },
    interviews: {
      totalSessions: interviews.length,
      completedCount: completedInterviews.length,
      avgScore: avgInterviewScore,
      latestSession: completedInterviews[0] ? {
        id: completedInterviews[0]._id,
        targetRole: completedInterviews[0].targetRole,
        overallScore: completedInterviews[0].overallScore,
        completedAt: completedInterviews[0].completedAt
      } : null
    },
    preparation: {
      hasActivePlan: Boolean(activePrepPlan),
      planId: activePrepPlan?._id || null,
      pendingCount: pendingPrepTasks.length,
      completedCount: completedPrepTasks.length,
      streakDays: activePrepPlan?.streakDays || 0
    },
    coding: {
      totalSubmissions: codingSubmissions.length,
      passedCount: passedSubmissions.length
    },
    matches: {
      totalMatches: matchResults.length,
      topMatches: matchResults.slice(0, 3).map(m => ({
        id: m._id,
        applicationId: m.applicationId,
        overallScore: m.overallScore,
        matchedSkills: m.matchedSkills || [],
        missingSkills: m.missingSkills || []
      }))
    },
    timestamp: new Date().toISOString()
  };
}
