import mongoose from "mongoose";
import dotenv from "dotenv";
import { sendMessage, createConversation } from "./src/services/career/copilotService.js";

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

  const conv = await createConversation(user._id, "Test Copilot Chat");
  console.log("Created conversation:", conv._id);

  const testQueries = [
    "mere resume me kya problem hai?",
    "mere project ke basis par interviewer kya pooch sakta hai?",
    "aaj mujhe kya padhna chahiye?"
  ];

  for (const query of testQueries) {
    console.log("\n==========================================");
    console.log("USER ASKED:", query);
    console.log("==========================================");
    const res = await sendMessage(user._id, conv._id, query);
    console.log("CAREERCOPILOT REPLY:\n", res.reply);
    console.log("SUGGESTED ACTIONS:", res.suggestedActions);
  }

  await mongoose.disconnect();
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
