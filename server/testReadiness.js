import mongoose from "mongoose";
import { connectDatabase } from "./src/config/db.js";
import { updateUserReadinessScore } from "./src/services/career/readinessService.js";
import { User } from "./src/models/User.js";

async function testReadiness() {
  try {
    await connectDatabase();
    console.log("DB Connected");
    
    // Find the first user in the database
    const user = await User.findOne();
    if (!user) {
      console.log("No user found in DB");
      process.exit(0);
    }
    
    console.log("Testing readiness for user:", user._id);
    
    await updateUserReadinessScore(user._id, "Test");
    console.log("Success!");
    process.exit(0);
  } catch (error) {
    console.error("ERROR HAPPENED:", error);
    process.exit(1);
  }
}

testReadiness();
