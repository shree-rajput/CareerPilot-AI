import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import { Application } from "../../models/Application.js";
import { MatchResult } from "../../models/MatchResult.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { InterviewQuestion } from "../../models/InterviewQuestion.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { getNextBestActions } from "./nextBestActionService.js";

/**
 * Builds a comprehensive, multi-layer candidate intelligence context.
 * 
 * @param {string} userId - Candidate User ID
 * @param {string} intent - Optional intent classifier: 'resume' | 'skills' | 'projects' | 'jobs' | 'interviews' | 'preparation' | 'career'
 * @returns {Promise<Object>} Candidate Intelligence Context Object
 */
export async function getCandidateIntelligenceContext(userId, intent = "career") {
  try {
    const [
      user,
      latestResume,
      activeApplications,
      matchResults,
      interviewSessions,
      activePlan,
      careerIntel,
      nextBestActions
    ] = await Promise.all([
      User.findById(userId).catch(() => null),
      Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).catch(() => null),
      Application.find({ userId }).sort({ createdAt: -1 }).limit(5).catch(() => []),
      MatchResult.find({ userId }).sort({ createdAt: -1 }).limit(5).catch(() => []),
      InterviewSession.find({ userId }).sort({ createdAt: -1 }).limit(5).catch(() => []),
      PreparationPlan.findOne({ userId, isActive: true }).catch(() => null),
      getCareerIntelligence(userId).catch(() => null),
      getNextBestActions(userId).catch(() => [])
    ]);

  // Fetch interview question details if sessions exist
  let interviewWeaknesses = [];
  let pastQuestionsSummary = [];
  if (interviewSessions && interviewSessions.length > 0) {
    const sessionIds = interviewSessions.map(s => s._id);
    const questions = await InterviewQuestion.find({ sessionId: { $in: sessionIds } }).lean();
    
    for (const q of questions) {
      const acc = q.analysis?.technicalAccuracy ?? 0;
      if (acc > 0 && acc < 60) {
        interviewWeaknesses.push({
          category: q.category || "General",
          question: q.questionText,
          accuracyScore: acc,
          feedback: q.analysis?.feedbackSummary || "Needs technical depth",
          missedConcepts: q.expectedConcepts || []
        });
      }
      pastQuestionsSummary.push({
        category: q.category,
        accuracyScore: acc
      });
    }
  }

  // 1. Identity & Career Profile
  const careerProfile = {
    name: user?.name || "Candidate",
    email: user?.email || "",
    experienceLevel: user?.experienceLevel || "Student / Entry-level",
    targetRoles: user?.targetRoles || [],
    targetCompanies: user?.targetCompanies || [],
    preferredLocations: user?.preferredLocations || [],
    placementDeadline: user?.placementDeadline ? new Date(user.placementDeadline).toDateString() : "Not specified",
    overallReadinessScore: user?.readinessScore ?? 0,
    readinessBreakdown: user?.readinessBreakdown || {}
  };

  // 2. Structured Resume Intelligence
  const structuredData = latestResume?.structuredData || {};
  const resumeIntelligence = latestResume ? {
    fileName: latestResume.name || "Resume",
    atsScore: latestResume.atsScore ?? latestResume.healthIndicators?.ats ?? null,
    contentScore: latestResume.healthIndicators?.content ?? null,
    clarityScore: latestResume.healthIndicators?.clarity ?? null,
    healthIndicators: latestResume.healthIndicators || {},
    missingSkills: latestResume.missingSkills || [],
    
    // Explicit extracted data
    summary: structuredData.summary || "",
    skills: (structuredData.skills || []).map(s => typeof s === "string" ? { name: s, proficiency: "emerging" } : {
      name: s.canonicalName || s.name,
      category: s.category || "other",
      source: s.source || "skills_section",
      proficiency: s.proficiency || "emerging",
      evidence: s.evidence || "Listed in resume"
    }),
    projects: (structuredData.projects || []).map(p => ({
      name: p.name || "Project",
      description: (p.description || "").substring(0, 150),
      problemSolved: (p.problemSolved || "").substring(0, 100),
      technicalComplexity: (p.technicalComplexity || "").substring(0, 100),
      userImpact: (p.userImpact || "").substring(0, 100),
      technologies: p.technologies || [],
      role: p.role || "",
      link: p.link || ""
    })),
    experience: (structuredData.experience || []).map(e => ({
      company: e.company || "",
      role: e.role || "",
      duration: `${e.startDate || ""} - ${e.endDate || ""}`,
      description: (e.description || "").substring(0, 150)
    })),
    education: structuredData.education || [],
    certifications: structuredData.certifications || [],
    achievements: structuredData.achievements || []
  } : null;

  // 3. Skill Gap Analysis
  const skillGaps = (careerIntel?.skillGaps || []).map(g => ({
    skill: g.skill,
    status: g.status, // strong | needs_improvement | missing
    classification: g.classification || (g.status === 'strong' ? 'proven' : g.status === 'missing' ? 'missing_evidence' : 'evidence_found'),
    priority: g.priority, // high | medium | low
    evidence: g.evidence || "",
    whyItMatters: g.whyItMatters || "",
    recommendedTopics: g.recommendedTopics || [],
    practiceRecommendation: g.practiceRecommendation || ""
  }));

  // 4. Job & Application Intelligence
  const applications = activeApplications.map(app => {
    const match = matchResults.find(m => String(m.applicationId) === String(app._id) || String(m.jobId) === String(app._id));
    return {
      company: app.company,
      role: app.role,
      status: app.status,
      matchScore: match?.overallScore ?? null,
      matchedSkills: match?.matchedSkills || [],
      missingSkills: match?.missingSkills || app.extractedJd?.requiredSkills || [],
      keyRequirements: app.extractedJd?.requiredSkills || []
    };
  });

  // 5. Interview Performance Intelligence
  const interviewIntelligence = {
    totalSessions: interviewSessions.length,
    recentSessions: interviewSessions.map(s => ({
      title: s.title || s.type || "Interview",
      mode: s.type || "solo",
      score: s.overallScore ?? s.score ?? null,
      date: s.createdAt ? new Date(s.createdAt).toDateString() : null
    })),
    weaknesses: interviewWeaknesses.slice(0, 5),
    pastQuestionsSummary: pastQuestionsSummary.slice(0, 10)
  };

  // 6. Preparation Intelligence
  const preparationIntelligence = activePlan ? {
    targetRole: activePlan.targetRole || "General",
    generatedFor: activePlan.generatedFor || "General",
    totalTasks: activePlan.actionItems?.length || 0,
    completedTasks: (activePlan.actionItems || []).filter(i => i.status === "completed").length,
    pendingPriorityTasks: (activePlan.actionItems || [])
      .filter(i => i.status === "pending")
      .map(i => ({ title: i.title, priority: i.priority, reason: i.reason, timeMinutes: i.estimatedTimeMinutes }))
  } : null;

  // 7. Next Best Actions
  const topNextBestActions = (nextBestActions || []).slice(0, 3).map(a => ({
    title: a.title,
    description: a.description,
    priority: a.priority,
    ctaUrl: a.ctaUrl
  }));

  // Intent-based trimming to keep context payload under token limits
  let filteredResumeIntel = resumeIntelligence;
  let filteredApplications = applications;
  let filteredInterviewIntel = interviewIntelligence;
  let filteredSkillGaps = skillGaps;

  if (intent === "resume" || intent === "projects") {
    filteredApplications = applications.slice(0, 2);
    filteredInterviewIntel = { totalSessions: interviewSessions.length, weaknesses: interviewWeaknesses.slice(0, 2) };
  } else if (intent === "skills") {
    if (filteredResumeIntel) {
      filteredResumeIntel = {
        fileName: resumeIntelligence.fileName,
        atsScore: resumeIntelligence.atsScore,
        skills: resumeIntelligence.skills,
        projects: resumeIntelligence.projects.map(p => ({ name: p.name, technologies: p.technologies }))
      };
    }
  } else if (intent === "jobs") {
    filteredInterviewIntel = { totalSessions: interviewSessions.length };
  } else if (intent === "interviews") {
    filteredApplications = applications.slice(0, 2);
  } else if (intent === "preparation" || intent === "career") {
    filteredSkillGaps = skillGaps.slice(0, 5);
    filteredApplications = applications.slice(0, 3);
  }

  return {
    careerProfile,
    resumeIntelligence: filteredResumeIntel,
    skillGaps: filteredSkillGaps,
    applications: filteredApplications,
    interviewIntelligence: filteredInterviewIntel,
    preparationIntelligence,
    nextBestActions: topNextBestActions,
    intent
  };
  } catch (err) {
    console.warn("[CandidateIntelligenceService] Context build fallback triggered:", err.message);
    return {
      careerProfile: { name: "Candidate", targetRoles: [], targetCompanies: [] },
      resumeIntelligence: null,
      skillGaps: [],
      applications: [],
      interviewIntelligence: { totalSessions: 0, weaknesses: [] },
      preparationIntelligence: null,
      nextBestActions: [],
      intent
    };
  }
}

