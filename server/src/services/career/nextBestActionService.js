import { User } from "../../models/User.js";
import { getCanonicalCareerState } from "./careerStateService.js";
import { updateUserReadinessScore } from "./readinessService.js";

/**
 * Dynamically computes Next Best Actions for the candidate using Canonical Career State.
 * Filters out dismissed and currently snoozed actions.
 * Every action includes explicit reason, evidence, estimated effort, expected impact, and source entities.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of action cards
 */
export async function getNextBestActions(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const careerState = await getCanonicalCareerState(userId);
  const now = new Date();

  // Active snoozed and dismissed IDs
  const activeSnoozedIds = (user.snoozedActions || [])
    .filter(s => s.snoozeUntil && s.snoozeUntil > now)
    .map(s => s.actionId);

  const dismissedIds = user.dismissedActions || [];
  const rawActions = [];

  const { profile, resume, skills, projects, applications, interviews, preparation, coding } = careerState;

  // 1. Resume / ATS Baseline
  if (!resume.hasResume) {
    rawActions.push({
      id: "upload_resume",
      title: "Upload Your Primary Resume",
      description: "Establish your career baseline. Upload your resume to unlock evidence extraction and job matching.",
      action: "Upload resume file in PDF/Docx format",
      reason: "CareerPilot needs your resume to parse experience and calculate job fit.",
      evidence: ["No active resume uploaded"],
      priority: "HIGH",
      estimatedEffort: "5 mins",
      expectedImpact: "+20% Resume Readiness",
      sourceEntities: ["User.resumes"],
      ctaText: "Go to Resume Studio",
      ctaUrl: "/resume",
      type: "resume",
      pointsPotential: 20
    });
  } else if (resume.atsScore < 70) {
    rawActions.push({
      id: "optimize_resume",
      title: "Optimize Your Resume ATS Score",
      description: `Your ATS compatibility score is ${resume.atsScore}%. Fix identified section formatting and keyword gaps.`,
      action: "Review ATS suggestions and strengthen bullet points",
      reason: "Low ATS compatibility reduces resume parsing success in recruiter systems.",
      evidence: [`Current ATS score: ${resume.atsScore}%`],
      priority: "HIGH",
      estimatedEffort: "15 mins",
      expectedImpact: "+15% Resume Readiness",
      sourceEntities: [`Resume:${resume.resumeId}`],
      ctaText: "Review Recommendations",
      ctaUrl: "/resume",
      type: "resume",
      pointsPotential: 15
    });
  }

  // 2. Application Pipeline Health
  if (applications.total === 0) {
    rawActions.push({
      id: "add_application",
      title: "Track Your First Target Job Application",
      description: "Add a target job description to run evidence matching and track your application lifecycle.",
      action: "Add job posting URL or job description",
      reason: "Application tracking unlocks job matching and interview preparation alignment.",
      evidence: ["0 active applications in pipeline"],
      priority: "HIGH",
      estimatedEffort: "5 mins",
      expectedImpact: "+15% Application Health",
      sourceEntities: ["User.applications"],
      ctaText: "Add Job Application",
      ctaUrl: "/jobs",
      type: "applications",
      pointsPotential: 15
    });
  } else if (applications.rejectedCount >= 3 && skills.unknown.length > 0) {
    const unknownName = skills.unknown[0]?.name || "Required Skill";
    rawActions.push({
      id: "close_rejection_skill_gap",
      title: `Build Proof for Skill: ${unknownName}`,
      description: `You have ${applications.rejectedCount} rejected application(s). Building verified evidence for ${unknownName} improves application match rate.`,
      action: `Complete a practice quiz or project module using ${unknownName}`,
      reason: "Rejection analysis shows repeated missing skill requirements across target jobs.",
      evidence: [`${applications.rejectedCount} rejections in pipeline`, `Skill gap: ${unknownName}`],
      priority: "HIGH",
      estimatedEffort: "30 mins",
      expectedImpact: "+10% Target Role Alignment",
      sourceEntities: [`UserSkill:${unknownName}`],
      ctaText: "Practice Skill",
      ctaUrl: "/skills",
      type: "skill_gap",
      pointsPotential: 25
    });
  }

  // 3. Technical & Coding Practice
  if (coding.totalSubmissions === 0) {
    rawActions.push({
      id: "start_coding",
      title: "Solve Your First Coding Challenge",
      description: "Complete a data structure or algorithm question to establish your Technical Readiness score.",
      action: "Solve 1 easy/medium coding challenge",
      reason: "Coding problem-solving creates verified technical evidence for your candidate profile.",
      evidence: ["0 coding challenges completed"],
      priority: "HIGH",
      estimatedEffort: "20 mins",
      expectedImpact: "+15% Technical Readiness",
      sourceEntities: ["CodingSubmissions"],
      ctaText: "Start SDE Coding",
      ctaUrl: "/coding",
      type: "coding",
      pointsPotential: 20
    });
  } else if (coding.passedCount < 5) {
    rawActions.push({
      id: "practice_dsa",
      title: "Solve 5 Coding Challenges",
      description: `You have solved ${coding.passedCount} problem(s). Target 5 solved challenges to build technical consistency.`,
      action: "Complete remaining coding challenges",
      reason: "Consistent problem solving builds technical fluency for live coding assessments.",
      evidence: [`Passed challenges: ${coding.passedCount}`],
      priority: "MEDIUM",
      estimatedEffort: "30 mins",
      expectedImpact: "+10% Technical Readiness",
      sourceEntities: ["CodingSubmissions"],
      ctaText: "Practice DSA",
      ctaUrl: "/coding",
      type: "coding",
      pointsPotential: 10
    });
  }

  // 4. Mock Interviews
  if (interviews.completedCount === 0) {
    rawActions.push({
      id: "mock_interview",
      title: "Complete a Tech Mock Interview",
      description: "Test your live technical explanation and problem-solving under realistic interview constraints.",
      action: "Launch 15-minute AI technical mock interview",
      reason: "Mock interviews provide evidence-grounded feedback on technical depth and communication.",
      evidence: ["0 mock interview sessions completed"],
      priority: "HIGH",
      estimatedEffort: "15 mins",
      expectedImpact: "+20% Interview Readiness",
      sourceEntities: ["InterviewSessions"],
      ctaText: "Launch AI Mock",
      ctaUrl: "/preparation",
      type: "interview",
      pointsPotential: 20
    });
  } else if (interviews.avgScore < 70) {
    rawActions.push({
      id: "improve_interview",
      title: "Retake Mock Interview Session",
      description: `Your average interview score is ${interviews.avgScore}%. Focus on explaining trade-offs and core concepts.`,
      action: "Start a mock session focused on weak topics",
      reason: "Interview depth gaps identified in recent session evaluation.",
      evidence: [`Average interview score: ${interviews.avgScore}%`],
      priority: "HIGH",
      estimatedEffort: "20 mins",
      expectedImpact: "+15% Interview Readiness",
      sourceEntities: [interviews.latestSession?.id ? `InterviewSession:${interviews.latestSession.id}` : "InterviewSessions"],
      ctaText: "Retake Mock Session",
      ctaUrl: "/preparation",
      type: "interview",
      pointsPotential: 15
    });
  }

  // 5. Portfolio & Projects
  if (projects.count === 0) {
    rawActions.push({
      id: "add_project",
      title: "Register a Portfolio Project",
      description: "Register a project to generate architectural evidence and an interactive AI interview kit.",
      action: "Add project name, tech stack, and description",
      reason: "Projects provide real-world architectural proof for recruiters and interviewers.",
      evidence: ["0 registered projects in portfolio"],
      priority: "HIGH",
      estimatedEffort: "10 mins",
      expectedImpact: "+20% Portfolio Strength",
      sourceEntities: ["User.projects"],
      ctaText: "Register Project",
      ctaUrl: "/projects",
      type: "projects",
      pointsPotential: 15
    });
  }

  // 6. Daily Preparation Plan
  if (preparation.hasActivePlan && preparation.pendingCount > 0) {
    rawActions.push({
      id: "daily_checklist",
      title: "Complete Today's Preparation Plan",
      description: `You have ${preparation.pendingCount} preparation task(s) remaining for today. Maintain your prep streak.`,
      action: "Execute daily learning tasks",
      reason: "Daily consistent preparation keeps learning retention high.",
      evidence: [`${preparation.pendingCount} pending tasks today`, `Current streak: ${preparation.streakDays} days`],
      priority: "MEDIUM",
      estimatedEffort: `${profile.availablePrepMinutesPerDay || 45} mins`,
      expectedImpact: "+5% Preparation Consistency",
      sourceEntities: [`PreparationPlan:${preparation.planId}`],
      ctaText: "View Daily Plan",
      ctaUrl: "/preparation",
      type: "preparation",
      pointsPotential: 10
    });
  }

  // Filter out snoozed/dismissed actions
  const activeActions = rawActions.filter(action => {
    return !dismissedIds.includes(action.id) && !activeSnoozedIds.includes(action.id);
  });

  // Sort by priority (HIGH -> MEDIUM -> LOW)
  const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  activeActions.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  return activeActions;
}

/**
 * Dismisses a next best action card permanently.
 */
export async function dismissAction(userId, actionId) {
  await User.findByIdAndUpdate(userId, {
    $addToSet: { dismissedActions: actionId }
  });
  await updateUserReadinessScore(userId, `Dismissed action: ${actionId}`);
  return getNextBestActions(userId);
}

/**
 * Snoozes a next best action card until a specific date.
 */
export async function snoozeAction(userId, actionId, hours = 24) {
  const snoozeUntil = new Date();
  snoozeUntil.setHours(snoozeUntil.getHours() + hours);

  await User.findByIdAndUpdate(userId, {
    $pull: { snoozedActions: { actionId } }
  });

  await User.findByIdAndUpdate(userId, {
    $push: { snoozedActions: { actionId, snoozeUntil } }
  });

  return getNextBestActions(userId);
}
