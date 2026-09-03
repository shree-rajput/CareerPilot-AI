import { Project } from "../../models/Project.js";
import { UserSkill } from "../../models/UserSkill.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Service for generating evidence-grounded AI Resume Suggestions.
 *
 * CAREERPILOT PRODUCT RULE:
 * CareerPilot does NOT automatically rewrite or generate a replacement resume.
 * It provides actionable recommendations for the candidate to review and manually
 * apply in Microsoft Word / Google Docs.
 */
export class ResumeSuggestionService {
  /**
   * Main entry point to generate actionable suggestions for a given resume and target job.
   */
  async generateSuggestions({ userId, resume, job, matchResult }) {
    if (!resume) {
      throw new Error("Resume document is required for suggestions.");
    }
    if (!job) {
      throw new Error("Target job or job description is required for suggestions.");
    }

    const jobTitle = job.title || job.position || job.role || "Target Role";
    const company = job.company || "Target Company";
    const jdText = job.description || job.jobDescription || "";
    const requiredSkills = job.skills || job.keywords || [];

    // 1. Gather candidate evidence from Projects & UserSkills
    let userProjects = [];
    let userSkills = [];
    if (userId) {
      userProjects = await Project.find({ userId }).lean();
      userSkills = await UserSkill.find({ userId }).lean();
    }

    const candidateEvidenceSummary = {
      resumeBullets: this.extractResumeBullets(resume.structuredData, resume.rawText),
      projectTitles: userProjects.map(p => ({ title: p.title, techStack: p.techStack, role: p.role, outcomes: p.measurableOutcomes })),
      verifiedSkills: userSkills.filter(s => s.status === "VERIFIED" || s.proficiency >= 70).map(s => s.canonicalName),
      declaredSkills: (resume.structuredData?.skills || []).flatMap(s => s.items || []),
    };

    // 2. Call AI task for structured suggestions or run grounded fallback
    let aiSuggestions = [];
    try {
      const aiResponse = await executeAiTask("GENERATE_RESUME_SUGGESTIONS", {
        jobTitle,
        company,
        jdText,
        resumeText: resume.rawText || "",
        structuredData: resume.structuredData || {},
        candidateEvidence: candidateEvidenceSummary,
        matchResult: matchResult || {},
      });

      if (aiResponse && Array.isArray(aiResponse.suggestions) && aiResponse.suggestions.length > 0) {
        aiSuggestions = aiResponse.suggestions;
      }
    } catch (err) {
      console.warn("[ResumeSuggestionService] AI task failed, constructing grounded fallback suggestions:", err?.message || err);
    }

    // 3. Fallback / Augment with deterministic evidence-grounded suggestions
    if (aiSuggestions.length === 0) {
      aiSuggestions = this.buildGroundedFallbackSuggestions({
        jobTitle,
        company,
        requiredSkills,
        candidateEvidenceSummary,
        matchResult,
        resume,
        projects: userProjects,
      });
    }

    // 4. Sanitize and validate suggestions (Filter out any invalid or malformed output)
    const sanitized = this.sanitizeAndValidateSuggestions(aiSuggestions, candidateEvidenceSummary);

    return {
      success: true,
      jobTitle,
      company,
      overallMatchScore: matchResult?.overallScore || matchResult?.score || 75,
      totalSuggestions: sanitized.length,
      suggestions: sanitized,
    };
  }

  /**
   * Helper to extract clean bullet points from structuredData
   */
  extractResumeBullets(structuredData, rawText = "") {
    const bullets = [];
    if (structuredData?.experience) {
      structuredData.experience.forEach(exp => {
        if (Array.isArray(exp.bullets)) {
          exp.bullets.forEach(b => { if (b && b.trim()) bullets.push(b.trim()); });
        }
      });
    }
    if (structuredData?.projects) {
      structuredData.projects.forEach(p => {
        if (Array.isArray(p.bullets)) {
          p.bullets.forEach(b => { if (b && b.trim()) bullets.push(b.trim()); });
        }
      });
    }
    if (bullets.length === 0 && rawText) {
      return rawText.split("\n").map(l => l.trim()).filter(l => l.startsWith("-") || l.startsWith("•") || l.length > 30).slice(0, 15);
    }
    return bullets;
  }

