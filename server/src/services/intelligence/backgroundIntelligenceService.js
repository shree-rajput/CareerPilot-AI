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
    const application = await Application.findById(applicationId);
    if (!application) return;

    // The intelligence extraction is now handled by the Canonical Job ingestion pipeline.
    // We just mark the Application as completed.
    application.extractionStatus = "COMPLETED";
    application.extractionError = null;
    await application.save();

    // Run Match Pipeline if Resume is provided
    if (resumeId && application.jobId) {
      try {
        const { matchJobToProfile } = await import("../career/jobService.js");
        await matchJobToProfile(application.jobId, application.userId);
        
        const matchResult = await MatchResult.findOne({ 
          jobId: application.jobId, 
          userId: application.userId 
        }).sort({ createdAt: -1 });
        
        if (matchResult) {
          application.matchResultId = matchResult._id;
          application.resumeVersionId = resumeId;
          await application.save();
        }
      } catch (matchErr) {
        console.error(`[IntelligencePipeline] Matching failed for App ${applicationId}:`, matchErr);
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
