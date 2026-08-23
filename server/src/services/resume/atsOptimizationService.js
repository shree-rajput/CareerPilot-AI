/**
 * ATS Optimization Service
 *
 * Calculates a deterministic ATS optimization score from:
 * - MatchResult
 * - Resume content
 * - Job description
 *
 * IMPORTANT:
 * - No LLM is used for scoring.
 * - Scores are reproducible.
 * - Missing skills are never treated as present.
 */

class AtsOptimizationService {
  /**
   * Main entry point
   */
  calculateScore({
    resume,
    application,
    matchResult,
  }) {
    if (!resume) {
      throw new Error("Resume is required.");
    }

    if (!application) {
      throw new Error("Application is required.");
    }

    if (!matchResult) {
      throw new Error("Match result is required.");
    }

    const overallMatch = this.normalizeScore(
      matchResult.overallScore
    );

    const keywordCoverage =
      this.calculateKeywordCoverage(matchResult);

    const evidenceCoverage =
      this.calculateEvidenceCoverage(matchResult);

    const completeness =
      this.calculateCompleteness(resume);

    const atsScore = this.calculateWeightedScore({
      overallMatch,
      keywordCoverage,
      evidenceCoverage,
      completeness,
    });

    const issues = this.identifyIssues({
      matchResult,
      keywordCoverage,
      evidenceCoverage,
      completeness,
    });

    return {
      score: atsScore,

      rating: this.getRating(atsScore),

      breakdown: {
        semanticMatch: overallMatch,
        keywordCoverage,
        evidenceCoverage,
        resumeCompleteness: completeness,
      },

      matchedSkills:
        matchResult.matchedSkills || [],

      partialSkills:
        matchResult.partialSkills || [],

      missingSkills:
        matchResult.missingSkills || [],

      issues,

      summary: this.createSummary({
        atsScore,
        matchResult,
        issues,
      }),
    };
  }

  /**
   * Convert score into 0-100.
   */
  normalizeScore(score) {
    const value = Number(score) || 0;

    if (value <= 1) {
      return Math.round(value * 100);
    }

    return Math.round(
      Math.min(Math.max(value, 0), 100)
    );
  }

  /**
   * Calculate keyword coverage.
   *
   * matched = fully matched skills
   * partial = partially matched skills
   * missing = unsupported skills
   */
  calculateKeywordCoverage(matchResult) {
    const matched =
      matchResult.matchedSkills?.length || 0;

    const partial =
      matchResult.partialSkills?.length || 0;

    const missing =
      matchResult.missingSkills?.length || 0;

    const total =
      matched + partial + missing;

    if (total === 0) {
      return 0;
    }

    /**
     * Full match = 1
     * Partial match = 0.5
     * Missing = 0
     */
    const coverage =
      ((matched * 1) + (partial * 0.5)) /
      total;

    return Math.round(coverage * 100);
  }

  /**
   * Calculate how many JD requirements
   * have actual resume evidence.
   */
  calculateEvidenceCoverage(matchResult) {
    const evidence =
      matchResult.evidence || [];

    if (!evidence.length) {
      return 0;
    }

    const supported = evidence.filter(
      (item) =>
        item.classification === "strong" ||
        item.classification === "partial"
    ).length;

    return Math.round(
      (supported / evidence.length) * 100
    );
  }

  /**
   * Basic resume completeness check.
   *
   * This does NOT judge quality.
   * It only checks whether useful sections/content exist.
   */
  calculateCompleteness(resume) {
    const checks = [];

    const rawText =
      typeof resume.rawText === "string"
        ? resume.rawText.trim()
        : "";

    checks.push(rawText.length > 100);

    const structuredFields = [
      "skills",
      "experience",
      "projects",
      "education",
    ];

    for (const field of structuredFields) {
      const value = resume[field];

      if (Array.isArray(value)) {
        checks.push(value.length > 0);
      } else if (
        typeof value === "string"
      ) {
        checks.push(value.trim().length > 0);
      } else if (value) {
        checks.push(true);
      } else {
        checks.push(false);
      }
    }

    const completed =
      checks.filter(Boolean).length;

    return Math.round(
      (completed / checks.length) * 100
    );
  }

  /**
   * Calculate final weighted ATS score.
   *
   * Semantic Match      50%
   * Keyword Coverage    25%
   * Evidence Coverage   15%
   * Resume Completeness 10%
   */
  calculateWeightedScore({
    overallMatch,
    keywordCoverage,
    evidenceCoverage,
    completeness,
  }) {
    const score =
      overallMatch * 0.5 +
      keywordCoverage * 0.25 +
      evidenceCoverage * 0.15 +
      completeness * 0.1;

    return Math.round(
      Math.min(Math.max(score, 0), 100)
    );
  }

  /**
   * Identify actionable issues.
   */
  identifyIssues({
    matchResult,
    keywordCoverage,
    evidenceCoverage,
    completeness,
  }) {
    const issues = [];

    const missingSkills =
      matchResult.missingSkills || [];

    const partialSkills =
      matchResult.partialSkills || [];

    if (missingSkills.length > 0) {
      issues.push({
        type: "missing_skills",
        severity:
          missingSkills.length >= 5
            ? "high"
            : "medium",
        message:
          `${missingSkills.length} required skill(s) have no supporting resume evidence.`,
        count: missingSkills.length,
        items: missingSkills.slice(0, 10),
      });
    }

    if (partialSkills.length > 0) {
      issues.push({
        type: "partial_matches",
        severity: "medium",
        message:
          `${partialSkills.length} skill(s) have only partial evidence.`,
        count: partialSkills.length,
        items: partialSkills.slice(0, 10),
      });
    }

    if (keywordCoverage < 60) {
      issues.push({
        type: "keyword_coverage",
        severity: "high",
        message:
          "Resume keyword coverage is low compared with the job requirements.",
      });
    } else if (keywordCoverage < 80) {
      issues.push({
        type: "keyword_coverage",
        severity: "medium",
        message:
          "Some important job keywords are not strongly represented in the resume.",
      });
    }

    if (evidenceCoverage < 60) {
      issues.push({
        type: "evidence_coverage",
        severity: "high",
        message:
          "Many job requirements do not have strong supporting evidence in the resume.",
      });
    }

    if (completeness < 70) {
      issues.push({
        type: "resume_completeness",
        severity: "medium",
        message:
          "Some important resume sections appear to be incomplete.",
      });
    }

    return issues;
  }

  /**
   * Human-readable rating.
   */
  getRating(score) {
    if (score >= 90) {
      return "Excellent";
    }

    if (score >= 80) {
      return "Very Good";
    }

    if (score >= 70) {
      return "Good";
    }

    if (score >= 60) {
      return "Needs Improvement";
    }

    return "Poor";
  }

  /**
   * Create a concise summary.
   */
  createSummary({
    atsScore,
    matchResult,
    issues,
  }) {
    const missing =
      matchResult.missingSkills?.length || 0;

    const partial =
      matchResult.partialSkills?.length || 0;

    return {
      score: atsScore,

      rating: this.getRating(atsScore),

      message:
        atsScore >= 80
          ? "Your resume is well aligned with this job description."
          : atsScore >= 60
            ? "Your resume has a reasonable match but could be improved."
            : "Your resume needs significant improvement for this job.",

      missingSkills: missing,
      partialMatches: partial,
      issues: issues.length,
    };
  }
}

export const atsOptimizationService =
  new AtsOptimizationService();