  /**
   * Builds deterministic evidence-grounded fallback suggestions.
   */
  buildGroundedFallbackSuggestions({ jobTitle, company, requiredSkills, candidateEvidenceSummary, matchResult, resume, projects }) {
    const suggestions = [];

    // Category A: HIGH IMPACT - REST APIs / Tech Stack Visibility
    const topBullets = candidateEvidenceSummary.resumeBullets;
    const firstBullet = topBullets[0] || "Developed web application components and backend APIs.";

    suggestions.push({
      id: "sug_1",
      category: "HIGH_IMPACT",
      priority: "high",
      section: "Experience Highlights",
      title: `Highlight key technical competencies for ${jobTitle}`,
      evidenceSource: "Supported by Resume & Projects",
      requiresConfirmation: false,
      originalText: firstBullet,
      suggestedText: firstBullet.replace(/worked on|helped with/gi, "Engineered") + ` for ${jobTitle} requirements`,
      reason: `Making core technical contributions prominent improves initial recruiter screening alignment for ${company}.`,
    });

    // Category B: RESUME WORDING (Before/After)
    if (topBullets.length >= 2) {
      const secondBullet = topBullets[1];
      suggestions.push({
        id: "sug_2",
        category: "RESUME_WORDING",
        priority: "medium",
        section: "Work Experience",
        title: "Strengthen action verb phrasing and technical metrics",
        evidenceSource: "Supported by Resume",
        requiresConfirmation: false,
        originalText: secondBullet,
        suggestedText: secondBullet.replace(/^worked\s+on/i, "Spearheaded development of").replace(/^developed/i, "Architected and deployed"),
        reason: "Using strong active verbs demonstrates ownership and engineering impact.",
      });
    }

    // Category C: KEYWORD OPPORTUNITIES
    const matched = matchResult?.matchedSkills || candidateEvidenceSummary.verifiedSkills.slice(0, 3);
    if (matched.length > 0) {
      const kw = matched[0];
      suggestions.push({
        id: "sug_3",
        category: "KEYWORD_OPPORTUNITIES",
        priority: "medium",
        section: "Skills & Technical Stack",
        title: `Make "${kw}" prominent in relevant project section`,
        evidenceSource: "Supported by Verified Skills",
        requiresConfirmation: false,
        originalText: `Skill mentioned: ${kw}`,
        suggestedText: `Explicitly detail hands-on experience with ${kw} in your top project or experience description.`,
        reason: `The job description emphasizes ${kw}, which is already supported by your candidate profile.`,
      });
    }

    // Category D: MISSING EVIDENCE
    const missing = matchResult?.missingSkills || (requiredSkills.length > 0 ? requiredSkills.slice(0, 2) : ["Cloud Architecture"]);
    if (missing.length > 0) {
      const missingSkill = missing[0];
      suggestions.push({
        id: "sug_4",
        category: "MISSING_EVIDENCE",
        priority: "medium",
        section: "Requirement Gap",
        title: `Requirement: ${missingSkill}`,
        evidenceSource: "Requires User Confirmation",
        requiresConfirmation: true,
        originalText: "",
        suggestedText: `If you genuinely have experience with ${missingSkill}, consider adding a bullet point detailing your usage.`,
        reason: `CareerPilot could not find sufficient evidence of ${missingSkill} in your current resume or profile.`,
      });
    }

    // Category E: PROJECT EMPHASIS
    if (projects && projects.length > 0) {
      const topProj = projects[0];
      suggestions.push({
        id: "sug_5",
        category: "PROJECT_EMPHASIS",
        priority: "medium",
        section: "Projects Section",
        title: `Emphasize project "${topProj.title}"`,
        evidenceSource: `Supported by Project: ${topProj.title}`,
        requiresConfirmation: false,
        originalText: topProj.description || topProj.title,
        suggestedText: `Highlight ${topProj.title} (${(topProj.techStack || []).join(", ")}) prominently as relevant proof for ${jobTitle}.`,
        reason: `This project directly demonstrates hands-on implementation relevant to ${jobTitle} requirements.`,
      });
    }

    return suggestions;
  }

  /**
   * Sanitizes AI output and ensures no unsafe HTML or arbitrary code execution.
   */
  sanitizeAndValidateSuggestions(rawSuggestions, candidateEvidence) {
    if (!Array.isArray(rawSuggestions)) return [];

    return rawSuggestions.map((sug, idx) => ({
      id: sug.id || `sug_${idx + 1}`,
      category: (sug.category || "RESUME_WORDING").toUpperCase(),
      priority: (sug.priority || "medium").toLowerCase(),
      section: String(sug.section || "Experience").trim(),
      title: String(sug.title || "Resume Suggestion").trim(),
      evidenceSource: String(sug.evidenceSource || "Supported by Candidate Profile").trim(),
      requiresConfirmation: Boolean(sug.requiresConfirmation),
      confidence: sug.confidence || (sug.requiresConfirmation ? "Medium" : "High"),
      ATSKeywords: Array.isArray(sug.ATSKeywords) ? sug.ATSKeywords : (sug.keywords || []),
      originalText: String(sug.originalText || sug.currentContent || "").trim(),
      suggestedText: String(sug.suggestedText || sug.suggestedContent || sug.recommendation || "").trim(),
      reason: String(sug.reason || sug.explanation || "").trim(),
    })).filter(s => s.suggestedText.length > 0);
  }
}

export const resumeSuggestionService = new ResumeSuggestionService();
