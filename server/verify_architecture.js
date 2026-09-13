import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { env } from "./src/config/env.js";
import { Application } from "./src/models/Application.js";
import { Job } from "./src/models/Job.js";
import { User } from "./src/models/User.js";
import { ingestJobOpportunity } from "./src/services/jobIngestionService.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || env.mongodbUri);
  console.log("Connected to DB");

  const user = await User.findOne();
  if (!user) {
    console.log("No user found.");
    process.exit(0);
  }

  // 1. Simulate extension capture calling ingestJobOpportunity
  console.log("Testing ingestion...");
  const jobResult = await ingestJobOpportunity({
    title: "Software Engineer - Test Script",
    company: "Test Corp",
    description: "Looking for an engineer with Node.js experience.",
    url: "https://example.com/job/123",
    location: "Remote",
    source: "extension"
  }, user._id);

  console.log("Job ingested:", jobResult.job._id);

  // 2. Simulate Application creation
  const app = await Application.create({
    userId: user._id,
    jobId: jobResult.job._id,
    company: jobResult.job.company,
    role: jobResult.job.title,
    status: "applied",
    source: "extension_capture",
  });

  console.log("Application created:", app._id);

  const populatedApp = await Application.findById(app._id).populate("jobId");
  console.log("Populated app jobId:", populatedApp.jobId._id);

  // Cleanup
  await Application.findByIdAndDelete(app._id);
  await Job.findByIdAndDelete(jobResult.job._id);

  console.log("Cleanup done.");
  process.exit(0);
}

run().catch(console.error);
