import { Resume } from "../models/Resume.js";
import { Job } from "../models/Job.js";
import { Application } from "../models/Application.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createError } from "../utils/error.js";
import { validateStructuredData } from "../utils/resumeParser.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    const resume = await Resume.findOne({ _id: id, userId: req.user.id });
    if (!resume) {
      return next(createError(404, "Resume not found."));
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return next(createError(404, "Job not found."));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `
    Analyze this resume against the following job description.
    Do NOT fabricate scores. If data is insufficient, note it.
    
    Job Description:
    ${job.description}
    ${job.requirements?.join("\n")}
    
    Resume Data:
    ${JSON.stringify(resume.structuredData)}
    
    Return a JSON object with:
    {
      "matchScore": number (0-100),
      "atsScore": number (0-100),
      "keywordCoverage": number (0-100),
      "missingSkills": [string],
      "foundSkills": [string],
      "healthIndicators": {
        "ats": number,
        "match": number,
        "content": number,
        "clarity": number,
        "completeness": number
      },
      "aiSuggestions": [
        {
          "section": string (e.g. "experience", "skills"),
          "sourceText": string (the text to improve),
          "suggestedText": string (the proposed improvement),
          "reason": string (why this improves the resume),
          "risk": string ("low", "medium", "high")
        }
      ]
    }
    
    Ensure suggestions are grounded in the user's actual resume data. Do not invent experience.
    `;

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());

    resume.matchScore = analysis.matchScore;
    resume.atsScore = analysis.atsScore;
    resume.keywordCoverage = analysis.keywordCoverage;
    resume.missingSkills = analysis.missingSkills;
    resume.healthIndicators = analysis.healthIndicators;
    resume.aiSuggestions = analysis.aiSuggestions;
    
    await resume.save();

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
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are an expert resume writer. 
        The user has selected the following text from their resume:
        "${text}"
        
        Context (which section it belongs to):
        "${context}"
        
        Instruction from user:
        "${instruction}"
        
        Provide an improved version of the text based on the instruction.
        CRITICAL: DO NOT invent fake metrics, fake companies, or fake skills. Only improve the phrasing, impact, and clarity of the existing factual content.
        
        Return ONLY the improved text, nothing else. No markdown formatting.
        `;
        
        const result = await model.generateContent(prompt);
        const suggestion = result.response.text().trim();
        
        res.status(200).json({
            success: true,
            data: suggestion
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
