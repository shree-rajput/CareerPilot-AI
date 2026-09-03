import { Project } from "../../models/Project.js";
import { Resume } from "../../models/Resume.js";
import { Application } from "../../models/Application.js";
import { executeAiTask } from "../ai/orchestrator.js";

/**
 * Creates a new project manually
 */
export async function createProject(userId, projectData) {
  const newProject = new Project({
    userId,
    name: projectData.name,
    technologies: Array.isArray(projectData.technologies) 
      ? projectData.technologies 
      : (projectData.technologies || "").split(",").map(s => s.trim()).filter(Boolean),
    architecture: projectData.architecture || "",
    description: projectData.description || "",
    role: projectData.role || "",
    achievements: Array.isArray(projectData.achievements)
      ? projectData.achievements
      : (projectData.achievements || "").split("\n").map(s => s.trim()).filter(Boolean),
    githubUrl: projectData.githubUrl || projectData.link || "",
    evidenceSource: projectData.evidenceSource || "user",
    confidence: projectData.confidence || 90,
    database: projectData.database || "",
    apis: projectData.apis || "",
    deployment: projectData.deployment || "",
    challenges: projectData.challenges || "",
    complexity: projectData.complexity || "medium",
    relevance: projectData.relevance || 50
  });

  return await newProject.save();
}

/**
 * Syncs/extracts project evidence from active Resume into Project collection.
 * Does NOT overwrite existing manual edits.
 */
export async function syncProjectsFromResume(userId) {
  try {
    const resume = await Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).lean();
    if (!resume || !resume.structuredData || !Array.isArray(resume.structuredData.projects)) {
      return [];
    }

    const existingProjects = await Project.find({ userId }).lean();
    const existingNames = new Set(existingProjects.map(p => p.name.trim().toLowerCase()));

    const created = [];
    for (const rProj of resume.structuredData.projects) {
      const pName = rProj.title || rProj.name;
      if (!pName || existingNames.has(pName.trim().toLowerCase())) continue;

      const techStack = Array.isArray(rProj.techStack) 
        ? rProj.techStack 
        : Array.isArray(rProj.technologies) ? rProj.technologies : [];
      
      const achievements = Array.isArray(rProj.bullets) 
        ? rProj.bullets 
        : Array.isArray(rProj.achievements) ? rProj.achievements : [];

      const newProject = new Project({
        userId,
        name: pName,
        description: rProj.description || (achievements[0] ? `Project focused on ${achievements[0]}` : "Project extracted from candidate resume."),
        role: rProj.role || "Developer",
        technologies: techStack,
        achievements,
        githubUrl: rProj.link || "",
        evidenceSource: "resume",
        confidence: 80,
        complexity: techStack.length > 4 ? "high" : "medium"
      });

      await newProject.save();
      created.push(newProject);
      existingNames.add(pName.trim().toLowerCase());
    }

    return created;
  } catch (err) {
    console.error("[ProjectService] Error syncing projects from resume:", err);
    return [];
  }
}

/**
 * Generates an evidence-grounded interview question kit specific to this project,
 * connected to target job requirements if available.
 */
