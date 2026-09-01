import mongoose from "mongoose";
import { env } from "./src/config/env.js";
import { User } from "./src/models/User.js";
import { getNextBestActions } from "./src/services/career/nextBestActionService.js";

async function testActions() {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log("Connected to MongoDB.");

    const user = await User.findOne({});
    if (!user) {
      console.log("No user found.");
      process.exit(0);
    }

    console.log(`Testing actions for user: ${user.email}`);
    const actions = await getNextBestActions(user._id);

    console.log("Returned Actions:");
    actions.forEach(a => {
      console.log(`[${a.priority}] ${a.title} (${a.type}) - ${a.description}`);
    });
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testActions();
