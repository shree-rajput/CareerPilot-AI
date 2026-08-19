import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 10000, // Fail after 10s instead of hanging
      socketTimeoutMS: 45000
    });
    console.log(`✅ MongoDB connected`);
  } catch (err) {
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("timed out")) {
      console.error("❌ MongoDB connection failed. If running locally, start mongod.");
      console.error("   For Atlas, set MONGODB_URI=mongodb+srv://... in server/.env");
    } else {
      console.error("❌ MongoDB connection error:", err.message);
    }
    throw err;
  }
}
