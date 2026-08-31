import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import CodingSubmission from "../../models/CodingSubmission.js";
import { InterviewSession } from "../../models/InterviewSession.js";
import { Project } from "../../models/Project.js";
import { Application } from "../../models/Application.js";
import { PreparationPlan } from "../../models/PreparationPlan.js";
import MentorshipSession from "../../models/MentorshipSession.js";
import { NOT_ASSESSED, safeNumber, clampScore, safeAverage, assertFiniteScore, normalizeScore } from "../../utils/math.js";

/**
 * Calculates and updates a user's career readiness score and breakdown.
 * Logs updates in readinessHistory when values change significantly.
 * 
 * @param {string} userId - Mongoose User ID
 * @param {string} changeReason - Brief text explaining why the calculation was triggered
 * @returns {Promise<Object>} Updated user safe object
 */
export async function updateUserReadinessScore(userId, changeReason = "System Update") {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found for readiness score calculation");
  }

  // 1. Resume / ATS (15%)
  let resumeScore = NOT_ASSESSED;
  const latestResume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
  if (latestResume) {
    if (latestResume.healthIndicators && latestResume.healthIndicators.ats !== null && latestResume.healthIndicators.ats !== undefined) {
      resumeScore = clampScore(latestResume.healthIndicators.ats);
    } else {
      // Fallback calculation based on completeness
      let completeness = 40;
      if (latestResume.skills && latestResume.skills.length > 0) completeness += 20;
      if (latestResume.experience && latestResume.experience.length > 0) completeness += 20;
      if (latestResume.education && latestResume.education.length > 0) completeness += 20;
      resumeScore = clampScore(completeness);
    }
  }

  // 2. Technical Readiness (20%)
  let technicalScore = NOT_ASSESSED;
  const codingSubmissions = await CodingSubmission.find({ candidateId: userId });
  if (codingSubmissions.length > 0) {
    const completedCount = codingSubmissions.filter(s => s.status === "completed").length;
    if (completedCount === 0) {
      technicalScore = NOT_ASSESSED;
    } else {
      if (completedCount <= 3) technicalScore = 40;
      else if (completedCount <= 7) technicalScore = 70;
      else if (completedCount <= 10) technicalScore = 90;
      else technicalScore = 100;

      // Blend with average code quality if available
      const qualityScores = codingSubmissions
        .filter(s => s.codeQualityScore !== null && s.codeQualityScore !== undefined)
        .map(s => safeNumber(s.codeQualityScore, NOT_ASSESSED))
        .filter(s => s !== NOT_ASSESSED);
      
      const avgQuality = safeAverage(qualityScores);
      if (avgQuality !== NOT_ASSESSED) {
        technicalScore = clampScore(Math.round(technicalScore * 0.7 + avgQuality * 0.3));
      }
    }
  }

  // 3. Interview Readiness (20%)
  let interviewScore = NOT_ASSESSED; 
  const completedInterviews = await InterviewSession.find({ userId, status: "completed" });
  if (completedInterviews.length > 0) {
    const scores = completedInterviews
      .map(i => safeNumber(i.overallScore, NOT_ASSESSED))
      .filter(s => s !== NOT_ASSESSED)
      .map(s => s <= 10 ? s * 10 : s);
      
    const avgScore = safeAverage(scores);
    if (avgScore !== NOT_ASSESSED) {
      interviewScore = clampScore(avgScore);
    }
  }

  // 4. Projects (10%)
  let projectsScore = NOT_ASSESSED;
  const userProjects = await Project.find({ userId });
  if (userProjects.length > 0) {
    let tempScore = Math.min(Math.round((userProjects.length / 3) * 100), 100);
    // Add extra relevance points
    const relevances = userProjects
      .map(p => safeNumber(p.relevance, 50));
    
    const relevanceAvg = safeAverage(relevances);
    if (relevanceAvg !== NOT_ASSESSED) {
      projectsScore = clampScore(Math.round(tempScore * 0.6 + relevanceAvg * 0.4));
    } else {
      projectsScore = clampScore(tempScore);
    }
  }

  // 5. Application Health (10%)
  let applicationScore = NOT_ASSESSED;
  const applications = await Application.find({ userId });
  if (applications.length > 0) {
    let maxStatusWeight = 0;
    applications.forEach(app => {
      let weight = 40; // applied or saved
      if (app.status === "oa") weight = 70;
      if (app.status === "interview" || app.status === "technical_round" || app.status === "hr_round") weight = 90;
      if (app.status === "offer") weight = 100;
      if (weight > maxStatusWeight) maxStatusWeight = weight;
    });
    const activeAppCount = applications.filter(a => !["rejected", "withdrawn"].includes(a.status)).length;
    const activeCountBonus = Math.min(activeAppCount * 15, 30);
    applicationScore = clampScore(Math.round(maxStatusWeight * 0.7 + activeCountBonus));
  }

  // 6. Preparation Plan Progress (10%)
  let prepScore = NOT_ASSESSED;
  const activePlan = await PreparationPlan.findOne({ userId, isActive: true });
  if (activePlan && activePlan.actionItems && activePlan.actionItems.length > 0) {
    const total = activePlan.actionItems.length;
    const completed = activePlan.actionItems.filter(item => item.status === "completed").length;
    if (total > 0) {
      prepScore = clampScore(Math.round((completed / total) * 100));
    }
  }

  // 7. Career Profile (5%)
  let profileScore = 0;
  if (user.targetRoles && user.targetRoles.length > 0) profileScore += 35;
  if (user.targetCompanies && user.targetCompanies.length > 0) profileScore += 35;
  if (user.preferredLocations && user.preferredLocations.length > 0) profileScore += 15;
  if (user.technicalSkills && user.technicalSkills.length > 0) profileScore += 15;
  profileScore = clampScore(profileScore);

  // 8. Communication Score (5%)
  let communicationScore = NOT_ASSESSED; 
  if (completedInterviews.length > 0) {
    const commScores = completedInterviews
      .filter(i => i.scores && i.scores.communication !== undefined && i.scores.communication !== null)
      .map(i => safeNumber(i.scores.communication, NOT_ASSESSED))
      .filter(s => s !== NOT_ASSESSED)
      .map(s => s <= 10 ? s * 10 : s);
      
    if (commScores.length > 0) {
      const avgComm = safeAverage(commScores);
      if (avgComm !== NOT_ASSESSED) {
        communicationScore = clampScore(avgComm);
      }
    }
  }

  // 9. Career Strategy (5%)
  let strategyScore = NOT_ASSESSED; 
  const mentorshipSessions = await MentorshipSession.find({ studentId: userId });
  if (mentorshipSessions.length > 0) {
    let totalItems = 0;
    let completedItems = 0;
    mentorshipSessions.forEach(sess => {
      if (sess.actionItems && sess.actionItems.length > 0) {
        totalItems += sess.actionItems.length;
        completedItems += sess.actionItems.filter(item => item.status === "completed").length;
      }
    });
    if (totalItems > 0) {
      strategyScore = clampScore(Math.round((completedItems / totalItems) * 100));
    } else {
      strategyScore = 100; // Booked sessions but no actions assigned yet
    }
  }

  // Compute total weighted score
  let totalWeight = 0;
  let earnedScore = 0;

  const addWeight = (score, weight) => {
    if (score !== NOT_ASSESSED) {
      totalWeight += weight;
      earnedScore += score * weight;
    }
  };

  addWeight(resumeScore, 0.15);
  addWeight(technicalScore, 0.20);
  addWeight(interviewScore, 0.20);
  addWeight(projectsScore, 0.10);
  addWeight(applicationScore, 0.10);
  addWeight(prepScore, 0.10);
  addWeight(profileScore, 0.05);
  addWeight(communicationScore, 0.05);
  addWeight(strategyScore, 0.05);

  let finalScore = 0;
  if (totalWeight > 0) {
    finalScore = normalizeScore(Math.round(earnedScore / totalWeight));
  }
  
  finalScore = normalizeScore(finalScore);

  const breakdown = {
    resume: normalizeScore(resumeScore),
    technical: normalizeScore(technicalScore),
    interview: normalizeScore(interviewScore),
    projects: normalizeScore(projectsScore),
    applications: normalizeScore(applicationScore),
    preparation: normalizeScore(prepScore),
    profile: normalizeScore(profileScore),
    communication: normalizeScore(communicationScore),
    careerStrategy: normalizeScore(strategyScore)
  };

  // Normalize existing corrupted readinessHistory entries
  if (user.readinessHistory && user.readinessHistory.length > 0) {
    user.readinessHistory.forEach(entry => {
      entry.score = normalizeScore(entry.score);
    });
  }

  // Check if history needs an update
  const previousScore = normalizeScore(user.readinessScore);
  if (previousScore !== finalScore || user.readinessHistory.length === 0) {
    user.readinessHistory.push({
      score: finalScore,
      date: new Date(),
      changeReason: `${changeReason} (Was: ${previousScore})`
    });
  }

  user.readinessScore = finalScore;
  user.readinessBreakdown = breakdown;

  await user.save();
  return user;
}
