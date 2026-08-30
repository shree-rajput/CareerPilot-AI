import mongoose from "mongoose";
import { env } from "./src/config/env.js";
import { User } from "./src/models/User.js";
import { UserSkill } from "./src/models/UserSkill.js";
import { Project } from "./src/models/Project.js";
import { extractEvidenceFromResume } from "./src/services/resume/evidenceService.js";

async function runTest() {
  await mongoose.connect(env.mongodbUri);
  console.log("Connected to MongoDB.");

  // Create or get a test user
  let user = await User.findOne({ email: "evidencetest@example.com" });
  if (!user) {
    user = await User.create({
      name: "Evidence Test",
      email: "evidencetest@example.com",
      passwordHash: "dummy"
    });
  }

  // Clear previous evidence for clean test
  await UserSkill.deleteMany({ userId: user._id });
  await Project.deleteMany({ userId: user._id });

  const mockStructuredData = {
    skills: [
      { canonicalName: "React", originalMention: "ReactJS", category: "framework" },
      { canonicalName: "Node.js", originalMention: "Node", category: "language" }
    ],
    projects: [
      {
        name: "CareerPilot AI",
        description: "Built a career assistant using React and Node.",
        technologies: ["React", "Node.js"],
        architecture: "Microservices",
        keyResponsibilities: ["Developed the AI orchestrator."]
      }
    ]
  };

  console.log("Extracting evidence...");
  await extractEvidenceFromResume(user._id, mockStructuredData, "Test Resume");

  // Verify UserSkills
  const skills = await UserSkill.find({ userId: user._id }).lean();
  console.log(`Extracted ${skills.length} skills:`, skills.map(s => s.canonicalName));

  // Verify Projects
  const projects = await Project.find({ userId: user._id }).lean();
  console.log(`Extracted ${projects.length} projects:`, projects.map(p => p.name));

  if (skills.length === 2 && projects.length === 1) {
    console.log("SUCCESS: Evidence extraction verified!");
  } else {
    console.error("FAILED: Evidence extraction did not produce expected results.");
  }

  await mongoose.disconnect();
}

runTest().catch(console.error);
