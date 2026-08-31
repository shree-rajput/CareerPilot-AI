import { User } from "../../models/User.js";
import { Resume } from "../../models/Resume.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Runs the hybrid Deterministic + AI Mentor Matching algorithm.
 * 
 * @param {string} userId - Candidate User ID
 * @returns {Promise<Array>} List of top matched mentors with explanations and scores
 */
export async function matchMentorsForCandidate(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Fetch all approved mentors, excluding the user themselves
  const approvedMentors = await User.find({
    mentorStatus: "approved",
    _id: { $ne: userId }
  }).lean();

  if (approvedMentors.length === 0) {
    return [];
  }

  // Gather candidate parameters
  const targetRoles = (user.targetRoles || []).map(r => r.title.toLowerCase());
  const targetCompanies = (user.targetCompanies || []).map(c => c.toLowerCase());
  const technicalSkills = (user.technicalSkills || []).map(s => s.toLowerCase());

  // Check missing skills from their latest resume
  const latestResume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
  const resumeMissingSkills = latestResume && latestResume.missingSkills
    ? latestResume.missingSkills.map(s => s.toLowerCase())
    : [];
  
  // Gaps are resume missing skills + technical skills that are weak or simply missing
  const candidateGaps = Array.from(new Set([...resumeMissingSkills]));

  const scoredMentors = [];

  for (const mentor of approvedMentors) {
    const profile = mentor.mentorProfile || {};
    const mentorRole = (profile.role || "").toLowerCase();
    const mentorCompany = (profile.company || "").toLowerCase();
    const mentorSkills = (profile.skills || []).map(s => s.toLowerCase());
    const mentorSpecialties = (profile.specialties || []).map(s => s.toLowerCase());

    // 1. Role compatibility (30%)
    let roleScore = 0;
    if (targetRoles.length > 0 && mentorRole) {
      const match = targetRoles.some(r => mentorRole.includes(r) || r.includes(mentorRole));
      roleScore = match ? 100 : 0;
    } else {
      roleScore = 50; // Neutral if no preferences
    }

    // 2. Skill compatibility (25%)
    let skillScore = 0;
    if (candidateGaps.length > 0) {
      const intersection = candidateGaps.filter(gap => 
        mentorSkills.includes(gap) || mentorSpecialties.includes(gap)
      );
      skillScore = Math.round((intersection.length / candidateGaps.length) * 100);
    } else {
      skillScore = 80; // Default high if candidate has no identified gaps
    }

    // 3. Career goals / target companies (15%)
    let companyScore = 0;
    if (targetCompanies.length > 0 && mentorCompany) {
      const match = targetCompanies.some(c => mentorCompany.includes(c) || c.includes(mentorCompany));
      companyScore = match ? 100 : 0;
    } else {
      companyScore = 50;
    }

    // 4. Industry relevance (10%)
    let industryScore = 50; // Base value
    const overlapSpecialties = mentorSpecialties.filter(s => technicalSkills.includes(s));
    if (overlapSpecialties.length > 0) {
      industryScore = 100;
    }

    // 5. Experience relevance (10%)
    const experienceYears = profile.experienceYears || 0;
    let expScore = Math.min(experienceYears * 10, 100);

    // 6. Availability (5%)
    const availabilityScore = (profile.availability && profile.availability.length > 0) ? 100 : 50;

    // 7. Ratings (5%)
    const ratingScore = ((profile.rating || 4.8) / 5.0) * 100;

    // Calculate total weighted match score
    const totalMatchScore = Math.round(
      (roleScore * 0.30) +
      (skillScore * 0.25) +
      (companyScore * 0.15) +
      (industryScore * 0.10) +
      (expScore * 0.10) +
      (availabilityScore * 0.05) +
      (ratingScore * 0.05)
    );

    scoredMentors.push({
      mentorId: mentor._id,
      name: mentor.name,
      email: mentor.email,
      avatar: mentor.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${mentor.name}`,
      mentorProfile: {
        ...profile,
        role: profile.role || "Professional Mentor",
        company: profile.company || "Industry Expert"
      },
      matchBreakdown: {
        role: roleScore,
        skill: skillScore,
        company: companyScore,
        industry: industryScore,
        experience: expScore,
        availability: availabilityScore,
        rating: ratingScore
      },
      matchScore: totalMatchScore,
      isDemo: mentor.email.endsWith("@demo.careerpilot.ai")
    });
  }

  // Sort by match score descending
  scoredMentors.sort((a, b) => b.matchScore - a.matchScore);

  // Take top 10
  const top10 = scoredMentors.slice(0, 10);

  // Generate AI explanations for top 3 mentors in parallel
  // Generate AI explanations for top 3 mentors sequentially to avoid rate limits
  for (const item of top10.slice(0, 3)) {
    try {
      const response = await executeAiTask("GENERATE_MENTOR_EXPLANATION", {
        candidateGaps: candidateGaps.slice(0, 5),
        targetCompanies: user.targetCompanies || [],
        targetRoles: (user.targetRoles || []).map(r => r.title),
        mentorCompany: item.mentorProfile.company,
        mentorRole: item.mentorProfile.role,
        mentorSkills: item.mentorProfile.skills || [],
        mentorBio: item.mentorProfile.bio || ""
      });

      if (response && response.explanation) {
        item.aiExplanation = response.explanation;
      } else {
        throw new Error("Invalid AI response format");
      }
    } catch (error) {
      console.warn(`[MentorMatching] Failed to generate AI explanation for mentor ${item.name}:`, error);
      // Fallback description
      const companyPart = item.mentorProfile.company ? ` at ${item.mentorProfile.company}` : "";
      const skillsMatchList = (item.mentorProfile.skills || []).filter(s => candidateGaps.includes(s.toLowerCase()));
      const skillsPart = skillsMatchList.length > 0 
        ? ` and can help you close your gaps in ${skillsMatchList.slice(0, 2).join(" & ")}` 
        : "";
      item.aiExplanation = `${item.name} is a strong match as a ${item.mentorProfile.role}${companyPart}${skillsPart}.`;
    }
  }

  // Default explanations for the rest
  for (let i = 3; i < top10.length; i++) {
    const item = top10[i];
    const companyPart = item.mentorProfile.company ? ` at ${item.mentorProfile.company}` : "";
    item.aiExplanation = `${item.name} is a matching ${item.mentorProfile.role}${companyPart} based on your career interests.`;
  }

  return top10;
}
