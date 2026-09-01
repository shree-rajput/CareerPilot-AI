import { Application } from "../../models/Application.js";
import { InterviewQuestion } from "../../models/InterviewQuestion.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { MatchResult } from "../../models/MatchResult.js";
import { Resume } from "../../models/Resume.js";
import { User } from "../../models/User.js";

const ROLE_SKILL_MAP = {
  "full stack": ["JavaScript", "React", "Node.js", "Express", "MongoDB", "REST APIs", "Authentication", "Testing", "Git"],
  frontend: ["JavaScript", "React", "HTML", "CSS", "State Management", "Performance", "Testing"],
  backend: ["Node.js", "Express", "REST APIs", "Authentication", "MongoDB", "SQL", "Caching", "Testing"],
  mern: ["MongoDB", "Express", "React", "Node.js", "JavaScript", "REST APIs", "Authentication"],
  "software engineer": ["Data Structures", "Algorithms", "System Design", "Databases", "Git", "Testing"],
  intern: ["JavaScript", "Git", "Problem Solving", "Projects", "Communication"]
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function unique(values) {
  const seen = new Set();
  const result = [];

  for (const value of values.flat().filter(Boolean)) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(String(value).trim());
  }

  return result;
}

function topEntries(counter, limit = 8) {
  return Object.entries(counter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function addCount(counter, value, weight = 1) {
  const label = String(value || "").trim();
  if (!label) return;
  counter[label] = (counter[label] || 0) + weight;
}

function extractResumeSkills(resumes) {
  const skillMap = new Map();
  const projects = [];
  const certifications = [];

  for (const resume of resumes) {
    const data = resume.structuredData || {};
    
    // Process skills section
    for (const skill of data.skills || []) {
      const name = skill.canonicalName || skill; // Handle both old strings and new objects
      const key = normalize(name);
      if (!key) continue;
      
      if (!skillMap.has(key)) {
        skillMap.set(key, {
          name: typeof name === 'string' ? name : String(name),
          proficiency: skill.proficiency || "emerging",
          evidence: skill.evidence || "Found in resume skills section",
          confidence: skill.confidence || 50
        });
      }
    }

    for (const cert of data.certifications || []) {
      certifications.push(cert);
    }

    for (const project of data.projects || []) {
      projects.push({
        name: project.name || "Project",
        description: project.description || "",
        technologies: project.technologies || [],
        problemSolved: project.problemSolved || "",
        technicalComplexity: project.technicalComplexity || "",
        userImpact: project.userImpact || "",
        role: project.role || ""
      });
      
      // Add project tech as skills if missing
      for (const tech of project.technologies || []) {
        const key = normalize(tech);
        if (!key) continue;
        if (!skillMap.has(key)) {
          skillMap.set(key, {
            name: tech,
            proficiency: "familiar",
            evidence: `Used in project: ${project.name || "Project"}`,
            confidence: 60
          });
        }
      }
    }
  }

  return {
    skills: Array.from(skillMap.values()),
    projects,
    certifications
  };
}

function targetRoleSkills(user, applications) {
  const roleText = unique([
    user.targetRoles || [],
    applications.map((application) => application.role)
  ]).join(" ");

  const required = [];
  const normalizedRole = normalize(roleText);

  for (const [keyword, skills] of Object.entries(ROLE_SKILL_MAP)) {
    if (normalizedRole.includes(keyword)) required.push(skills);
  }

  return unique(required.length ? required : ROLE_SKILL_MAP["software engineer"]);
}

function buildSkillGap({ userSkills, targetSkills, missingFromMatches, weakFromInterviews }) {
  const userSkillMap = new Map();
  for (const skill of userSkills) {
    if (typeof skill === 'string') {
      userSkillMap.set(normalize(skill), { proficiency: 'emerging', evidence: 'Mentioned in profile' });
    } else if (skill && skill.name) {
      userSkillMap.set(normalize(skill.name), skill);
    }
  }

  const gaps = [];

  for (const skill of targetSkills) {
    const key = normalize(skill);
    const matchMissingCount = missingFromMatches[key] || 0;
    const interviewWeakCount = weakFromInterviews[key] || 0;
    const knownSkill = userSkillMap.get(key);
    const isKnown = !!knownSkill;

    if (isKnown && matchMissingCount === 0 && interviewWeakCount === 0 && knownSkill.proficiency === 'strong') {
      gaps.push({
        skill,
        status: "strong",
        priority: "low",
        whyItMatters: "This skill appears in your profile and has not repeatedly appeared as a gap.",
        evidence: knownSkill.evidence || "Strong evidence in profile",
        recommendedTopics: [],
        practiceRecommendation: "Keep using this in projects and interview explanations."
      });
      continue;
    }

    const priorityScore = matchMissingCount * 2 + interviewWeakCount * 3 + (isKnown ? (knownSkill.proficiency === 'emerging' ? 1 : 0) : 2);
    const priority = priorityScore >= 5 ? "high" : priorityScore >= 2 ? "medium" : "low";
    
    let evidence = knownSkill ? (knownSkill.evidence || `Detected as ${knownSkill.proficiency}`) : "No evidence found in resume or projects.";

    gaps.push({
      skill,
      status: isKnown ? "needs_improvement" : "missing",
      priority,
      evidence,
      whyItMatters: isKnown
        ? `Your data suggests this skill needs stronger evidence or interview depth.`
        : `This skill is relevant to your target role but is not visible in your profile.`,
      recommendedTopics: getRecommendedTopics(skill),
      practiceRecommendation: getPracticeRecommendation(skill)
    });
  }

  return gaps.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority] || a.skill.localeCompare(b.skill);
  });
}

