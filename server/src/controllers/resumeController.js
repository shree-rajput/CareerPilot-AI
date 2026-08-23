import { env } from "../config/env.js";
import { Resume } from "../models/Resume.js";
import { structureResume } from "../services/ai/aiService.js";
import { compareResumeVersions } from "../services/resume/diffService.js";
import { structureResumeLocally } from "../services/resume/localResumeStructurer.js";
import {
  extractPdfText,
  extractTxtText,
} from "../services/resume/pdfParser.js";
import { extractDocxText } from "../services/resume/docxParser.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkAiLimit, incrementAiUsage } from "../utils/aiUsage.js";
import { AppError } from "../utils/errors.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

/**
 * POST /api/resume/upload
 * Accepts multipart/form-data with a `resume` file field.
 */
// export const uploadResume = asyncHandler(async (req, res) => {
//   if (!req.file) {
//     throw new AppError(
//       "No file uploaded. Please attach a PDF or TXT file.",
//       400,
//       "NO_FILE",
//     );
//   }

//   const { mimetype, originalname, buffer, size } = req.file;
//   const maxBytes = env.maxFileSizeMb * 1024 * 1024;

//   if (size > maxBytes) {
//     throw new AppError(
//       `File too large. Maximum allowed size is ${env.maxFileSizeMb} MB.`,
//       413,
//       "FILE_TOO_LARGE",
//     );
//   }

//   const isPdf =
//     mimetype === "application/pdf" ||
//     originalname.toLowerCase().endsWith(".pdf");
//   const isTxt =
//     mimetype === "text/plain" || originalname.toLowerCase().endsWith(".txt");

//   if (!isPdf && !isTxt) {
//     throw new AppError(
//       "Only PDF and TXT files are accepted.",
//       415,
//       "UNSUPPORTED_FILE_TYPE",
//     );
//   }

//   // Extract raw text
//   let rawText;
//   try {
//     rawText = isPdf ? await extractPdfText(buffer) : extractTxtText(buffer);
//   } catch (error) {
//     throw error; // Already an AppError from pdfParser
//   }

//   // Upload to Cloudinary
//   let cloudinaryResult = null;
//   const warnings = [];

//   if (env.cloudinaryCloudName) {
//     try {
//       // We upload as 'raw' resource type for PDFs and text files so it's a direct file download
//       cloudinaryResult = await uploadBufferToCloudinary(
//         buffer,
//         "resumes",
//         "raw",
//       );
//     } catch (error) {
//       console.error("Cloudinary upload error:", error.message);
//       warnings.push(
//         "Resume text was extracted, but the original file could not be stored in Cloudinary.",
//       );
//     }
//   } else {
//     warnings.push(
//       "Cloudinary is not configured, so the original file was not stored. Parsed resume data was saved.",
//     );
//   }

//   // Structure with AI
//   let structuredData = structureResumeLocally(rawText);
//   let aiStructured = false;

//   const { allowed, used, limit } = await checkAiLimit(
//     req.user._id,
//     "resume_analysis",
//     env.aiLimitResumeAnalysis,
//   );

//   try {
//     if (allowed) {
//       structuredData = {
//         ...(await structureResume(rawText)),
//         parserSource: "ai",
//       };
//       aiStructured = true;
//       await incrementAiUsage(req.user._id, "resume_analysis");
//     } else {
//       warnings.push(
//         `Daily resume AI analysis limit reached (${used}/${limit}). Saved local structured data instead.`,
//       );
//     }
//   } catch (error) {
//     console.error("Resume structuring AI error:", error.message);
//     warnings.push(
//       "AI extraction failed. Saved local structured data extracted directly from the resume text.",
//     );
//   }

//   // Build name from filename
//   const baseName = originalname
//     .replace(/\.(pdf|txt)$/i, "")
//     .replace(/[-_]/g, " ");
//   const label = req.body.label?.trim() || "";
//   const parentVersionId = req.body.parentVersionId || null;

//   // Determine version number
//   let version = 1;
//   if (parentVersionId) {
//     const parent = await Resume.findOne({
//       _id: parentVersionId,
//       userId: req.user._id,
//     });
//     if (parent) version = parent.version + 1;
//   }

//   const resume = await Resume.create({
//     userId: req.user._id,
//     name: baseName || "My Resume",
//     label,
//     originalFilename: originalname,
//     fileType: isPdf ? "pdf" : "txt",
//     cloudinaryUrl: cloudinaryResult?.secure_url || "",
//     cloudinaryPublicId: cloudinaryResult?.public_id || "",
//     rawText,
//     structuredData,
//     version,
//     parentVersionId: parentVersionId || null,
//   });

