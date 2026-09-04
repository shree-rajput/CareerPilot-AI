import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { getPreparationDashboard } from "./preparationService.js";
import { VERIFIED_QUESTION_BANK, getVerifiedQuestions } from "./questionBank.service.js";

/**
 * Deterministic Pipeline:
 * User -> Practice Mode -> Candidate Context -> Skill Check -> Difficulty Eligibility -> Anti-Repetition Filter -> Question Bank -> Rank -> Selected Question
 */
export async function getDeterministicScenarioRecommendation(userId, { 
  category = "coding", 
  difficulty = null,
  experienceLevel = null,
  excludeIds = []
} = {}) {
  let targetRole = "Software Engineer";
  let skillGaps = [];
  let readinessScore = 50;

  if (userId) {
    try {
      const [intel, prepDashboard] = await Promise.all([
        getCareerIntelligence(userId).catch(() => ({})),
        getPreparationDashboard(userId).catch(() => ({}))
      ]);

      targetRole = intel?.targetRoles?.[0] || prepDashboard?.targetRole || "Software Engineer";
      skillGaps = prepDashboard?.skillGaps || intel?.skillGaps || [];
      readinessScore = intel?.readinessScore || 50;
    } catch (err) {
      console.warn("[DeterministicSelection] Failed fetching intelligence:", err.message);
    }
  }

  // Determine candidate experience level
  const effectiveExperienceLevel = (experienceLevel || "fresher").toLowerCase();

  // Determine effective difficulty based on fresher progression
  let effectiveDifficulty = difficulty;
  if (!effectiveDifficulty) {
    if (effectiveExperienceLevel === "fresher") {
      effectiveDifficulty = readinessScore > 80 ? "medium" : "easy";
    } else if (effectiveExperienceLevel === "junior") {
      effectiveDifficulty = "medium";
    } else {
      effectiveDifficulty = "medium";
    }
  }

  // 1. Anti-Repetition: Fetch recent rooms completed or created by candidate
  let practicedQuestionIds = new Set(excludeIds || []);
  let practicedTitles = new Set();

  try {
    if (userId) {
      const recentRooms = await PeerInterviewRoom.find({
        "participants.userId": userId
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("problem")
        .lean();

      recentRooms.forEach(room => {
        if (room.problem?.id) practicedQuestionIds.add(String(room.problem.id));
        if (room.problem?.title) {
          practicedTitles.add(room.problem.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
        }
      });
    }
  } catch (err) {
    console.warn("[DeterministicSelection] Anti-repetition fetch error:", err.message);
  }

  // 2. Query Verified Question Bank (Primary Source of Truth)
  const normCategory = category.toLowerCase();
  let pool = getVerifiedQuestions({
    category: normCategory,
    level: effectiveExperienceLevel,
    questionType: normCategory
  });

  if (pool.length === 0) {
    pool = VERIFIED_QUESTION_BANK.filter(q => q.verified === true);
  }

  // 3. Filter by difficulty eligibility & fresher appropriateness
  if (effectiveExperienceLevel === "fresher") {
    const fresherPool = pool.filter(q => q.fresherAppropriate === true);
    if (fresherPool.length > 0) pool = fresherPool;
  }

  if (effectiveDifficulty) {
    const diffPool = pool.filter(q => q.difficulty === effectiveDifficulty);
    if (diffPool.length > 0) pool = diffPool;
  }

  // 4. Apply Anti-Repetition Filter
  let unpracticedCandidates = pool.filter(q => {
    const qId = String(q.id || q._id || "");
    const normTitle = (q.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return !practicedQuestionIds.has(qId) && !practicedTitles.has(normTitle);
  });

  if (unpracticedCandidates.length === 0) {
    unpracticedCandidates = pool;
  }

  // 5. Rank remaining candidate questions against user skill gaps
  const gapNames = skillGaps.map(g => (g.skill || g.canonicalName || "").toLowerCase());
  let bestScenario = null;
  let matchedSkillName = "";

  for (const item of unpracticedCandidates) {
    const concepts = (item.concepts || item.expectedSkills || []).concat(item.topic || []);
    const matched = concepts.find(c => gapNames.some(g => g.includes(String(c).toLowerCase())));
    if (matched) {
      bestScenario = item;
      matchedSkillName = matched;
      break;
    }
  }

  if (!bestScenario) {
    bestScenario = unpracticedCandidates[Math.floor(Math.random() * unpracticedCandidates.length)];
  }

  // Format as standardized scenario problem object
  const scenarioObj = {
    scenarioId: bestScenario.id,
    title: bestScenario.title,
    openingPrompt: bestScenario.description,
    difficulty: bestScenario.difficulty,
    experienceLevel: effectiveExperienceLevel,
    expectedConcepts: bestScenario.concepts || [bestScenario.topic],
    supportedLanguages: bestScenario.supportedLanguages || ["javascript", "python", "java", "cpp"],
    starterCode: bestScenario.starterCode || {},
    starterCanvasElements: bestScenario.starterCanvasElements || [],
    tradeOffsToExplore: bestScenario.constraints || [],
    guidedFollowUps: bestScenario.hints || [],
    source: bestScenario.source || "CURATED",
    sourceUrl: bestScenario.sourceUrl || "",
    verified: bestScenario.verified ?? true,
    testCases: bestScenario.testCases || []
  };

  // 6. Generate transparent explainable rationale card
  let rationale = "";
  const displayLevel = effectiveExperienceLevel.toUpperCase();
  if (matchedSkillName) {
    rationale = `Tailored for ${displayLevel} (${targetRole}). Identifies an active gap in '${matchedSkillName}'. Practicing '${bestScenario.title}' directly addresses this gap.`;
  } else {
    rationale = `Verified ${bestScenario.source} question recommended for ${displayLevel} candidate in ${category.toUpperCase()}. Focuses on foundational problem solving and interview readiness.`;
  }

  return {
    scenario: scenarioObj,
    rationale,
    targetRole,
    experienceLevel: effectiveExperienceLevel,
    difficulty: effectiveDifficulty,
    readinessScore,
    matchedSkill: matchedSkillName || null
  };
}
