import { Skill } from "../../models/Skill.js";
import { UserSkill } from "../../models/UserSkill.js";
import { normalizeSkill as intelNormalize, compareSkills } from "../skill/skillIntelligenceService.js";

/**
 * Very basic normalization for now. 
 * Over time, this could use an AI service to resolve aliases (e.g. "ReactJS" -> "React").
 */
export async function normalizeSkill(skillName) {
  const name = skillName.trim();
  const lowerName = name.toLowerCase();

  // Leverage robust in-memory taxonomy first
  const intelResult = intelNormalize(name);
  const canonicalTarget = intelResult.canonicalName !== "Unknown" ? intelResult.canonicalName : name;

  // Try to find exact or alias match
  let skill = await Skill.findOne({
    $or: [
      { canonicalName: { $regex: new RegExp(`^${canonicalTarget}$`, "i") } },
      { aliases: { $regex: new RegExp(`^${lowerName}$`, "i") } }
    ]
  });

  if (!skill) {
    // If not found, create it as a new canonical skill
    skill = new Skill({
      canonicalName: canonicalTarget,
      aliases: [lowerName]
    });
    await skill.save();
  }

  return skill;
}

/**
 * Updates a user's proficiency/confidence for a given skill.
 * Proficiency is 0-100.
 */
export async function updateUserSkill(userId, skillName, { proficiencyDelta = 0, confidenceDelta = 0, source }) {
  const skill = await normalizeSkill(skillName);

  let userSkill = await UserSkill.findOne({ userId, canonicalName: skill.canonicalName });

  if (!userSkill) {
    userSkill = new UserSkill({
      userId,
      skillId: skill._id,
      canonicalName: skill.canonicalName,
      proficiency: 50, // default starting points
      confidence: 50,
      sources: []
    });
  }

  // Update logic
  userSkill.proficiency = Math.max(0, Math.min(100, userSkill.proficiency + proficiencyDelta));
  userSkill.confidence = Math.max(0, Math.min(100, userSkill.confidence + confidenceDelta));
  
  if (source && !userSkill.sources.includes(source)) {
    userSkill.sources.push(source);
  }

  userSkill.lastUpdated = Date.now();
  await userSkill.save();

  return userSkill;
}

/**
 * Calculates skill gaps against a list of target skills (e.g., from a JD).
 * Target skills look like { skillName: "React", importance: "HIGH" }
 */
export async function calculateSkillGaps(userId, targetSkills = []) {
  const userSkills = await UserSkill.find({ userId });
  const gaps = [];

  for (const target of targetSkills) {
    // Find best matching user skill using the centralized taxonomy
    let bestMatchProficiency = 0;

    for (const us of userSkills) {
      const match = compareSkills(target.skillName, us.canonicalName);
      // EQUIVALENT (1.0), CHILD (0.85), PARENT (0.85) are considered strong matches
      if (match.score >= 0.85) {
        if (us.proficiency > bestMatchProficiency) {
          bestMatchProficiency = us.proficiency;
        }
      }
    }
    
    // Simple heuristic: HIGH importance needs > 70 proficiency, MEDIUM > 50, LOW > 30.
    let requiredProficiency = 50;
    if (target.importance === "HIGH") requiredProficiency = 70;
    if (target.importance === "LOW") requiredProficiency = 30;

    if (bestMatchProficiency < requiredProficiency) {
      const skill = await normalizeSkill(target.skillName);
      gaps.push({
        skillName: skill.canonicalName,
        importance: target.importance,
        currentProficiency: bestMatchProficiency,
        targetProficiency: requiredProficiency,
        gap: requiredProficiency - bestMatchProficiency
      });
    }
  }

  // Sort gaps by severity (largest gap first)
  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Get all skills for a user
 */
export async function getUserSkills(userId) {
  return await UserSkill.find({ userId }).sort({ proficiency: -1 });
}
