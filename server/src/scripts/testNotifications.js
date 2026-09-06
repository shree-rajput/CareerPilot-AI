import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import { Application } from "../models/Application.js";
import { Notification } from "../models/Notification.js";
import { runNotificationEngine } from "../services/notification/notificationEngine.js";

async function runTests() {
  await connectDatabase();
  console.log("Connected to DB. Starting Notification E2E Tests...\n");

  const testUser = await User.findOne({ email: "test@example.com" }) || await User.create({
    name: "Test User",
    email: `test_${Date.now()}@example.com`,
    passwordHash: "dummy",
    notificationPreferences: {
      actionRequired: true,
      opportunity: true,
      interview: true,
      learning: true,
      progress: true,
      emailEnabled: true
    }
  });

  const now = new Date();
  const nineDaysAgo = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);

  console.log("--- 1. Testing Action Required ---");
  // Create stale application
  const app = await Application.create({
    userId: testUser._id,
    jobId: null, // mock
    company: "Test Co",
    role: "Frontend Developer",
    status: "applied",
    lastActivityAt: nineDaysAgo,
    updatedAt: nineDaysAgo
  });

  console.log("Running Engine...");
  let stats = await runNotificationEngine();
  console.log("Stats generated:", stats);

  let notifs = await Notification.find({ userId: testUser._id, dedupeKey: { $regex: "ACTION_REQUIRED" } });
  console.assert(notifs.length === 1, "Should create exactly 1 Action Required notification");

  console.log("Running Engine Again to test deduplication...");
  stats = await runNotificationEngine();
  console.log("Stats generated:", stats);

  notifs = await Notification.find({ userId: testUser._id, dedupeKey: { $regex: "ACTION_REQUIRED" } });
  console.assert(notifs.length === 1, "Should STILL have exactly 1 Action Required notification (DEDUPLICATION WORKED)");

  console.log("\n--- Cleaning Up ---");
  await Application.findByIdAndDelete(app._id);
  await Notification.deleteMany({ userId: testUser._id });
  
  console.log("Notification Logic Tests completed.");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