//   // Check if we need to replace an old Cloudinary file if parentVersionId was provided
//   // and we want to overwrite it. But versioning implies keeping old ones.
//   // The user requirement says: "If a user uploads a new resume and an old Cloudinary resume already exists: Delete the old Cloudinary file if appropriate."
//   // Wait, if it's a version history, maybe they shouldn't be deleted?
//   // Let's check deleteResume function. We can delete it there.
//   // The prompt says: "If a user uploads a new resume and an old Cloudinary resume already exists: Upload the new resume to Cloudinary. Update the database with the new URL/public ID. Delete the old Cloudinary file if appropriate. Do not leave unnecessary duplicate files on Cloudinary."
//   // Wait! A completely new upload creates a new Resume document (v1, or v+1). The frontend doesn't seem to pass parentVersionId except maybe for explicit versioning.
//   // Actually, if it's the exact same resume or replacing it, maybe we delete it if it's replaced. The current system creates a new version: `const resume = await Resume.create(...)`. So it's keeping the old document in the DB.
//   // I will just leave the old files if they are creating a new version, unless they delete the resume via the delete endpoint.

//   return res.status(201).json({
//     message: aiStructured
//       ? "Resume uploaded, parsed, and structured successfully."
//       : "Resume uploaded and parsed. Saved local structured data because AI structuring was unavailable.",
//     resume: {
//       _id: resume._id,
//       name: resume.name,
//       label: resume.label,
//       fileType: resume.fileType,
//       version: resume.version,
//       cloudinaryUrl: resume.cloudinaryUrl,
//       hasStructuredData: Boolean(structuredData),
//       parserSource: structuredData?.parserSource || "local",
//       createdAt: resume.createdAt,
//     },
//     status: {
//       textExtracted: Boolean(rawText),
//       originalStored: Boolean(cloudinaryResult),
//       aiStructured,
//       parserSource: structuredData?.parserSource || "local",
//       warnings,
//     },
//   });
// });

/**
 * POST /api/resume/upload
 * Accepts multipart/form-data with a `resume` file field.
 *
 * Supported formats:
 * - PDF
 * - DOCX
 * - TXT
 */