export async function generateInterviewKit(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  // Fetch active application for job requirement connection
  const activeApp = await Application.findOne({ userId: project.userId })
    .sort({ createdAt: -1 })
    .select("company role extractedJd")
    .lean();

  const requiredJobSkills = activeApp?.extractedJd?.requiredSkills || [];

  try {
    const response = await executeAiTask("GENERATE_PROJECT_KIT", {
      name: project.name,
      technologies: project.technologies,
      architecture: project.architecture,
      description: project.description,
      role: project.role,
      achievements: project.achievements,
      complexity: project.complexity,
      targetJobRole: activeApp?.role || "Software Engineer",
      requiredJobSkills
    });

    if (response && Array.isArray(response.kit) && response.kit.length > 0) {
      project.interviewKit = response.kit.map(q => ({
        question: q.question,
        category: q.category || "Project Understanding",
        difficulty: q.difficulty || "Medium",
        relevanceReason: q.relevanceReason || `Based on project evidence (${project.name})`,
        targetJobRequirement: q.targetJobRequirement || ""
      }));
      await project.save();
      return project.interviewKit;
    }
  } catch (error) {
    console.warn("[ProjectService] AI project kit task unavailable. Using evidence-grounded generator:", error?.message || error);
  }

  // Grounded fallback question generator based strictly on project evidence
  const kit = [];
  const techs = project.technologies || [];
  const hasAuth = techs.some(t => /auth|jwt|oauth|session|passport/i.test(t)) || /auth|login|security/i.test(project.description);
  const primaryTech = techs[0] || "JavaScript";
  const secondTech = techs[1] || "Node.js";

  // 1. Project Understanding
  kit.push({
    question: `Why did you build ${project.name}, and what core engineering problem does it solve?`,
    category: "Project Understanding",
    difficulty: "Medium",
    relevanceReason: "Tests product context and problem formulation."
  });

  // 2. Technical Architecture
  kit.push({
    question: `Can you walk through the system architecture of ${project.name} and explain how data flows from the client to storage?`,
    category: "Technical Architecture",
    difficulty: "Medium",
    relevanceReason: "Evaluates end-to-end system design thinking."
  });

  // 3. Technology Decisions (Only if technologies exist!)
  if (techs.length > 0) {
    kit.push({
      question: `Why did you choose ${primaryTech}${secondTech ? ` and ${secondTech}` : ""} for ${project.name} over alternative technologies?`,
      category: "Technology Decisions",
      difficulty: "Medium",
      relevanceReason: `Grounds evaluation in actual project tech (${primaryTech}).`,
      targetJobRequirement: requiredJobSkills.find(s => s.toLowerCase().includes(primaryTech.toLowerCase())) || ""
    });
  }

  // 4. Engineering Trade-offs
  kit.push({
    question: `What architectural or technical trade-offs did you make while implementing ${project.name}? What would you change if rebuilding it today?`,
    category: "Engineering Decisions",
    difficulty: "Hard",
    relevanceReason: "Assesses senior engineering judgment and hindsight analysis."
  });

  // 5. Scalability
  kit.push({
    question: `If ${project.name} suddenly experienced a 100x increase in concurrent users, where would the system bottleneck first and how would you scale it?`,
    category: "Scalability",
    difficulty: "Hard",
    relevanceReason: "Evaluates performance optimization and horizontal/vertical scaling concepts."
  });

  // 6. Security (Only if relevant)
  if (hasAuth) {
    kit.push({
      question: `How did you implement authentication, authorization, and API security in ${project.name}?`,
      category: "Security",
      difficulty: "Medium",
      relevanceReason: "Triggered by authentication evidence in project."
    });
  }

  // 7. Failure / Debugging
  kit.push({
    question: `What was the most difficult bug or technical challenge you encountered while building ${project.name}, and how did you diagnose it?`,
    category: "Failure / Debugging",
    difficulty: "Hard",
    relevanceReason: "Tests real-world debugging methodology and perseverance."
  });

  // 8. Ownership
  kit.push({
    question: `In ${project.name}, what specific modules or APIs did YOU personally implement vs relying on external libraries or existing code?`,
    category: "Ownership",
    difficulty: "Medium",
    relevanceReason: "Clarifies individual contribution and personal code ownership."
  });

  project.interviewKit = kit;
  await project.save();
  return project.interviewKit;
}

/**
 * Get all projects for a user, auto-syncing from resume if empty.
 */
export async function getProjects(userId) {
  let projects = await Project.find({ userId }).sort({ relevance: -1, createdAt: -1 });
  if (projects.length === 0) {
    await syncProjectsFromResume(userId);
    projects = await Project.find({ userId }).sort({ relevance: -1, createdAt: -1 });
  }
  return projects;
}

/**
 * Get project by ID
 */
export async function getProjectById(projectId) {
  return await Project.findById(projectId);
}

