import mongoose from "mongoose";
import { env } from "./src/config/env.js";
import { User } from "./src/models/User.js";
import { Project } from "./src/models/Project.js";
import { askMyCodebase, generateRealityCheck } from "./src/services/ai/projectIntelligence.js";

async function runTest() {
  await mongoose.connect(env.mongodbUri);
  console.log("Connected to MongoDB.");

  // Get test user
  let user = await User.findOne({ email: "evidencetest@example.com" });
  if (!user) {
    user = await User.create({
      name: "Evidence Test",
      email: "evidencetest@example.com",
      passwordHash: "dummy"
    });
  }

  // Create a mock project
  let project = await Project.findOne({ userId: user._id, name: "CareerPilot AI" });
  if (!project) {
    project = await Project.create({
      userId: user._id,
      name: "CareerPilot AI",
      description: "Built a career assistant using React and Node.",
      technologies: ["React", "Node.js", "MongoDB"],
      architecture: "Microservices",
    });
  }

  console.log("Testing Ask My Codebase...");
  const askResponse = await askMyCodebase(
    project._id, 
    user._id, 
    "How does the database layer work based on this project?",
    "import mongoose from 'mongoose';\n\nconst User = mongoose.model('User', new mongoose.Schema({ name: String }));"
  );
  
  console.log("Response from Ask My Codebase:", askResponse);

  console.log("\nTesting Reality Check...");
  const realityResponse = await generateRealityCheck(
    project._id,
    user._id,
    ["React", "Node.js", "Kubernetes", "AWS"]
  );

  console.log("Response from Reality Check:", realityResponse);

  await mongoose.disconnect();
}

runTest().catch(console.error);
