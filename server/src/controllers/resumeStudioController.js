import { Resume } from "../models/Resume.js";
import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";
import { createError } from "../utils/error.js";
import { analyzeResumeAgainstJob, getInlineResumeSuggestion } from "../services/resume/resumeIntelligenceService.js";


export const saveDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { structuredData } = req.body;

    const resume = await Resume.findOne({ _id: id, userId: req.user.id });
    if (!resume) {
      return next(createError(404, "Resume not found."));
    }

    // Basic analysis on fast save
    const atsScore = calculateBasicATS(structuredData);

    resume.structuredData = structuredData;
    resume.isDraft = true;
    resume.atsScore = atsScore;
    
    await resume.save();

    res.status(200).json({
      success: true,
      data: resume,
      message: "Draft saved successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const saveAsVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { versionName, targetRoleId, structuredData } = req.body;

    const resume = await Resume.findOne({ _id: id, userId: req.user.id });
    if (!resume) {
      return next(createError(404, "Resume not found."));
    }

    // Get highest version number for this user's base resume chain
    // We can assume originalFilename is a good chain identifier for now, or use parentVersionId
    const baseId = resume.parentVersionId || resume._id;
    const highestVersionResume = await Resume.findOne({
      userId: req.user.id,
      $or: [{ _id: baseId }, { parentVersionId: baseId }],
    }).sort({ version: -1 });

    const newVersionNumber = highestVersionResume ? highestVersionResume.version + 1 : 2;

    const atsScore = calculateBasicATS(structuredData || resume.structuredData);

    const newResume = new Resume({
      userId: req.user.id,
      targetRole: resume.targetRole,
      jobId: targetRoleId || resume.jobId,
      name: versionName || `${resume.name} v${newVersionNumber}`,
      originalFilename: resume.originalFilename,
      fileType: resume.fileType,
      rawText: resume.rawText,
      structuredData: structuredData || resume.structuredData,
      version: newVersionNumber,
      parentVersionId: baseId,
      isActive: true,
      isDraft: false,
      atsScore: atsScore,
      // copy other fields if necessary
    });

    await newResume.save();

    // Mark current as not draft if we just saved it
    if (resume.isDraft && structuredData) {
        resume.structuredData = structuredData;
        resume.isDraft = false;
        await resume.save();
    }

    res.status(201).json({
      success: true,
      data: newResume,
      message: "New version saved successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const analyzeAgainstJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { jobId } = req.body;

    const analysis = await analyzeResumeAgainstJob(id, jobId, req.user.id);

    res.status(200).json({
      success: true,
      data: analysis,
      message: "Analysis complete.",
    });
  } catch (error) {
    next(error);
  }
};

export const getInlineAiSuggestion = async (req, res, next) => {
  try {
    const { text, context, instruction } = req.body;
    
    const suggestion = await getInlineResumeSuggestion(text, context, instruction);
    
    res.status(200).json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resumes/:id/improve-bullet
 * Generate 3 AI-rewritten alternatives for a resume bullet.
 * NEVER invents experience or skills — only rewrites what's provided.
 */
export const improveBullet = async (req, res, next) => {
  try {
    const { bullet, section, context } = req.body;

    if (!bullet || !String(bullet).trim()) {
      return res.status(400).json({ success: false, message: "Bullet text is required." });
    }

    const { executeAiTask } = await import("../services/ai/orchestrator.js");

    const systemPrompt = `You are an expert resume writer specializing in strong, ATS-friendly bullet points.

RULES (strictly enforced):
- NEVER invent technologies, companies, metrics, or achievements not present in the original.
- ONLY rewrite, clarify, strengthen, or expand what is explicitly stated.
- Use strong action verbs (Built, Developed, Designed, Led, Reduced, Increased, etc.).
- Add specific technical details only if they appear in the original text.
- Each option should be meaningfully different in phrasing, not just word substitution.
- Return exactly 3 alternatives.

Return valid JSON:
{
  "options": [
    { "text": "improved bullet option A", "rationale": "why this works" },
    { "text": "improved bullet option B", "rationale": "why this works" },
    { "text": "improved bullet option C", "rationale": "why this works" }
  ]
}`;

    const prompt = `Section: ${section || "Experience"}
${context ? `Context: ${context}` : ""}
Original bullet: "${bullet}"

Generate 3 progressively stronger rewrites.`;

    const result = await executeAiTask("COPILOT_CHAT", {
      systemOverride: systemPrompt,
      message: prompt,
      history: []
    });

    // Parse the result — COPILOT_CHAT returns { reply: "..." }
    let options = [];
    try {
      const parsed = typeof result?.reply === "string"
        ? JSON.parse(result.reply)
        : result;
      options = parsed?.options || [];
    } catch (_) {
      // Fallback: wrap reply as single option
      options = [{ text: result?.reply || bullet, rationale: "AI rewrite" }];
    }

    res.status(200).json({
      success: true,
      data: {
        original: bullet,
        options
      }
    });
  } catch (error) {
    next(error);
  }
};

function calculateBasicATS(structuredData) {
    if (!structuredData) return 0;
    let score = 50; // base score
    if (structuredData.basics?.email) score += 5;
    if (structuredData.basics?.phone) score += 5;
    if (structuredData.basics?.summary?.length > 50) score += 10;
    if (structuredData.work?.length > 0) score += 15;
    if (structuredData.education?.length > 0) score += 5;
    if (structuredData.skills?.length > 0) score += 10;
    return Math.min(score, 100);
}
