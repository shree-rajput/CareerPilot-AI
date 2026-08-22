/**
 * Resume Tailoring Service
 *
 * Uses deterministic MatchResult evidence to generate
 * actionable resume-tailoring recommendations.
 *
 * Rules:
 * - Never invent skills or experience.
 * - Never change semantic match scores.
 * - Use actual resume evidence whenever available.
 */

class ResumeTailoringService {
  tailorResume({ resume, application, matchResult }) {
    if (!resume) {
      throw new Error("Resume is required.");
    }

    if (!application) {
      throw new Error("Application is required.");
    }

    const evidence = matchResult?.evidence || [];

    const recommendations = evidence.map((item) =>
      this.buildRecommendation(item),
    );

    return {
      overallScore: matchResult?.overallScore ?? 0,

      summary: this.buildSummary(matchResult, recommendations),

      recommendations,

      matchedSkills: matchResult?.matchedSkills || [],

      partialSkills: matchResult?.partialSkills || [],

      missingSkills: matchResult?.missingSkills || [],

      keywords: this.extractKeywords(matchResult, application.jobDescription),
    };
  }

  /**
   * Convert one MatchResult evidence item
   * into a tailoring recommendation.
   */
  buildRecommendation(item) {
    const {
      requirement,
      resumeSection,
      resumeEvidence,
      similarityScore = 0,
      classification,
    } = item;

    if (classification === "strong") {
      return {
        requirement,
        status: "strong",
        score: similarityScore,
        resumeSection,
        resumeEvidence,

        action: "highlight",

        recommendation:
          "This requirement is already strongly supported. Keep this experience prominent and make the relevant skill or result easy to notice.",
      };
    }

    if (classification === "partial") {
      return {
        requirement,
        status: "partial",
        score: similarityScore,
        resumeSection,
        resumeEvidence,

        action: "strengthen",

        recommendation:
          "This requirement is partially supported. Strengthen the existing resume bullet by making the relevant technology, responsibility, or outcome more explicit.",
      };
    }

    return {
      requirement,
      status: "missing",
      score: similarityScore,
      resumeSection,
      resumeEvidence,

      action: "review",

      recommendation:
        "No strong supporting evidence was found in the resume. Add this skill or experience only if you genuinely have it.",
    };
  }

  /**
   * Generate summary from deterministic MatchResult data.
   */
  buildSummary(matchResult, recommendations) {
    const strong = recommendations.filter(
      (item) => item.status === "strong",
    ).length;

    const partial = recommendations.filter(
      (item) => item.status === "partial",
    ).length;

    const missing = recommendations.filter(
      (item) => item.status === "missing",
    ).length;

    return {
      overallScore: matchResult?.overallScore ?? 0,

      totalRequirements: recommendations.length,

      strongMatches: strong,
      partialMatches: partial,
      missingMatches: missing,

      coverage:
        recommendations.length > 0
          ? Number(
              (((strong + partial) / recommendations.length) * 100).toFixed(2),
            )
          : 0,
    };
  }

  /**
   * Extract useful keywords from matched/partial skills.
   *
   * These are suggestions only.
   * We never claim that the candidate has a missing skill.
   */
  extractKeywords(matchResult, jdText = "") {
    const matched = matchResult?.matchedSkills || [];
    const partial = matchResult?.partialSkills || [];

    const keywords = [...matched, ...partial];

    return [
      ...new Set(
        keywords.map((keyword) => String(keyword).trim()).filter(Boolean),
      ),
    ];
  }
}

export const resumeTailoringService = new ResumeTailoringService();
