/**
 * Deterministic Readiness Scoring Engine.
 * Evaluates candidate readiness across 7 core dimensions using mathematical,
 * evidence-backed formulas. Never relies on LLM arbitrary guesses.
 */

export function calculateReadinessDimensions(careerState) {
  const now = new Date().toISOString();
  const VERSION = "1.0";

  const {
    profile,
    resume,
    skills,
    projects,
    applications,
    interviews,
    preparation,
    coding
  } = careerState;

  // 1. RESUME READINESS
  // Formula: 50% ATS Score + 50% Resume Evidence completeness (has structured data & >5 skills)
  const atsVal = resume.atsScore || (resume.hasResume ? 60 : 0);
  const evidenceCompleteness = resume.hasResume
    ? Math.min(100, (resume.skillsFoundCount * 5) + (resume.projectsCount * 10))
    : 0;
  const resumeScore = Math.round((atsVal * 0.5) + (evidenceCompleteness * 0.5));
  
  const resumeDimension = {
    value: resumeScore,
    calculation: "0.5 * ATS_Score + 0.5 * Resume_Evidence_Completeness",
    evidence: resume.hasResume
      ? [`ATS score: ${atsVal}%`, `Resume skills count: ${resume.skillsFoundCount}`, `Resume projects: ${resume.projectsCount}`]
      : ["No primary resume uploaded"],
    confidence: resume.hasResume ? "HIGH" : "LOW",
    timestamp: now,
    version: VERSION
  };

  // 2. TECHNICAL READINESS
  // Formula: 60% Verified/Derived Skill Coverage + 40% Coding Practice Pass Rate
  const totalSkillsCount = skills.total || 1;
  const verifiedOrDerivedCount = (skills.verified?.length || 0) + (skills.derived?.length || 0);
  const skillCoverageRatio = Math.min(100, Math.round((verifiedOrDerivedCount / Math.max(5, totalSkillsCount)) * 100));
  
  const codingPassRate = coding.totalSubmissions > 0
    ? Math.round((coding.passedCount / coding.totalSubmissions) * 100)
    : 0;
  
  const techScore = coding.totalSubmissions > 0
    ? Math.round((skillCoverageRatio * 0.6) + (codingPassRate * 0.4))
    : Math.round(skillCoverageRatio * 0.8);

  const technicalDimension = {
    value: techScore,
    calculation: coding.totalSubmissions > 0
      ? "0.6 * Verified_Skill_Coverage + 0.4 * Coding_Pass_Rate"
      : "0.8 * Verified_Skill_Coverage (No coding submissions yet)",
    evidence: [
      `Verified/Derived skills: ${verifiedOrDerivedCount} of ${totalSkillsCount}`,
      `Coding challenges solved: ${coding.passedCount} of ${coding.totalSubmissions}`
    ],
    confidence: (skills.total > 0 || coding.totalSubmissions > 0) ? "HIGH" : "MEDIUM",
    timestamp: now,
    version: VERSION
  };

  // 3. INTERVIEW READINESS
  // Formula: Average score of completed mock interview sessions (0 if none)
  const interviewVal = interviews.completedCount > 0 ? interviews.avgScore : 0;
  const interviewDimension = {
    value: interviewVal,
    calculation: interviews.completedCount > 0
      ? "Average score across completed mock interview sessions"
      : "Default 0 (No completed mock interviews)",
    evidence: interviews.completedCount > 0
      ? [`Completed sessions: ${interviews.completedCount}`, `Average session score: ${interviews.avgScore}%`]
      : ["No mock interview sessions completed yet"],
    confidence: interviews.completedCount >= 2 ? "HIGH" : interviews.completedCount === 1 ? "MEDIUM" : "LOW",
    timestamp: now,
    version: VERSION
  };

  // 4. PORTFOLIO STRENGTH
  // Formula: Project count (up to 3 = 60pts) + High/Medium complexity bonus (40pts)
  const projCount = projects.count || 0;
  const baseProjScore = Math.min(60, projCount * 20);
  const highComplexityCount = (projects.items || []).filter(p => ["high", "medium"].includes(p.complexity?.toLowerCase())).length;
  const complexityBonus = Math.min(40, highComplexityCount * 20);
  const portfolioScore = Math.min(100, baseProjScore + complexityBonus);

  const portfolioDimension = {
    value: portfolioScore,
    calculation: "min(100, (Project_Count * 20) + (High_Complexity_Projects * 20))",
    evidence: projCount > 0
      ? [`Registered projects: ${projCount}`, `High/Medium complexity projects: ${highComplexityCount}`]
      : ["No registered project items"],
    confidence: projCount > 0 ? "HIGH" : "MEDIUM",
    timestamp: now,
    version: VERSION
  };

  // 5. APPLICATION HEALTH
  // Formula: Active applications count (up to 10 = 60pts) + Interview-stage progress (40pts)
  const appTotal = applications.total || 0;
  const appActive = applications.activeCount || 0;
  const appInterviewStage = applications.interviewStageCount || 0;
  const baseAppScore = Math.min(60, appActive * 12);
  const interviewAppBonus = Math.min(40, appInterviewStage * 20);
  const appScore = Math.min(100, baseAppScore + interviewAppBonus);

  const applicationHealthDimension = {
    value: appScore,
    calculation: "min(100, (Active_Applications * 12) + (Interview_Stage_Apps * 20))",
    evidence: appTotal > 0
      ? [`Active applications: ${appActive}`, `Applications in interview/screening stage: ${appInterviewStage}`]
      : ["No active job applications tracked"],
    confidence: appTotal > 0 ? "HIGH" : "LOW",
    timestamp: now,
    version: VERSION
  };

  // 6. TARGET ROLE ALIGNMENT
  // Formula: Ratio of user skills matching primary tech stack requirements
  const primaryStack = profile.primaryTechStack || [];
  let alignedCount = 0;
  if (primaryStack.length > 0) {
    const userSkillNames = new Set((skills.allNames || []).map(s => s.toLowerCase()));
    alignedCount = primaryStack.filter(tech => userSkillNames.has(tech.toLowerCase())).length;
  }
  const alignmentScore = primaryStack.length > 0
    ? Math.round((alignedCount / primaryStack.length) * 100)
    : 50;

  const targetRoleAlignmentDimension = {
    value: alignmentScore,
    calculation: primaryStack.length > 0
      ? "User_Skills_Matching_Primary_Tech_Stack / Primary_Tech_Stack_Count"
      : "Default 50 (Target role tech stack not defined)",
    evidence: primaryStack.length > 0
      ? [`Matching required skills: ${alignedCount} of ${primaryStack.length}`, `Target Role: ${profile.primaryRoleTitle}`]
      : ["Target role configuration incomplete"],
    confidence: primaryStack.length > 0 ? "HIGH" : "LOW",
    timestamp: now,
    version: VERSION
  };

  // 7. PREPARATION CONSISTENCY
  // Formula: Completed prep tasks ratio (50%) + Prep streak bonus (50%)
  const completedTasks = preparation.completedCount || 0;
  const pendingTasks = preparation.pendingCount || 0;
  const totalTasks = completedTasks + pendingTasks;
  const taskCompletionRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const streakBonus = Math.min(50, (preparation.streakDays || 0) * 10);
  const prepScore = preparation.hasActivePlan
    ? Math.min(100, Math.round((taskCompletionRatio * 0.5) + streakBonus))
    : 0;

  const preparationConsistencyDimension = {
    value: prepScore,
    calculation: preparation.hasActivePlan
      ? "0.5 * Task_Completion_Ratio + min(50, Streak_Days * 10)"
      : "Default 0 (No active preparation plan)",
    evidence: preparation.hasActivePlan
      ? [`Tasks completed: ${completedTasks} of ${totalTasks}`, `Active streak: ${preparation.streakDays || 0} days`]
      : ["No active preparation plan"],
    confidence: preparation.hasActivePlan ? "HIGH" : "LOW",
    timestamp: now,
    version: VERSION
  };

  // OVERALL READINESS SCORE (Weighted average across 7 dimensions)
  // Weights: Resume (20%), Tech (20%), Interview (20%), Portfolio (15%), AppHealth (10%), Alignment (10%), Prep (5%)
  const overallScore = Math.round(
    (resumeDimension.value * 0.20) +
    (technicalDimension.value * 0.20) +
    (interviewDimension.value * 0.20) +
    (portfolioDimension.value * 0.15) +
    (applicationHealthDimension.value * 0.10) +
    (targetRoleAlignmentDimension.value * 0.10) +
    (preparationConsistencyDimension.value * 0.05)
  );

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    dimensions: {
      resumeReadiness: resumeDimension,
      technicalReadiness: technicalDimension,
      interviewReadiness: interviewDimension,
      portfolioStrength: portfolioDimension,
      applicationHealth: applicationHealthDimension,
      targetRoleAlignment: targetRoleAlignmentDimension,
      preparationConsistency: preparationConsistencyDimension
    },
    timestamp: now,
    version: VERSION
  };
}
