import { Project } from "../../models/Project.js";
import { executeAiTask } from "./orchestrator.js";
import { AppError } from "../../utils/errors.js";

/**
 * Handles Ask My Codebase functionality.
 * In a fully integrated system, this would retrieve embeddings from a vector database 
 * indexing the user's GitHub repository. For this phase, we accept an optional code snippet 
 * and rely on the rich Project metadata extracted from their resume.
 */
export async function askMyCodebase(projectId, userId, query, codeSnippet = "") {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    throw new AppError("Project not found or access denied.", 404);
  }

  // We utilize the COPILOT_CHAT task from taskRouter, feeding it project context
  const response = await executeAiTask("COPILOT_CHAT", {
    contextData: `Project Name: ${project.name}\nTechnologies: ${project.technologies.join(", ")}\nArchitecture: ${project.architecture}\nDescription: ${project.description}\n${codeSnippet ? `\nCode Snippet Provided:\n${codeSnippet}` : ""}`,
    query: query
  });

  return response;
}

/**
 * Compares Resume Claims vs Codebase/Project Evidence (Proof of Skill).
 */
export async function generateRealityCheck(projectId, userId, resumeClaims) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  const response = await executeAiTask("PROJECT_REALITY_CHECK", {
    projectName: project.name,
    projectTechnologies: project.technologies.join(", "),
    projectArchitecture: project.architecture || "Not specified",
    resumeClaims: resumeClaims
  });

  return response;
}
