import mongoose from "mongoose";
import dotenv from "dotenv";
import { calculateSkillGaps } from "./services/career/skillService.js";
import { UserSkill } from "./models/UserSkill.js";
import { Skill } from "./models/Skill.js";

dotenv.config();

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/careerpilot");

  console.log("Connected to MongoDB");

  // Create mock user skill "React.js"
  const mockUserId = new mongoose.Types.ObjectId();
  await UserSkill.create({
    userId: mockUserId,
    skillId: new mongoose.Types.ObjectId(),
    canonicalName: "React.js",
    proficiency: 80,
    confidence: 80,
    sources: []
  });

  console.log("Created mock user skill: React.js (proficiency: 80)");

  // Target: React (HIGH importance -> needs 70 proficiency)
  const targetSkills = [
    { skillName: "React", importance: "HIGH" },
    { skillName: "Node.js", importance: "MEDIUM" } // user doesn't have this
  ];

  console.log("Calculating gaps for target skills:", targetSkills);

  const gaps = await calculateSkillGaps(mockUserId, targetSkills);
  
  console.log("Result gaps:", JSON.stringify(gaps, null, 2));

  if (gaps.length === 1 && gaps[0].skillName === "Node.js") {
    console.log("✅ TEST PASSED: React.js correctly matched React, preventing a false skill gap.");
  } else {
    console.log("❌ TEST FAILED: Missing skills reported incorrectly.");
  }

  process.exit(0);
}

runTest();