function getRecommendedTopics(skill) {
  const key = normalize(skill);
  if (key.includes("react")) return ["Hooks", "state management", "component architecture", "performance"];
  if (key.includes("node") || key.includes("express")) return ["event loop", "middleware", "REST APIs", "error handling"];
  if (key.includes("mongo")) return ["schema design", "indexes", "aggregation", "query optimization"];
  if (key.includes("auth") || key.includes("jwt")) return ["JWT flow", "refresh tokens", "password hashing", "authorization"];
  if (key.includes("system")) return ["scalability", "caching", "database choice", "API design"];
  if (key.includes("test")) return ["unit tests", "integration tests", "API testing"];
  return ["fundamentals", "practical use cases", "project examples", "interview explanations"];
}

function getPracticeRecommendation(skill) {
  return `Build or explain one concrete project example that uses ${skill}, then practice a 90-second interview answer.`;
}

function buildRoadmap(skillGaps) {
  const actionable = skillGaps.filter((gap) => gap.status !== "strong").slice(0, 6);

  return actionable.map((gap, index) => ({
    phase: index + 1,
    title: gap.skill,
    focus: gap.recommendedTopics,
    priority: gap.priority,
    progress: 0,
    action: gap.practiceRecommendation
  }));
}

function calculateReadiness({ user, resumes, applications, matchResults, sessions, skillGaps }) {
  const profileScore = [
    user.name,
    user.email,
    user.education?.degree,
    user.targetRoles?.length,
    user.technicalSkills?.length,
    resumes.length
  ].filter(Boolean).length / 6;

  const resumeScore = resumes.some((resume) => resume.structuredData) ? 1 : resumes.length ? 0.55 : 0;
  const matchScores = matchResults.map((match) => match.overallScore).filter((score) => Number.isFinite(score));
  const matchScore = matchScores.length
    ? matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length / 100
    : 0;
  const interviewScores = sessions.map((session) => session.overallScore).filter((score) => score > 0);
  const interviewScore = interviewScores.length
    ? interviewScores.reduce((sum, score) => sum + score, 0) / interviewScores.length / 100
    : 0;
  const applicationScore = applications.length ? Math.min(applications.length / 10, 1) : 0;
  const highPriorityGapPenalty = skillGaps.filter((gap) => gap.priority === "high").length * 0.03;

  const readiness =
    profileScore * 20 +
    resumeScore * 20 +
    matchScore * 25 +
    interviewScore * 20 +
    applicationScore * 15 -
    highPriorityGapPenalty * 100;

  return Math.max(0, Math.min(100, Math.round(readiness)));
}

function buildNextAction({ resumes, applications, matchResults, sessions, skillGaps }) {
  if (!resumes.length) {
    return {
      type: "resume",
      title: "Upload your resume",
      reason: "CareerPilot needs resume data before it can calculate job fit or skill gaps."
    };
  }

  if (!applications.length) {
    return {
      type: "application",
      title: "Add your first target job",
      reason: "A real job description unlocks match scoring and missing requirement analysis."
    };
  }

  if (!matchResults.length) {
    return {
      type: "match",
      title: "Run the semantic match engine",
      reason: "Your applications exist, but no resume-to-JD evidence has been calculated yet."
    };
  }

  const topGap = skillGaps.find((gap) => gap.priority === "high" || gap.priority === "medium");
  if (topGap) {
    return {
      type: "practice",
      title: `Practice ${topGap.skill}`,
      reason: topGap.whyItMatters
    };
  }

  if (!sessions.length) {
    return {
      type: "interview",
      title: "Start a mock interview",
      reason: "You have resume and job data; interview answers will make the readiness score more complete."
    };
  }

  return {
    type: "review",
    title: "Review your strongest matching application",
    reason: "Your foundation is complete enough to focus on applications with the best evidence-backed fit."
  };
}

