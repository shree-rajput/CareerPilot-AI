import { UserSkill } from "../../models/UserSkill.js";
import { Project } from "../../models/Project.js";

/**
 * Parses structured resume data and creates/updates UserSkill and Project records.
 * Acts as the entrypoint for Phase 3 Career Intelligence.
 */
export async function extractEvidenceFromResume(userId, structuredData, sourceName) {
  if (!structuredData) return;

  const { skills = [], projects = [] } = structuredData;

  // 1. Process Skills
  for (const skill of skills) {
    if (!skill || !skill.canonicalName) continue;
    
    const canonicalName = skill.canonicalName.trim();
    if (!canonicalName) continue;

    const evidence = {
      description: `Extracted from resume: "${skill.originalMention || canonicalName}"`,
      source: "resume",
      date: new Date(),
      weight: 1
    };

    // Upsert UserSkill
    await UserSkill.findOneAndUpdate(
      { userId, canonicalName },
      { 
        $set: { 
          userId, 
          canonicalName,
          category: skill.category || "other"
        },
        $push: { evidence: evidence },
        $inc: { confidence: 10 } // Base bump for resume mention
      },
      { upsert: true, new: true }
    );
  }

  // 2. Process Projects
  for (const proj of projects) {
    if (!proj || !proj.name) continue;

    // Check if project exists by name for this user to avoid duplicates
    const existingProject = await Project.findOne({ userId, name: proj.name.trim() });

    if (!existingProject) {
      await Project.create({
        userId,
        name: proj.name.trim(),
        description: proj.description || "",
        technologies: proj.technologies || [],
        architecture: proj.architecture || "",
        role: "Extracted from Resume", // Default
        achievements: proj.keyResponsibilities || []
      });
    } else {
      // Update existing project if missing data
      const updates = {};
      if (!existingProject.description && proj.description) updates.description = proj.description;
      if (existingProject.technologies.length === 0 && proj.technologies) updates.technologies = proj.technologies;
      
      if (Object.keys(updates).length > 0) {
        await Project.updateOne({ _id: existingProject._id }, { $set: updates });
      }
    }
  }
}