/**
 * Safely merges newly extracted candidate intelligence into the user's normalized career profile.
 * Applies confidence tiers: High (auto-apply), Medium (suggest), Low (ignore).
 * Normalizes all skills to canonical forms to avoid duplicate or inconsistent entries.
 * 
 * @param {string} userId - User ID
 * @param {Object} extractedData - Extracted data from Resume or JD
 * @returns {Promise<Object>} Merge result summary
 */
export async function mergeCareerProfile(userId, extractedData = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const { UserSkill } = await import("../../models/UserSkill.js");
  const { normalizeSkill } = await import("./taxonomyService.js");

  const existingSkillsSet = new Set((user.technicalSkills || []).map(s => s.toLowerCase()));
  const newAppliedSkills = [];
  const suggestedSkills = [];

  const rawSkills = extractedData.skills || [];
  for (const raw of rawSkills) {
    const skillName = typeof raw === "string" ? raw : (raw.name || raw.canonicalName || "");
    const normalized = normalizeSkill(skillName);
    if (!normalized) continue;

    const lowerCanonical = normalized.canonicalName.toLowerCase();
    
    // Check confidence level if provided, default to 'high' for explicit resume items
    const confidence = typeof raw === "object" && raw.confidence ? String(raw.confidence).toLowerCase() : "high";

    if (confidence === "high" || normalized.isKnown) {
      if (!existingSkillsSet.has(lowerCanonical)) {
        existingSkillsSet.add(lowerCanonical);
        user.technicalSkills.push(normalized.canonicalName);
        newAppliedSkills.push(normalized.canonicalName);

        // Also upsert in UserSkill collection with evidence
        await UserSkill.findOneAndUpdate(
          { userId: user._id, canonicalName: normalized.canonicalName },
          {
            $setOnInsert: {
              category: normalized.category || "other",
              proficiency: 60,
              confidence: 75
            },
            $push: {
              evidence: {
                description: `Extracted from resume (${normalized.canonicalName})`,
                source: "resume",
                date: new Date(),
                weight: 1
              }
            }
          },
          { upsert: true, new: true }
        ).catch(() => null);
      }
    } else if (confidence === "medium") {
      if (!existingSkillsSet.has(lowerCanonical)) {
        suggestedSkills.push(normalized.canonicalName);
      }
    }
  }

  // Target Roles auto-merge if user has no target role set
  if (extractedData.targetRoles && Array.isArray(extractedData.targetRoles) && extractedData.targetRoles.length > 0) {
    if (!user.targetRoles || user.targetRoles.length === 0) {
      user.targetRoles = extractedData.targetRoles.map((r, i) => ({
        title: typeof r === "string" ? r : r.title || "Software Engineer",
        techStack: typeof r === "object" && Array.isArray(r.techStack) ? r.techStack : [],
        isPrimary: i === 0
      }));
    }
  }

  await user.save();

  return {
    success: true,
    appliedSkills: newAppliedSkills,
    suggestedSkills,
    totalSkillsCount: user.technicalSkills.length
  };
}

