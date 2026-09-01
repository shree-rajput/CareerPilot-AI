import mongoose from "mongoose";
import dotenv from "dotenv";
import { getCandidateIntelligenceContext } from "./src/services/career/candidateIntelligenceService.js";

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/careerpilot");
  console.log("Connected to Mongo");

  const { User } = await import("./src/models/User.js");
  const user = await User.findOne();
  if (!user) {
    console.log("No user found");
    process.exit(0);
  }

  console.log("Testing context retrieval for user:", user._id);
  const context = await getCandidateIntelligenceContext(user._id, "resume");
  console.log("Context retrieved successfully:");
  console.log("- Career Profile:", context.careerProfile.name);
  console.log("- Resume Projects count:", context.resumeIntelligence?.projects?.length || 0);
  console.log("- Resume Skills count:", context.resumeIntelligence?.skills?.length || 0);
  console.log("- Skill Gaps count:", context.skillGaps.length);
  console.log("- Applications count:", context.applications.length);
  console.log("- Interview Weaknesses count:", context.interviewIntelligence.weaknesses.length);
  console.log("- Next Best Actions count:", context.nextBestActions.length);

  await mongoose.disconnect();
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