export const uploadResume = asyncHandler(async (req, res) => {
  // ============================================================
  // 1. CHECK FILE
  // ============================================================

  if (!req.file) {
    throw new AppError(
      "No file uploaded. Please attach a PDF, DOCX, or TXT file.",
      400,
      "NO_FILE",
    );
  }

  const { mimetype, originalname, buffer, size } = req.file;

  // ============================================================
  // 2. FILE SIZE VALIDATION
  // ============================================================

  const maxBytes = env.maxFileSizeMb * 1024 * 1024;

  if (size > maxBytes) {
    throw new AppError(
      `File too large. Maximum allowed size is ${env.maxFileSizeMb} MB.`,
      413,
      "FILE_TOO_LARGE",
    );
  }

  // ============================================================
  // 3. DETECT FILE TYPE
  // ============================================================

  const filename = originalname.toLowerCase();

  const isPdf = mimetype === "application/pdf" || filename.endsWith(".pdf");

  const isDocx =
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx");

  const isTxt = mimetype === "text/plain" || filename.endsWith(".txt");

  if (!isPdf && !isDocx && !isTxt) {
    throw new AppError(
      "Only PDF, DOCX, and TXT files are accepted.",
      415,
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  // ============================================================
  // 4. DETERMINE NORMALIZED FILE TYPE
  // ============================================================

  const fileType = isPdf ? "pdf" : isDocx ? "docx" : "txt";

  // ============================================================
  // 5. EXTRACT TEXT
  // ============================================================

  let rawText;

  try {
    if (isPdf) {
      rawText = await extractPdfText(buffer);
    } else if (isDocx) {
      rawText = await extractDocxText(buffer);
    } else {
      rawText = extractTxtText(buffer);
    }
  } catch (error) {
    // Parsers already throw AppError with meaningful codes.
    throw error;
  }

  // ============================================================
  // 6. FINAL TEXT VALIDATION
  // ============================================================

  if (!rawText || rawText.trim().length < 50) {
    throw new AppError(
      "Could not extract enough readable text from this resume.",
      422,
      "INSUFFICIENT_RESUME_TEXT",
    );
  }

  rawText = rawText.trim();

  // ============================================================
  // 7. UPLOAD ORIGINAL FILE TO CLOUDINARY
  // ============================================================

  let cloudinaryResult = null;

  const warnings = [];

  if (env.cloudinaryCloudName) {
    try {
      /*
       * Use "raw" because resumes are documents rather than
       * images that need Cloudinary image transformations.
       */
      cloudinaryResult = await uploadBufferToCloudinary(
        buffer,
        "resumes",
        "raw",
      );
    } catch (error) {
      console.error("Cloudinary upload error:", error.message);

      warnings.push(
        "Resume text was extracted, but the original file could not be stored in Cloudinary.",
      );
    }
  } else {
    warnings.push(
      "Cloudinary is not configured, so the original file was not stored. Parsed resume data was saved.",
    );
  }

  // ============================================================
  // 8. LOCAL STRUCTURED DATA FALLBACK
  // ============================================================

  let structuredData = structureResumeLocally(rawText);
  let aiStructured = false;

  // ============================================================
  // 9. CHECK AI USAGE LIMIT
  // ============================================================

  const { allowed, used, limit } = await checkAiLimit(
    req.user._id,
    "resume_analysis",
    env.aiLimitResumeAnalysis,
  );

  // ============================================================
  // 10. AI STRUCTURED EXTRACTION
  // ============================================================

  try {
    if (allowed) {
      const aiResult = await structureResume(rawText);

      structuredData = {
        ...aiResult,
        parserSource: "ai",
      };

      aiStructured = true;

      await incrementAiUsage(req.user._id, "resume_analysis");
    } else {
      warnings.push(
        `Daily resume AI analysis limit reached (${used}/${limit}). Saved local structured data instead.`,
      );
    }
  } catch (error) {
    console.error("Resume structuring AI error:", error.message);

    warnings.push(
      "AI extraction failed. Saved local structured data extracted directly from the resume text.",
    );
  }

  // ============================================================
  // 11. BUILD RESUME NAME
  // ============================================================

  const baseName = originalname
    .replace(/\.(pdf|docx|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();

  const label = req.body.label?.trim() || "";

  const parentVersionId = req.body.parentVersionId || null;

  // ============================================================
  // 12. DETERMINE VERSION
  // ============================================================

  let version = 1;

  if (parentVersionId) {
    const parent = await Resume.findOne({
      _id: parentVersionId,
      userId: req.user._id,
    });

    if (parent) {
      version = parent.version + 1;
    }
  }

  // ============================================================
  // 13. SAVE RESUME TO DATABASE
  // ============================================================

  const resume = await Resume.create({
    userId: req.user._id,

    name: baseName || "My Resume",

    label,

    originalFilename: originalname,

    fileType,

    cloudinaryUrl: cloudinaryResult?.secure_url || "",

    cloudinaryPublicId: cloudinaryResult?.public_id || "",

    rawText,

    structuredData,

    version,

    parentVersionId: parentVersionId || null,
  });

  // ============================================================
  // 14. RESPONSE
  // ============================================================

  return res.status(201).json({
    message: aiStructured
      ? "Resume uploaded, parsed, and structured successfully."
      : "Resume uploaded and parsed. Saved local structured data because AI structuring was unavailable.",

    resume: {
      _id: resume._id,

      name: resume.name,

      label: resume.label,

      originalFilename: resume.originalFilename,

      fileType: resume.fileType,

      version: resume.version,

      cloudinaryUrl: resume.cloudinaryUrl,

      hasRawText: Boolean(resume.rawText),

      hasStructuredData: Boolean(resume.structuredData),

      parserSource: structuredData?.parserSource || "local",

      createdAt: resume.createdAt,
    },

    status: {
      textExtracted: Boolean(rawText),

      originalStored: Boolean(cloudinaryResult),

      aiStructured,

      parserSource: structuredData?.parserSource || "local",

      warnings,
    },
  });
});

/**
 * GET /api/resume
 * List all active resumes for the authenticated user.
 */
export const getResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ userId: req.user._id, isActive: true })
    .sort({ createdAt: -1 })
    .select(
      "name label originalFilename fileType cloudinaryUrl version structuredData createdAt updatedAt",
    )
    .lean();

  return res.json({
    resumes: resumes.map((resume) => ({
      ...resume,
      structuredData: undefined,
      hasStructuredData: Boolean(resume.structuredData),
      parserSource: resume.structuredData?.parserSource || "",
    })),
  });
});

/**
 * GET /api/resume/:id/versions
 *
 * Get all versions belonging to the same resume chain.
 */
export const getResumeVersions = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  })
    .select("_id version parentVersionId")
    .lean();

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  /*
   * Walk backwards through the parentVersionId chain.
   */
  const versions = [];

  let currentId = resume._id;

  while (currentId) {
    const current = await Resume.findOne({
      _id: currentId,
      userId: req.user._id,
    })
      .select(
        "_id name label originalFilename fileType version parentVersionId createdAt updatedAt",
      )
      .lean();

    if (!current) {
      break;
    }

    versions.push(current);

    currentId = current.parentVersionId;
  }

  return res.json({
    versions: versions.sort((a, b) => a.version - b.version),
  });
});

