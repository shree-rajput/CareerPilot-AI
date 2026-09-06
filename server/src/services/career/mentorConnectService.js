import { MentorProfile } from "../../models/MentorProfile.js";
import { MentorAvailability } from "../../models/MentorAvailability.js";
import MentorshipSession from "../../models/MentorshipSession.js";
import { MentorshipReview } from "../../models/MentorshipReview.js";
import { User } from "../../models/User.js";
import { compareSkills, normalizeSkillList } from "../skill/skillIntelligenceService.js";

/**
 * Generates available booking slots for a mentor on a specific target date,
 * respecting weekly slot rules, duration, timezone, and overlap checks with existing sessions.
 */
export async function generateAvailableSlots({ mentorId, targetDateStr, durationMinutes = 30 }) {
  const availability = await MentorAvailability.findOne({ mentorId }).lean();
  if (!availability || !availability.weeklySlots || availability.weeklySlots.length === 0) {
    return [];
  }

  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid target date format.");
  }

  // Check blackout dates
  const isBlackedOut = (availability.blackoutDates || []).some(bDate => {
    const bd = new Date(bDate);
    return bd.getUTCFullYear() === targetDate.getUTCFullYear() &&
           bd.getUTCMonth() === targetDate.getUTCMonth() &&
           bd.getUTCDate() === targetDate.getUTCDate();
  });

  if (isBlackedOut) return [];

  const dayOfWeek = targetDate.getUTCDay();
  const dayRules = availability.weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);
  if (dayRules.length === 0) return [];

  // Fetch existing scheduled or live sessions for this mentor on this date
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const existingSessions = await MentorshipSession.find({
    mentorId,
    status: { $in: ["requested", "accepted", "scheduled", "live"] },
    scheduledAt: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  const slotStep = availability.slotDurationMinutes || durationMinutes || 30;
  const slots = [];

  for (const rule of dayRules) {
    let currentMin = rule.startMinutes;
    while (currentMin + slotStep <= rule.endMinutes) {
      const slotStart = new Date(targetDate);
      slotStart.setUTCHours(Math.floor(currentMin / 60), currentMin % 60, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + slotStep * 60 * 1000);

      // Check if slot is in the past
      if (slotStart.getTime() > Date.now()) {
        // Check overlap with existing sessions
        const hasOverlap = existingSessions.some(sess => {
          const sessStart = new Date(sess.scheduledAt).getTime();
          const sessEnd = sessStart + (sess.duration || 30) * 60 * 1000;
          return slotStart.getTime() < sessEnd && slotEnd.getTime() > sessStart;
        });

        if (!hasOverlap) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            formattedTime: slotStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: availability.timezone || "UTC" })
          });
        }
      }

      currentMin += slotStep;
    }
  }

  return slots;
}

/**
 * Calculates a deterministic, explainable match between a candidate and a mentor profile.
 * Does NOT hallucinate claims or fabricate missing data.
 */
export async function calculateDeterministicMatch(candidateId, mentorProfile) {
  const candidate = await User.findById(candidateId).lean();
  if (!candidate) return { score: 50, explanation: "Standard mentor match.", matchSignals: [] };

  const targetRoles = candidate.targetRoles?.map(r => r.title) || [];
  const primaryRole = targetRoles[0] || "Software Engineer";
  const userSkills = candidate.technicalSkills || [];

  const mentorSkills = mentorProfile.skills || mentorProfile.expertiseAreas || [];
  const mentorTopics = mentorProfile.mentoringTopics || mentorProfile.topics || [];

  let score = 50;
  const matchSignals = [];
  const reasons = [];

  // 1. Target Role & Company Match
  if (mentorProfile.company && candidate.targetCompanies?.some(c => c.toLowerCase() === mentorProfile.company.toLowerCase())) {
    score += 25;
    matchSignals.push("TARGET_COMPANY_MATCH");
    reasons.push(`Currently works at ${mentorProfile.company}, one of your target companies`);
  }

  const mentorRoleLower = (mentorProfile.currentRole || mentorProfile.role || "").toLowerCase();
  if (targetRoles.some(tr => mentorRoleLower.includes(tr.toLowerCase()) || tr.toLowerCase().includes(mentorRoleLower))) {
    score += 20;
    matchSignals.push("TARGET_ROLE_MATCH");
    reasons.push(`Has experience as a ${mentorProfile.currentRole || mentorProfile.role}, matching your target role`);
  }

  // 2. Skill Alignment via Centralized Skill Intelligence
  const matchedSkillNames = [];
  for (const uSkill of userSkills) {
    for (const mSkill of mentorSkills) {
      const comp = compareSkills(uSkill, mSkill);
      if (comp.score >= 0.75) {
        matchedSkillNames.push(mSkill);
        break;
      }
    }
  }

  if (matchedSkillNames.length > 0) {
    score += Math.min(20, matchedSkillNames.length * 5);
    matchSignals.push("SKILL_OVERLAP");
    reasons.push(`Shares expertise in ${[...new Set(matchedSkillNames)].slice(0, 3).join(", ")}`);
  }

  // 3. Mentoring Topics
  if (mentorTopics.length > 0) {
    score += 10;
    matchSignals.push("SPECIALIZED_TOPICS");
    reasons.push(`Offers focused sessions in ${mentorTopics.slice(0, 2).join(", ")}`);
  }

  const finalScore = Math.min(100, Math.max(40, score));
  const explanation = reasons.length > 0
    ? `Strong match for your ${primaryRole} preparation: ${reasons.join("; ")}.`
    : `Experienced ${mentorProfile.currentRole} at ${mentorProfile.company} available for 1:1 guidance.`;

  return {
    score: finalScore,
    explanation,
    matchSignals
  };
}

/**
 * Recalculates and updates the aggregate rating and review count for a mentor.
 */
export async function recalculateMentorRating(mentorUserId) {
  const reviews = await MentorshipReview.find({ mentorId: mentorUserId }).lean();
  if (reviews.length === 0) return;

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = Number((totalRating / reviews.length).toFixed(1));

  await MentorProfile.findOneAndUpdate(
    { userId: mentorUserId },
    { rating: avgRating, reviewsCount: reviews.length }
  );

  await User.findByIdAndUpdate(mentorUserId, {
    "mentorProfile.rating": avgRating,
    "mentorProfile.reviewsCount": reviews.length
  });
}
