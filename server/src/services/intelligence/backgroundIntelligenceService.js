import { Application } from "../../models/Application.js";
import { Resume } from "../../models/Resume.js";
import { extractJobDescription } from "../ai/aiService.js";
import { runMatchPipeline } from "../matching/matchEngine.js";
import { hashText, MATCHING_ENGINE_VERSION } from "../../controllers/matchController.js";
import { MatchResult } from "../../models/MatchResult.js";
import { User } from "../../models/User.js";
import { UserSkill } from "../../models/UserSkill.js";
import { Project } from "../../models/Project.js";

/**
 * Executes the AI intelligence pipeline asynchronously (detached from the request thread).
 * Extracts structured job requirements and optionally runs the match engine.
 * 
 * @param {string} applicationId - ID of the Application
 * @param {string|null} resumeId - Optional ID of the Resume to match against
 */
export async function queueApplicationIntelligence(applicationId, resumeId = null) {
  try {
    // 1. Mark as processing
    await Application.findByIdAndUpdate(applicationId, {
      extractionStatus: "PROCESSING",
      extractionError: null
    });

    const application = await Application.findById(applicationId).lean();
    if (!application) return;

    let extractedJd = application.extractedJd;

    // 2. Extract JD if not already extracted
    if (!extractedJd && application.jobDescription) {
      try {
        extractedJd = await extractJobDescription(application.jobDescription);
        if (!extractedJd || !extractedJd.requiredSkills) {
           throw new Error("AI extraction returned malformed data.");
        }
      } catch (err) {
        console.error(`[IntelligencePipeline] Extraction failed for App ${applicationId}:`, err);
        await Application.findByIdAndUpdate(applicationId, {
          extractionStatus: "FAILED",
          extractionError: "Job analysis couldn't be completed. " + (err.message || "")
        });
        return;
      }
    }

    // 3. Mark extraction as completed
    await Application.findByIdAndUpdate(applicationId, {
      extractedJd,
      extractionStatus: "COMPLETED",
      extractionError: null
    });

    // 4. Run Match Pipeline if Resume is provided
    if (resumeId && extractedJd) {
      try {
        const resume = await Resume.findById(resumeId).lean();
        if (!resume || !resume.structuredData) return;

        const [user, userSkills, projects] = await Promise.all([
          User.findById(application.userId).lean(),
          UserSkill.find({ userId: application.userId }).lean(),
          Project.find({ userId: application.userId }).lean(),
        ]);

        const candidateContext = {
          user,
          userSkills,
          projects,
          careerProfile: {
            targetRoles: user?.targetRoles || [],
            experienceLevel: user?.experienceLevel || "student"
          }
        };

        const pipelineResult = await runMatchPipeline(
          resume.structuredData,
          extractedJd,
          candidateContext
        );

        const resumeHash = hashText(JSON.stringify(resume.structuredData));
        const jdHash = hashText(JSON.stringify(extractedJd));

        const matchResult = await MatchResult.create({
          userId: application.userId,
          applicationId,
          resumeId,
          resumeHash,
          jdHash,
          matchingEngineVersion: MATCHING_ENGINE_VERSION,
          overallScore: pipelineResult.overallScore,
          categoryScores: pipelineResult.categoryScores,
          fitBreakdown: pipelineResult.fitBreakdown,
          matchedSkills: pipelineResult.matchedSkills,
          partialSkills: pipelineResult.partialSkills,
          missingSkills: pipelineResult.missingSkills,
          criticalGaps: pipelineResult.criticalGaps || [],
          importantGaps: pipelineResult.importantGaps || [],
          niceToHaveGaps: pipelineResult.niceToHaveGaps || [],
          actionPlan: pipelineResult.actionPlan || [],
          evidence: pipelineResult.evidence,
          explanation: "Analysis complete.", // Defer heavy explanation generation to UI load if needed
        });

        await Application.findByIdAndUpdate(applicationId, {
          matchResultId: matchResult._id,
          resumeVersionId: resumeId,
        });

      } catch (matchErr) {
        console.error(`[IntelligencePipeline] Matching failed for App ${applicationId}:`, matchErr);
        // Do not fail the JD extraction status if only matching failed.
      }
    }

  } catch (globalErr) {
    console.error(`[IntelligencePipeline] Critical failure for App ${applicationId}:`, globalErr);
    await Application.findByIdAndUpdate(applicationId, {
      extractionStatus: "FAILED",
      extractionError: "Unexpected error during intelligence pipeline."
    }).catch(() => {});
  }
}
