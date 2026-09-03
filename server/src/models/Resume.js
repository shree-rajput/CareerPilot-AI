import mongoose from "mongoose";

const auditTrailSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["manual", "ai", "upload", "tailor", "template"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const parseabilityReportSchema = new mongoose.Schema(
  {
    textExtractable: {
      type: Boolean,
      default: false,
    },
    readingOrderMatches: {
      type: Boolean,
      default: false,
    },
    contactInfoDetected: {
      type: Boolean,
      default: false,
    },
    hasProblematicStructure: {
      type: Boolean,
      default: false, // true if tables, columns, or images as text are detected
    },
    missingText: {
      type: [String],
      default: [],
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      trim: true,
      default: "",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: "My Resume",
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    originalFilename: {
      type: String,
      trim: true,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt", "json"],
      default: "json",
    },
    mimeType: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    cloudinaryUrl: {
      type: String,
      default: "",
    },
    cloudinaryPublicId: {
      type: String,
      default: "",
    },
    cloudinaryAssetId: {
      type: String,
      default: "",
    },
    cloudinaryResourceType: {
      type: String,
      default: "raw",
    },
    cloudinaryFormat: {
      type: String,
      default: "",
    },
    parsingStatus: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },
    rawText: {
      type: String,
      default: "",
    },
    // Structured JSON content schema
    structuredData: {
      personal: {
        fullName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        location: { type: String, default: "" },
        linkedinUrl: { type: String, default: "" },
        githubUrl: { type: String, default: "" },
        portfolioUrl: { type: String, default: "" },
      },
      summary: { type: String, default: "" },
      experience: [
        {
          id: { type: String },
          company: { type: String, default: "" },
          role: { type: String, default: "" },
          location: { type: String, default: "" },
          startDate: { type: String, default: "" },
          endDate: { type: String, default: "" },
          current: { type: Boolean, default: false },
          bullets: [{ type: String }],
        },
      ],
      education: [
        {
          id: { type: String },
          institution: { type: String, default: "" },
          degree: { type: String, default: "" },
          fieldOfStudy: { type: String, default: "" },
          location: { type: String, default: "" },
          startDate: { type: String, default: "" },
          endDate: { type: String, default: "" },
          gpa: { type: String, default: "" },
        },
      ],
      projects: [
        {
          id: { type: String },
          title: { type: String, default: "" },
          role: { type: String, default: "" },
          techStack: [{ type: String }],
          description: { type: String, default: "" },
          bullets: [{ type: String }],
          link: { type: String, default: "" },
        },
      ],
      skills: [
        {
          category: { type: String, default: "Technical Skills" },
          items: [{ type: String }],
        },
      ],
      certifications: [
        {
          id: { type: String },
          date: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
      coursework: [{ type: String }],
      extracurriculars: [
        {
          id: { type: String },
          organization: { type: String, default: "" },
          role: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
      achievements: [
        {
          id: { type: String },
          title: { type: String, default: "" },
          issuer: { type: String, default: "" },
          date: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
    },

    // Tree-based versioning
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    versionTreeRootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    createdFrom: {
      type: String,
      enum: ["template", "upload", "tailor"],
      default: "upload",
    },
    templateId: {
      type: String,
      default: "classic",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },

    // Keyword Match % for a specific job (kept separate from structural parseability)
    matchScore: {
      type: Number,
      default: null,
    },
    keywordCoverage: {
      type: Number,
      default: null,
    },
    missingSkills: {
      type: [String],
      default: [],
    },

    // Structural Parseability Checklist (Pass/Fail facts, NO aggregate ATS score)
    parseabilityReport: {
      type: parseabilityReportSchema,
      default: () => ({}),
    },

    // Change tracking log
    auditTrail: {
      type: [auditTrailSchema],
      default: [],
    },
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, versionTreeRootId: 1 });

export const Resume = mongoose.model("Resume", resumeSchema);
