import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import CodingSubmission from "../../models/CodingSubmission.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { Project } from "../../models/Project.js";
import { Application } from "../../models/Application.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import MentorshipSession from "../../models/MentorshipSession.js";
import { UserSkill } from "../../models/UserSkill.js";
import { normalizeSkill } from "./taxonomyService.js";
import { updateUserReadinessScore } from "./readinessService.js";

/**
 * Dynamically computes Next Best Actions for the candidate.
 * Filters out dismissed and currently snoozed actions.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of action cards
 */
export async function getNextBestActions(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get current date
  const now = new Date();

  // Create list of active snoozed action IDs
  const activeSnoozedIds = (user.snoozedActions || [])
    .filter(s => s.snoozeUntil && s.snoozeUntil > now)
    .map(s => s.actionId);

  const dismissedIds = user.dismissedActions || [];

  const rawActions = [];

  // 1. Resume / ATS
  const latestResume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
  if (!latestResume) {
    rawActions.push({
      id: "upload_resume",
      title: "Upload Your Primary Resume",
      description: "Establish your career baseline. Upload your resume to unlock AI matching and formatting checks.",
      priority: "HIGH",
      ctaText: "Go to Resume Studio",
      ctaUrl: "/resume",
      type: "resume",
      pointsPotential: 15
    });
  } else if (latestResume.healthIndicators && (latestResume.healthIndicators.ats || 0) < 70) {
    const atsScore = latestResume.healthIndicators.ats || 0;
    rawActions.push({
      id: "optimize_resume",
      title: "Optimize Your Resume ATS Score",
      description: `Your current ATS compatibility score is ${atsScore}%. Fix identified layout and keyword issues.`,
      priority: "HIGH",
      ctaText: "Review Recommendations",
      ctaUrl: "/resume",
      type: "resume",
      pointsPotential: 10
    });
  }

  // 2. Technical / Coding
  const submissions = await CodingSubmission.find({ candidateId: userId });
  const completedCount = submissions.filter(s => s.status === "completed").length;
  if (completedCount === 0) {
    rawActions.push({
      id: "start_coding",
      title: "Begin Coding Practice Challenges",
      description: "Solve your first coding question to test your logic and start building a Technical Readiness score.",
      priority: "HIGH",
      ctaText: "Start SDE Coding",
      ctaUrl: "/coding",
      type: "coding",
      pointsPotential: 20
    });
  } else if (completedCount < 5) {
    rawActions.push({
      id: "practice_dsa",
      title: "Solve 5 Coding Challenges",
      description: `You have completed ${completedCount} problem(s). Target 5 completed problems to boost technical readiness.`,
      priority: "MEDIUM",
      ctaText: "Practice DSA",
      ctaUrl: "/coding",
      type: "coding",
      pointsPotential: 10
    });
  }

  // 3. Mock Interviews
  const completedInterviews = await InterviewSession.find({ userId, status: "completed" });
  if (completedInterviews.length === 0) {
    rawActions.push({
      id: "mock_interview",
      title: "Practice a Tech Mock Interview",
      description: "Assess your live verbal technical explanation and presence in a simulated whiteboard mock interview.",
      priority: "HIGH",
      ctaText: "Launch AI Mock",
      ctaUrl: "/prepare",
      type: "interview",
      pointsPotential: 20
    });
  } else {
    const avgScore = completedInterviews.reduce((sum, i) => sum + (i.overallScore <= 10 ? i.overallScore * 10 : i.overallScore), 0) / completedInterviews.length;
    if (avgScore < 70) {
      rawActions.push({
        id: "improve_interview",
        title: "Boost Mock Interview Performance",
        description: `Your average interview score is ${Math.round(avgScore)}%. Start a new session focusing on your weak areas.`,
        priority: "MEDIUM",
        ctaText: "Retake Mock Session",
        ctaUrl: "/prepare",
        type: "interview",
        pointsPotential: 10
      });

      // AI -> Human Mentor Escalation
      rawActions.push({
        id: "escalate_to_mentor",
        title: "AI → Human Mentor Escalation Recommended",
        description: `Your recent interview performance (${Math.round(avgScore)}%) indicates difficulties with live explanations or architectural concepts. Book a 1:1 session with an expert software engineering mentor.`,
        priority: "HIGH",
        ctaText: "Talk to a Mentor",
        ctaUrl: "/mentorship",
        type: "mentorship",
        pointsPotential: 15
      });
    }
  }

  // 4. Projects
  const projects = await Project.find({ userId });
  if (projects.length === 0) {
    rawActions.push({
      id: "add_project",
      title: "Add a Project Portfolio Item",
      description: "Register your main development project to generate an interactive AI architectural interview kit.",
      priority: "HIGH",
      ctaText: "Register Project",
      ctaUrl: "/projects",
      type: "projects",
      pointsPotential: 10
    });
  } else if (projects.length < 3) {
    rawActions.push({
      id: "add_more_projects",
      title: "Expand Project Tech Diversity",
      description: `You have registered ${projects.length} project(s). Add up to 3 projects to showcase stack breadth.`,
      priority: "LOW",
      ctaText: "Add Project",
      ctaUrl: "/projects",
      type: "projects",
      pointsPotential: 5
    });
  }

  // 5. Application Pipeline Tracking
  const applications = await Application.find({ userId });
  if (applications.length === 0) {
    rawActions.push({
      id: "add_application",
      title: "Add Your First Job Application",
      description: "Add a job description you're interested in to unlock ATS compatibility comparisons and track status changes.",
      priority: "MEDIUM",
      ctaText: "Track Job App",
      ctaUrl: "/jobs",
      type: "applications",
      pointsPotential: 10
    });
  }

  // 6. Mentor Session
  const mentorshipSessions = await MentorshipSession.find({ studentId: userId });
  if (mentorshipSessions.length === 0) {
    rawActions.push({
      id: "book_mentor",
      title: "Connect with a Human Mentor",
      description: "Get personalized matching and book a slot with an industry expert to resolve skill bottlenecks.",
      priority: "HIGH",
      ctaText: "Find a Mentor",
      ctaUrl: "/mentorship",
      type: "mentorship",
      pointsPotential: 5
    });
  } else {
    // Check if there are active incomplete action items assigned by the mentor
    let pendingActions = 0;
    mentorshipSessions.forEach(sess => {
      if (sess.actionItems) {
        pendingActions += sess.actionItems.filter(item => item.status === "pending").length;
      }
    });
    if (pendingActions > 0) {
      rawActions.push({
        id: "mentor_actions",
        title: "Solve Mentor Action Items",
        description: `You have ${pendingActions} tasks assigned by your mentor. Complete them to advance career strategy.`,
        priority: "HIGH",
        ctaText: "View Mentorship Hub",
        ctaUrl: "/mentorship",
        type: "mentorship",
        pointsPotential: 5
      });
    }
  }

  // 7. Complete Profile Info
  if (!user.targetRoles || user.targetRoles.length === 0 || !user.targetCompanies || user.targetCompanies.length === 0) {
    rawActions.push({
      id: "complete_profile",
      title: "Configure Target Roles & Companies",
      description: "Complete your job hunting parameters so next-step suggestions are tailored to your target companies.",
      priority: "MEDIUM",
      ctaText: "Update Profile",
      ctaUrl: "/profile",
      type: "profile",
      pointsPotential: 5
    });
  }

  // 8. Preparation Plan Checklists
  const activePlan = await PreparationPlan.findOne({ userId, isActive: true });
  if (activePlan && activePlan.actionItems && activePlan.actionItems.length > 0) {
    const pendingCount = activePlan.actionItems.filter(item => item.status === "pending").length;
    if (pendingCount > 0) {
      rawActions.push({
        id: "daily_checklist",
        title: "Execute Daily Preparation Items",
        description: `You have ${pendingCount} checklist task(s) remaining for today. Maintain your prep streak.`,
        priority: "MEDIUM",
        ctaText: "Complete Checklist",
        ctaUrl: "/prepare",
        type: "preparation",
        pointsPotential: 5
      });
    }
  }

  // 9. Skill Gaps against Target Role
  const primaryRole = user.targetRoles?.find(r => r.isPrimary) || user.targetRoles?.[0];
  if (primaryRole && primaryRole.techStack && primaryRole.techStack.length > 0) {
    for (const stackItem of primaryRole.techStack) {
      const normalized = normalizeSkill(stackItem);
      if (normalized && normalized.isKnown) {
        const skill = await UserSkill.findOne({ userId, canonicalName: normalized.canonicalName });
        if (!skill || skill.confidence < 60) {
          rawActions.push({
            id: `skill_gap_${normalized.canonicalName}`,
            title: `Close Skill Gap: ${normalized.canonicalName}`,
            description: `Your target role requires ${normalized.canonicalName}. Complete coding challenges or register projects using this skill to boost confidence.`,
            priority: "HIGH",
            ctaText: "Practice Skill",
            ctaUrl: "/coding",
            type: "skill_gap",
            pointsPotential: 25
          });
          break; // Suggest closing one critical skill gap at a time
        }
      }
    }
  }

  // Filter out dismissed and active-snoozed actions
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

  // Remove existing snooze config for the same action ID if any, and add new one
  await User.findByIdAndUpdate(userId, {
    $pull: { snoozedActions: { actionId } }
  });

  await User.findByIdAndUpdate(userId, {
    $push: { snoozedActions: { actionId, snoozeUntil } }
  });

  return getNextBestActions(userId);
}