/**
 * POST /api/resume/:id/restore
 *
 * Restore an old resume version by creating
 * a new version from it.
 */
export const restoreResumeVersion = asyncHandler(async (req, res) => {
  const sourceResume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).lean();

  if (!sourceResume) {
    throw new AppError("Resume version not found.", 404, "RESUME_NOT_FOUND");
  }

  /*
   * Find the latest version in this user's
   * resume chain.
   */
  const latestResume = await Resume.findOne({
    userId: req.user._id,
    $or: [
      { _id: sourceResume._id },
      {
        parentVersionId: sourceResume._id,
      },
    ],
  })
    .sort({ version: -1 })
    .lean();

  /*
   * Because the chain can be longer than one level,
   * find the maximum version belonging to this chain.
   */
  const allUserVersions = await Resume.find({
    userId: req.user._id,
  })
    .select("_id version parentVersionId")
    .sort({ version: -1 })
    .lean();

  const chainIds = new Set([String(sourceResume._id)]);

  let changed = true;

  while (changed) {
    changed = false;

    for (const item of allUserVersions) {
      if (
        item.parentVersionId &&
        chainIds.has(String(item.parentVersionId)) &&
        !chainIds.has(String(item._id))
      ) {
        chainIds.add(String(item._id));
        changed = true;
      }
    }
  }

  const chainVersions = allUserVersions.filter((item) =>
    chainIds.has(String(item._id)),
  );

  const maxVersion =
    chainVersions.length > 0
      ? Math.max(...chainVersions.map((item) => item.version))
      : sourceResume.version;

  /*
   * Create a NEW version.
   * Never overwrite the old version.
   */
  const restoredResume = await Resume.create({
    userId: req.user._id,

    name: sourceResume.name,

    label: sourceResume.label
      ? `${sourceResume.label} (Restored)`
      : "Restored Resume",

    originalFilename: sourceResume.originalFilename,

    fileType: sourceResume.fileType,

    cloudinaryUrl: sourceResume.cloudinaryUrl,

    cloudinaryPublicId: sourceResume.cloudinaryPublicId,

    rawText: sourceResume.rawText,

    structuredData: sourceResume.structuredData,

    version: maxVersion + 1,

    parentVersionId: sourceResume._id,

    isActive: true,
  });

  return res.status(201).json({
    message: `Resume version ${sourceResume.version} restored successfully.`,

    resume: {
      _id: restoredResume._id,
      name: restoredResume.name,
      label: restoredResume.label,
      version: restoredResume.version,
      parentVersionId: restoredResume.parentVersionId,
      createdAt: restoredResume.createdAt,
    },
  });
});
/**
 * GET /api/resume/:id
 * Get full resume detail including structured data.
 */
export const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).lean();

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  return res.json({ resume });
});

/**
 * DELETE /api/resume/:id
 * Soft-delete a resume.
 */
export const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!resume) {
    throw new AppError("Resume not found.", 404, "RESUME_NOT_FOUND");
  }

  if (resume.cloudinaryPublicId) {
    try {
      await deleteFromCloudinary(resume.cloudinaryPublicId, "raw");
    } catch (err) {
      console.error("Failed to delete from Cloudinary:", err);
    }
  }

  resume.isActive = false;
  await resume.save();

  return res.json({ message: "Resume deleted." });
});

/**
 * GET /api/resume/diff?v1=:id&v2=:id
 * Compare two resume versions.
 */
export const diffResumeVersions = asyncHandler(async (req, res) => {
  const { v1, v2 } = req.query;

  if (!v1 || !v2) {
    throw new AppError(
      "Both v1 and v2 query parameters are required.",
      400,
      "MISSING_PARAMS",
    );
  }

  const [resumeA, resumeB] = await Promise.all([
    Resume.findOne({ _id: v1, userId: req.user._id })
      .select("rawText name version label")
      .lean(),
    Resume.findOne({ _id: v2, userId: req.user._id })
      .select("rawText name version label")
      .lean(),
  ]);

  if (!resumeA || !resumeB) {
    throw new AppError(
      "One or both resume versions not found.",
      404,
      "RESUME_NOT_FOUND",
    );
  }

  const diff = compareResumeVersions(resumeA.rawText, resumeB.rawText);

  return res.json({
    versionA: {
      _id: resumeA._id,
      name: resumeA.name,
      version: resumeA.version,
      label: resumeA.label,
    },
    versionB: {
      _id: resumeB._id,
      name: resumeB.name,
      version: resumeB.version,
      label: resumeB.label,
    },
    diff,
  });
});