function buildApplicationAdvice(application, matchResult, resumeContext) {
  if (!application) return null;

  const relevantProjects = resumeContext.projects.filter((project) => {
    const text = normalize(`${project.name} ${project.description} ${(project.technologies || []).join(" ")}`);
    const required = [
      ...(application.extractedJd?.requiredSkills || []),
      ...(application.extractedJd?.tools || [])
    ].map(normalize);
    return required.some((skill) => text.includes(skill));
  });

  const missingKeywords = matchResult?.missingSkills || application.extractedJd?.requiredSkills || [];
  const suitability = matchResult
    ? matchResult.overallScore >= 75
      ? "strong"
      : matchResult.overallScore >= 55
        ? "moderate"
        : "weak"
    : "unknown";

  return {
    suitability,
    matchPercentage: matchResult?.overallScore ?? null,
    matchingSkills: matchResult?.matchedSkills || [],
    missingKeywords,
    importantMissingRequirements: (matchResult?.evidence || [])
      .filter((item) => item.classification === "missing")
      .slice(0, 5)
      .map((item) => item.requirement),
    relevantProjects: relevantProjects.slice(0, 3),
    resumeImprovementSuggestions: missingKeywords.slice(0, 5).map((skill) => ({
      skill,
      suggestion: `Only add ${skill} if you have real evidence. Otherwise, prepare a learning or project plan for it.`
    })),
    personalizedAdvice: matchResult
      ? `This role is a ${suitability} fit based on the current resume/JD match evidence. Prioritize the missing requirements before applying or interviewing.`
      : "Run the semantic match engine with a selected resume to unlock evidence-based application advice.",
    coverLetterContext: {
      company: application.company,
      role: application.role,
      usableSkills: matchResult?.matchedSkills || resumeContext.skills.map(s => typeof s === 'string' ? s : s.name).slice(0, 6),
      usableProjects: relevantProjects.slice(0, 2)
    }
  };
}

export async function getCareerIntelligence(userId) {
  const [user, resumes, applications, matchResults, sessions] = await Promise.all([
    User.findById(userId).lean(),
    Resume.find({ userId, isActive: true }).sort({ createdAt: -1 }).lean(),
    Application.find({ userId }).sort({ createdAt: -1 }).lean(),
    MatchResult.find({ userId }).sort({ createdAt: -1 }).lean(),
    InterviewSession.find({ userId }).sort({ createdAt: -1 }).lean()
  ]);

  const sessionIds = sessions.map((session) => session._id);
  const questions = sessionIds.length
    ? await InterviewQuestion.find({ sessionId: { $in: sessionIds }, status: "answered" }).lean()
    : [];

  const resumeContext = extractResumeSkills(resumes);
  
  // userSkills array containing both strings (from user model) and objects (from resumeContext)
  const rawUserSkills = [
    ...(user?.technicalSkills || []),
    ...(user?.primaryTechStack || []),
    ...resumeContext.skills
  ];
  
  // unique won't handle objects well if it only expects strings, so we pass rawUserSkills directly to buildSkillGap
  // which handles both strings and objects.
  const targetSkills = targetRoleSkills(user || {}, applications);

  const missingFromMatches = {};
  const strongFromMatches = {};
  for (const match of matchResults) {
    for (const skill of match.missingSkills || []) addCount(missingFromMatches, normalize(skill));
    for (const skill of match.matchedSkills || []) addCount(strongFromMatches, skill);
  }

  const weakFromInterviews = {};
  for (const question of questions) {
    const score = question.analysis?.technicalAccuracy || 0;
    if (score > 0 && score < 60) {
      addCount(weakFromInterviews, normalize(question.category), 1);
      for (const concept of question.expectedConcepts || []) addCount(weakFromInterviews, normalize(concept), 1);
    }
  }

  const skillGaps = buildSkillGap({
    userSkills: rawUserSkills,
    targetSkills,
    missingFromMatches,
    weakFromInterviews
  });

  const readinessScore = calculateReadiness({
    user: user || {},
    resumes,
    applications,
    matchResults,
    sessions,
    skillGaps
  });

  const weakSkills = skillGaps.filter((gap) => gap.status !== "strong").slice(0, 8);
  const strongSkills = unique([
    topEntries(strongFromMatches, 8).map((entry) => entry.name),
    skillGaps.filter((gap) => gap.status === "strong").map((gap) => gap.skill),
    rawUserSkills.map(s => typeof s === 'string' ? s : s.name).slice(0, 8)
  ]).slice(0, 8);

  return {
    readinessScore,
    profileCompleteness: {
      hasResume: resumes.length > 0,
      hasStructuredResume: resumes.some((resume) => resume.structuredData),
      hasApplications: applications.length > 0,
      hasMatches: matchResults.length > 0,
      hasInterviews: sessions.length > 0
    },
    strongSkills,
    weakSkills,
    missingSkills: weakSkills.filter((gap) => gap.status === "missing").map((gap) => gap.skill),
    recommendedTechnologies: weakSkills.map((gap) => gap.skill).slice(0, 6),
    recommendedCareerRoles: unique([user?.targetRoles || [], applications.map((application) => application.role)]).slice(0, 6),
    improvementAreas: weakSkills.map((gap) => ({
      title: gap.skill,
      priority: gap.priority,
      reason: gap.whyItMatters,
      practice: gap.practiceRecommendation
    })),
    skillGaps,
    roadmap: buildRoadmap(skillGaps),
    nextAction: buildNextAction({ resumes, applications, matchResults, sessions, skillGaps })
  };
}

export async function getApplicationIntelligence(userId, applicationId) {
  const [application, resumes] = await Promise.all([
    Application.findOne({ _id: applicationId, userId }).populate("matchResultId").lean(),
    Resume.find({ userId, isActive: true }).lean()
  ]);

  const resumeContext = extractResumeSkills(resumes);

  return buildApplicationAdvice(application, application?.matchResultId, resumeContext);
}
