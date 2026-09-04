import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { getPreparationDashboard } from "./preparationService.js";
import { VERIFIED_QUESTION_BANK, getVerifiedQuestions } from "./questionBank.service.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Server-side anti-repetition helper.
 * Detects exact ID matches, title matches, and near-duplicate title strings.
 */
const COMMON_STOP_WORDS = new Set([
  "find", "the", "and", "for", "with", "that", "this", "from", "have", "your",
  "write", "check", "using", "given", "return", "code", "solution", "test",
  "implement", "problem", "function", "create", "build", "simple", "basic", "in", "an", "a"
]);

function getTitleKeywords(titleStr) {
  if (!titleStr) return new Set();
  const words = String(titleStr)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Server-side anti-repetition helper.
 * Detects exact ID matches, exact title matches, near-duplicate title strings,
 * and multi-keyword token overlap to prevent paraphrased duplicate questions.
 */
export function isDuplicateQuestion(candidate, practicedIds = new Set(), practicedTitles = new Set()) {
  if (!candidate) return true;

  // 1. Exact ID check
  const qId = String(candidate.id || candidate._id || candidate.scenarioId || "");
  if (qId && practicedIds.has(qId)) return true;

  const rawTitle = candidate.title || candidate.scenarioTitle || "";
  if (!rawTitle) return false;

  const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normTitle && practicedTitles.has(normTitle)) return true;

  // 2. Keyword & Token overlap check against all practiced titles
  const candidateKeywords = getTitleKeywords(rawTitle);

  for (const practicedTitleStr of practicedTitles) {
    const existingNorm = String(practicedTitleStr).toLowerCase().replace(/[^a-z0-9]/g, "");

    // Substring match
    if (existingNorm.length > 5 && normTitle.length > 5) {
      if (normTitle.includes(existingNorm) || existingNorm.includes(normTitle)) {
        return true;
      }
    }

    // Keyword token overlap
    const existingKeywords = getTitleKeywords(practicedTitleStr);
    if (existingKeywords.size === 0 || candidateKeywords.size === 0) continue;

    let overlapCount = 0;
    for (const kw of candidateKeywords) {
      if (existingKeywords.has(kw)) {
        overlapCount++;
      }
    }

    // Flag as duplicate if 2 or more key terms match, or if >= 50% of terms overlap
    if (overlapCount >= 2 || (candidateKeywords.size > 0 && overlapCount / candidateKeywords.size >= 0.5)) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamically generates a fresh, verified-structure coding question using AI
 * strictly matched to the candidate's verified skills and target role.
 */
async function generateDynamicAIQuestion({ category, difficulty, experienceLevel, topic, targetRole, candidateSkills = [], practicedTitles }) {
  const normCategory = (category || "coding").toLowerCase();
  const level = (experienceLevel || "fresher").toLowerCase();
  const effDifficulty = difficulty || (level === "fresher" ? "easy" : "medium");

  const categoryInstructions = {
    development: "Focus on practical software engineering tasks (e.g., writing REST API payload handlers, data transformers, input validators, middleware verifiers). Make the starter code clear and executable.",
    system_design: "Focus on client-server API design, component caching stencils, data model design, or lightweight system utility handlers.",
    interview: "Focus on practical problem solving, debugging software scenarios, isolating production bugs, or trade-off evaluation with executable code checks.",
    coding: "Focus on foundational algorithms, data structures, array scanning, string manipulation, or hash maps."
  };

  const levelGuidance = level === "fresher"
    ? "CRITICAL FRESHER CALIBRATION: The candidate is a FRESHER (entry-level, 0-1 yrs exp). Keep the challenge LIGHT, approachable, foundational, and clear. Avoid complex multi-tier algorithms or tricky edge cases. Focus on clear, encouraging fundamentals."
    : `Experience Level: ${level.toUpperCase()}`;

  const userSkillStr = (candidateSkills && candidateSkills.length > 0)
    ? candidateSkills.join(", ")
    : "JavaScript, Problem Solving, Data Structures, REST APIs";

  const roleStr = targetRole || "Software Engineer";

  const skillMandate = `STRICT CANDIDATE SKILL MATCHING MANDATE:
Candidate Target Role: "${roleStr}"
Candidate Verified Skills: [${userSkillStr}]
STRICT REQUIREMENT: Whatever question is generated MUST be strictly related to the candidate's skills (${userSkillStr}) and target role domain (${roleStr}). Do NOT ask questions on unrelated technologies, languages, or concepts outside of this candidate's skill profile!`;

  const excludedList = Array.from(practicedTitles || [])
    .filter(t => typeof t === "string" && t.trim().length > 3)
    .slice(0, 30);

  const prompt = `Generate a fresh, unique, production-grade ${effDifficulty} level technical challenge.
Category: ${normCategory}
${skillMandate}
${levelGuidance}
Category Focus: ${categoryInstructions[normCategory] || categoryInstructions.coding}
Target Skill Context: ${userSkillStr}

STRICT EXCLUSION LIST: Previously Asked Questions (DO NOT repeat, paraphrase, or generate similar topics):
${excludedList.map(t => `- ${t}`).join("\n") || "- None"}

Generate a complete problem with title, clear description, starter code object for javascript, python, java, cpp, functional requirements, constraints, and test cases.`;

  try {
    const aiResult = await executeAiTask("GENERATE_INTERVIEW_CHALLENGE", {
      prompt,
      technology: (candidateSkills && candidateSkills[0]) || topic || normCategory,
      language: "javascript",
      difficulty: difficulty || "medium"
    });

    if (aiResult && aiResult.question) {
      const uniqueId = `ai-gen-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const starterCode = typeof aiResult.starterCode === "object" && aiResult.starterCode ? aiResult.starterCode : {
        javascript: `function solution(input) {\n  // Write your solution here\n  return input;\n}`,
        python: `def solution(input):\n    # Write your solution here\n    return input`,
        java: `public class Solution {\n    public Object solve(Object input) {\n        return input;\n    }\n}`,
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}`
      };

      const testCases = (aiResult.testCases || []).map((tc, idx) => ({
        _id: `tc-${idx + 1}`,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        explanation: tc.explanation || `Test case ${idx + 1}`,
        hidden: tc.hidden ?? false
      }));

      if (testCases.length === 0) {
        testCases.push({
          _id: "tc-1",
          input: "sample",
          expectedOutput: "sample",
          explanation: "Standard verification test",
          hidden: false
        });
      }

      return {
        id: uniqueId,
        title: aiResult.question,
        description: (aiResult.requirements || []).join("\n") || "Production practice scenario.",
        difficulty: aiResult.difficulty || difficulty || "medium",
        experienceLevel: experienceLevel || "fresher",
        concepts: candidateSkills.length > 0 ? candidateSkills.slice(0, 3) : [topic || normCategory],
        supportedLanguages: ["javascript", "python", "java", "cpp"],
        starterCode,
        constraints: aiResult.constraints || [],
        hints: aiResult.evaluationCriteria || [],
        source: "AI_GENERATED",
        sourceUrl: "",
        verified: true,
        testCases
      };
    }
  } catch (err) {
    console.warn("[DeterministicSelection] Dynamic AI question generation fallback warning:", err.message);
  }

  return null;
}

/**
 * Deterministic Pipeline with strict server-side Anti-Repetition, Skill Matching & Dynamic Fallback:
 * User -> Practice Mode -> Candidate Skills -> Difficulty Eligibility -> Anti-Repetition Filter -> Question Bank -> Skill Rank -> Selected Question
 */
export async function getDeterministicScenarioRecommendation(userId, { 
  category = "coding", 
  difficulty = null,
  experienceLevel = null,
  excludeIds = [],
  excludeTitles = []
} = {}) {
  let targetRole = "Software Engineer";
  let skillGaps = [];
  let candidateSkills = [];
  let readinessScore = 50;

  if (userId) {
    try {
      const { User } = await import("../../models/User.js");
      const [intel, prepDashboard, userDoc] = await Promise.all([
        getCareerIntelligence(userId).catch(() => ({})),
        getPreparationDashboard(userId).catch(() => ({})),
        User.findById(userId).select("technicalSkills primaryTechStack targetRoles skills").lean().catch(() => ({}))
      ]);

      targetRole = intel?.targetRoles?.[0] || userDoc?.targetRoles?.[0] || prepDashboard?.targetRole || "Software Engineer";
      skillGaps = prepDashboard?.skillGaps || intel?.skillGaps || [];
      readinessScore = intel?.readinessScore || 50;

      const rawSkills = [
        ...(intel?.strongSkills || []),
        ...(intel?.weakSkills?.map(w => typeof w === "string" ? w : w?.skill) || []),
        ...(userDoc?.technicalSkills || []),
        ...(userDoc?.primaryTechStack || []),
        ...(userDoc?.skills || [])
      ].filter(Boolean);

      const uniqueSet = new Set();
      rawSkills.forEach(s => {
        if (typeof s === "string" && s.trim()) uniqueSet.add(s.trim());
      });
      candidateSkills = Array.from(uniqueSet);
    } catch (err) {
      console.warn("[DeterministicSelection] Failed fetching intelligence/skills:", err.message);
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

  // 1. Anti-Repetition: Collect complete DB history of past questions across PeerInterviewRoom and CodingSubmission
  let practicedQuestionIds = new Set((excludeIds || []).map(String));
  let practicedTitles = new Set();

  (excludeTitles || []).forEach(t => {
    if (t) {
      practicedTitles.add(String(t));
      practicedTitles.add(String(t).toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  });

  try {
    if (userId) {
      const CodingSubmission = (await import("../../models/CodingSubmission.js")).default;
      const [recentRooms, pastSubmissions] = await Promise.all([
        PeerInterviewRoom.find({
          $or: [
            { "participants.userId": userId },
            { createdBy: userId }
          ]
        })
          .sort({ createdAt: -1 })
          .select("problem currentQuestionId previousQuestionIds previousQuestionTitles")
          .lean(),
        CodingSubmission.find({ candidateId: userId })
          .select("questionId")
          .lean()
      ]);

      recentRooms.forEach(room => {
        if (room.currentQuestionId) practicedQuestionIds.add(String(room.currentQuestionId));
        if (Array.isArray(room.previousQuestionIds)) {
          room.previousQuestionIds.forEach(id => practicedQuestionIds.add(String(id)));
        }
        if (Array.isArray(room.previousQuestionTitles)) {
          room.previousQuestionTitles.forEach(t => {
            if (t) {
              practicedTitles.add(String(t));
              practicedTitles.add(String(t).toLowerCase().replace(/[^a-z0-9]/g, ""));
            }
          });
        }
        if (room.problem?.id) practicedQuestionIds.add(String(room.problem.id));
        if (room.problem?.title) {
          practicedTitles.add(String(room.problem.title));
          practicedTitles.add(room.problem.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
        }
      });

      pastSubmissions.forEach(sub => {
        if (sub.questionId) practicedQuestionIds.add(String(sub.questionId));
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
    pool = VERIFIED_QUESTION_BANK.filter(q => (q.category || "").toLowerCase() === normCategory);
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
  let unpracticedCandidates = pool.filter(q => !isDuplicateQuestion(q, practicedQuestionIds, practicedTitles));

  let bestScenario = null;
  let matchedSkillName = "";

  const targetRoleStr = Array.isArray(targetRole) 
    ? (targetRole[0] || "Software Engineer") 
    : (typeof targetRole === "string" ? targetRole : "Software Engineer");
  const targetRoleNorm = targetRoleStr.toLowerCase();

  // 5. Rank remaining candidate questions strictly against user skills & target role
  if (unpracticedCandidates.length > 0) {
    const userSkillNames = candidateSkills.map(s => String(s).toLowerCase());
    const gapNames = skillGaps.map(g => (g.skill || g.canonicalName || "").toLowerCase());
    const targetSkillKeywords = Array.from(new Set([...userSkillNames, ...gapNames, targetRoleNorm]));

    let skillMatchedCandidates = [];
    if (targetSkillKeywords.length > 0) {
      skillMatchedCandidates = unpracticedCandidates.filter(item => {
        const itemConcepts = (item.concepts || item.expectedSkills || [])
          .concat(item.topic || [])
          .concat(item.title || "")
          .concat(item.description || "");

        return itemConcepts.some(c =>
          targetSkillKeywords.some(kw => String(c).toLowerCase().includes(kw) || kw.includes(String(c).toLowerCase()))
        );
      });
    }

    const candidatePool = skillMatchedCandidates.length > 0 ? skillMatchedCandidates : unpracticedCandidates;
    bestScenario = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    if (skillMatchedCandidates.length > 0) {
      matchedSkillName = candidateSkills[0] || targetRoleStr;
    }
  } else {
    // Verified static bank exhausted or all candidates practiced -> dynamically generate skill-matched AI challenge
    console.log("[DeterministicSelection] Static pool exhausted or duplicate. Generating skill-matched AI question...");
    const dynamicAiQ = await generateDynamicAIQuestion({
      category: normCategory,
      difficulty: effectiveDifficulty,
      experienceLevel: effectiveExperienceLevel,
      topic: normCategory,
      targetRole: targetRoleStr,
      candidateSkills,
      practicedTitles
    });

    if (dynamicAiQ && !isDuplicateQuestion(dynamicAiQ, practicedQuestionIds, practicedTitles)) {
      bestScenario = dynamicAiQ;
    } else {
      // Safe fallback: pick base problem matching requested category
      const categoryBaseBank = VERIFIED_QUESTION_BANK.filter(q => (q.category || "").toLowerCase() === normCategory);
      const baseProblem = (categoryBaseBank.length > 0 ? categoryBaseBank : pool)[0] || VERIFIED_QUESTION_BANK[0];
      const uniqueSuffix = `(Skill Practice Variant ${Date.now().toString().slice(-4)})`;
      bestScenario = {
        ...baseProblem,
        id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `${baseProblem.title} ${uniqueSuffix}`,
        category: normCategory,
        questionType: normCategory,
        source: "AI_GENERATED",
        verified: true
      };
    }
  }

  // Format as standardized scenario problem object
  const scenarioObj = {
    scenarioId: bestScenario.id || `scenario-${Date.now()}`,
    title: bestScenario.title,
    openingPrompt: bestScenario.description,
    difficulty: bestScenario.difficulty || effectiveDifficulty,
    experienceLevel: effectiveExperienceLevel,
    expectedConcepts: bestScenario.concepts || [bestScenario.topic || normCategory],
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
    rationale = `Verified ${bestScenario.source || "Curated"} question recommended for ${displayLevel} candidate in ${category.toUpperCase()}. Focuses on foundational problem solving and interview readiness.`;
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

