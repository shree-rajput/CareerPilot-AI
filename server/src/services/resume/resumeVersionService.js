import { ResumeVersion } from "../models/ResumeVersion.js";
import { Resume } from "../models/Resume.js";
import { AppError } from "../utils/errors.js";

class ResumeVersionService {
  /**
   * Create a new resume version.
   */
  async createVersion({
    userId,
    resumeId,
    applicationId = null,
    name,
    type = "tailored",
    resumeData,
    rawText = "",
    atsScore = null,
    matchScore = null,
    changes = [],
  }) {
    if (!userId || !resumeId) {
      throw new AppError(
        "userId and resumeId are required.",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (!resumeData) {
      throw new AppError("resumeData is required.", 400, "VALIDATION_ERROR");
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
    }).lean();

    if (!resume) {
      throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
    }

    const latestVersion = await ResumeVersion.findOne({
      userId,
      resumeId,
    })
      .sort({ version: -1 })
      .lean();

    const nextVersion = latestVersion?.version ? latestVersion.version + 1 : 1;

    // Only one active version
    await ResumeVersion.updateMany(
      {
        userId,
        resumeId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
    );

    const version = await ResumeVersion.create({
      userId,
      resumeId,
      applicationId,
      version: nextVersion,
      name: name || `Resume Version ${nextVersion}`,
      type,
      resumeData,
      rawText,
      atsScore,
      matchScore,
      changes,
      isActive: true,
    });

    return version;
  }

  /**
   * Get all versions of a resume.
   */
  async getVersions({ userId, resumeId }) {
    const versions = await ResumeVersion.find({
      userId,
      resumeId,
    })
      .sort({ version: -1 })
      .lean();

    return versions;
  }

  /**
   * Get one specific version.
   */
  async getVersion({ userId, resumeId, versionId }) {
    const version = await ResumeVersion.findOne({
      _id: versionId,
      userId,
      resumeId,
    }).lean();

    if (!version) {
      throw new AppError("Resume version not found.", 404, "VERSION_NOT_FOUND");
    }

    return version;
  }

  /**
   * Compare two resume versions.
   */
  async compareVersions({ userId, resumeId, fromVersionId, toVersionId }) {
    const [fromVersion, toVersion] = await Promise.all([
      this.getVersion({
        userId,
        resumeId,
        versionId: fromVersionId,
      }),

      this.getVersion({
        userId,
        resumeId,
        versionId: toVersionId,
      }),
    ]);

    const changes = this.generateChanges(
      fromVersion.resumeData,
      toVersion.resumeData,
    );

    return {
      from: {
        id: fromVersion._id,
        version: fromVersion.version,
        name: fromVersion.name,
        atsScore: fromVersion.atsScore,
        matchScore: fromVersion.matchScore,
      },

      to: {
        id: toVersion._id,
        version: toVersion.version,
        name: toVersion.name,
        atsScore: toVersion.atsScore,
        matchScore: toVersion.matchScore,
      },

      scoreImprovement: this.calculateScoreImprovement(
        fromVersion.atsScore,
        toVersion.atsScore,
      ),

      changes,
    };
  }

  /**
   * Restore an old version.
   *
   * This creates a NEW version instead of
   * overwriting/deleting history.
   */
  async restoreVersion({ userId, resumeId, versionId }) {
    const version = await this.getVersion({
      userId,
      resumeId,
      versionId,
    });

    return this.createVersion({
      userId,
      resumeId,
      applicationId: version.applicationId || null,
      name: `Restored from v${version.version}`,
      type: "edited",
      resumeData: version.resumeData,
      rawText: version.rawText,
      atsScore: version.atsScore,
      matchScore: version.matchScore,
      changes: [
        {
          type: "reordered",
          section: "summary",
          original: "",
          updated: "",
          reason: `Restored from resume version ${version.version}.`,
        },
      ],
    });
  }

  /**
   * Generate section-level changes.
   */
  generateChanges(oldResume = {}, newResume = {}) {
    const sections = [
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "certifications",
    ];

    const changes = [];

    for (const section of sections) {
      const oldValue = oldResume[section];

      const newValue = newResume[section];

      const oldNormalized = this.normalizeValue(oldValue);

      const newNormalized = this.normalizeValue(newValue);

      if (oldNormalized === newNormalized) {
        continue;
      }

      let type = "modified";

      if (!oldNormalized && newNormalized) {
        type = "added";
      } else if (oldNormalized && !newNormalized) {
        type = "removed";
      }

      changes.push({
        type,
        section,
        original: this.stringifyValue(oldValue),
        updated: this.stringifyValue(newValue),
        reason: `The ${section} section was ${type}.`,
      });
    }

    return changes;
  }

  /**
   * Normalize values for comparison.
   */
  normalizeValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value.map((item) => this.normalizeValue(item)));
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value).trim().replace(/\s+/g, " ").toLowerCase();
  }

  /**
   * Convert values into readable comparison text.
   */
  stringifyValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value, null, 2);
  }

  /**
   * Calculate ATS score improvement.
   */
  calculateScoreImprovement(oldScore, newScore) {
    if (
      oldScore === null ||
      oldScore === undefined ||
      newScore === null ||
      newScore === undefined
    ) {
      return null;
    }

    return Number((newScore - oldScore).toFixed(2));
  }
}

export const resumeVersionService = new ResumeVersionService();
