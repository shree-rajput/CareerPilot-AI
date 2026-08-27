import { Project } from "../../models/Project.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Creates a new project
 */
export async function createProject(userId, projectData) {
  const newProject = new Project({
    userId,
    name: projectData.name,
    technologies: projectData.technologies || [],
    architecture: projectData.architecture || "",
    description: projectData.description || "",
    role: projectData.role || "",
    achievements: projectData.achievements || [],
    complexity: projectData.complexity || "medium",
    relevance: projectData.relevance || 50
  });

  return await newProject.save();
}

/**
 * Generates an interview kit (a set of questions specific to this project)
 * using the AI orchestrator.
 */
export async function generateInterviewKit(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  try {
    // We will assume an AI task "GENERATE_PROJECT_KIT" is configured in taskRouter
    const response = await executeAiTask("GENERATE_PROJECT_KIT", {
      name: project.name,
      technologies: project.technologies,
      architecture: project.architecture,
      description: project.description,
      role: project.role,
      achievements: project.achievements,
      complexity: project.complexity
    });

    if (response && response.kit) {
      project.interviewKit = response.kit;
      await project.save();
      return project.interviewKit;
    }
  } catch (error) {
    console.error("[ProjectService] Failed to generate project interview kit:", error);
    // Fallback kit
    project.interviewKit = [
      {
        question: `Can you explain the overall architecture of ${project.name}?`,
        category: "Architecture",
        difficulty: "medium"
      },
      {
        question: `What was your specific role and biggest challenge when building this project?`,
        category: "Behavioral",
        difficulty: "medium"
      }
    ];
    await project.save();
    return project.interviewKit;
  }
}

/**
 * Get all projects for a user
 */
export async function getProjects(userId) {
  return await Project.find({ userId }).sort({ relevance: -1, createdAt: -1 });
}

/**
 * Get project by ID
 */
export async function getProjectById(projectId) {
  return await Project.findById(projectId);
}
