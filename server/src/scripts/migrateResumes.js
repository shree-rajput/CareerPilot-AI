import mongoose from "mongoose";
import dotenv from "dotenv";
import { Resume } from "../models/Resume.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/careerpilot";

async function runMigration() {
  console.log("🚀 Starting Resume Schema Migration...");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI);

    const resumes = await Resume.find({});
    console.log(`Found ${resumes.length} resume documents to migrate.`);

    let updatedCount = 0;

    for (const resume of resumes) {
      let needsSave = false;

      if (!resume.versionTreeRootId) {
        resume.versionTreeRootId = resume._id;
        needsSave = true;
      }

      if (resume.parentVersionId === undefined) {
        resume.parentVersionId = null;
        needsSave = true;
      }

      if (!resume.templateId) {
        resume.templateId = "classic";
        needsSave = true;
      }

      if (!resume.createdFrom) {
        resume.createdFrom = "upload";
        needsSave = true;
      }

      if (!resume.auditTrail || resume.auditTrail.length === 0) {
        resume.auditTrail = [
          {
            timestamp: resume.createdAt || new Date(),
            source: "upload",
            description: "Initial document created/migrated",
          },
        ];
        needsSave = true;
      }

      if (!resume.structuredData || Object.keys(resume.structuredData || {}).length === 0) {
        resume.structuredData = {
          personal: {
            fullName: resume.name || "Candidate Name",
            email: "",
            phone: "",
            location: "",
            linkedinUrl: "",
            githubUrl: "",
            portfolioUrl: "",
          },
          summary: resume.rawText ? resume.rawText.slice(0, 300) : "",
          experience: [],
          education: [],
          projects: [],
          skills: [{ category: "Technical Skills", items: resume.missingSkills || [] }],
          certifications: [],
        };
        needsSave = true;
      }

      if (needsSave) {
        await resume.save();
        updatedCount++;
      }
    }

    console.log(`✅ Migration complete! Updated ${updatedCount} resume documents.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runMigration();
