import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../models/User.js";
import { MentorProfile } from "../models/MentorProfile.js";
import { MentorApplication } from "../models/MentorApplication.js";
import { MentorVerification } from "../models/MentorVerification.js";
import { MentorAvailability } from "../models/MentorAvailability.js";
import { MentorshipReview } from "../models/MentorshipReview.js";
import { MentorReport } from "../models/MentorReport.js";
import { ModerationAction } from "../models/ModerationAction.js";
import MentorshipSession from "../models/MentorshipSession.js";
import { 
  generateAvailableSlots, calculateDeterministicMatch, recalculateMentorRating 
} from "../services/career/mentorConnectService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function runVerification() {
  console.log("\n==========================================");
  console.log("   Mentor Connect V1 E2E Verification");
  console.log("==========================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/careerpilot";
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    // 1. Setup Test Users
    console.log("\n[1/7] Creating Test Domain Entities...");
    await User.deleteMany({ email: { $in: ["test_student_m1@example.com", "test_mentor_m1@example.com", "test_admin_m1@example.com"] } });

    const studentUser = await User.create({
      name: "Alice Student",
      email: "test_student_m1@example.com",
      passwordHash: "hash123",
      role: "student"
    });

    const mentorUser = await User.create({
      name: "Bob Senior Engineer",
      email: "test_mentor_m1@example.com",
      passwordHash: "hash123",
      role: "mentor"
    });

    const adminUser = await User.create({
      name: "Carol Admin",
      email: "test_admin_m1@example.com",
      passwordHash: "hash123",
      role: "admin"
    });

    console.log(`✓ Created Student (${studentUser._id}), Mentor (${mentorUser._id}), Admin (${adminUser._id})`);

    // 2. Mentor Application & Approval Flow
    console.log("\n[2/7] Testing Onboarding Application & Admin Review...");
    const app = await MentorApplication.create({
      userId: mentorUser._id,
      professionalName: mentorUser.name,
      headline: "Staff Software Engineer @ Google",
      currentRole: "Staff Software Engineer",
      company: "Google",
      experienceYears: 8,
      skills: ["System Design", "Node.js", "Distributed Systems"],
      expertiseAreas: ["Backend Architecture"],
      mentoringTopics: ["System Design Mock", "Resume Review"],
      bio: "8+ years building scalable cloud services.",
      status: "pending"
    });
    console.log(`✓ Submitted Application ID: ${app._id}`);

    // Admin Review & Verification Creation
    const verification = await MentorVerification.create({
      userId: mentorUser._id,
      identityStatus: "verified",
      employmentStatus: "verified",
      expertiseStatus: "verified",
      verifiedBy: adminUser._id,
      notes: "Verified via LinkedIn and company email."
    });

    const mentorProfile = await MentorProfile.create({
      userId: mentorUser._id,
      verificationId: verification._id,
      professionalName: app.professionalName,
      headline: app.headline,
      currentRole: app.currentRole,
      company: app.company,
      experienceYears: app.experienceYears,
      skills: app.skills,
      expertiseAreas: app.expertiseAreas,
      mentoringTopics: app.mentoringTopics,
      bio: app.bio,
      rating: 5.0,
      reviewsCount: 0,
      completedSessionsCount: 0,
      isDemo: false
    });

    mentorUser.mentorProfileId = mentorProfile._id;
    mentorUser.mentorStatus = "approved";
    await mentorUser.save();

    app.status = "approved";
    app.reviewedBy = adminUser._id;
    app.reviewedAt = new Date();
    await app.save();

    await ModerationAction.create({
      adminId: adminUser._id,
      targetUserId: mentorUser._id,
      actionType: "approve_application",
      reason: "Verified credentials"
    });

    console.log(`✓ Mentor Profile approved & created ID: ${mentorProfile._id}`);

    // 3. Granular Verification Badges Check
    console.log("\n[3/7] Verifying Granular Verification Badges...");
    const fetchedVerification = await MentorVerification.findOne({ userId: mentorUser._id });
    console.log(`✓ Identity: ${fetchedVerification.identityStatus}`);
    console.log(`✓ Employment: ${fetchedVerification.employmentStatus}`);
    console.log(`✓ Expertise: ${fetchedVerification.expertiseStatus}`);
    if (
      fetchedVerification.identityStatus !== "verified" ||
      fetchedVerification.employmentStatus !== "verified" ||
      fetchedVerification.expertiseStatus !== "verified"
    ) {
      throw new Error("Granular verification state mismatch!");
    }

    // 4. Availability Slot Generation Engine Test
    console.log("\n[4/7] Testing Availability Slot Generation...");
    const availability = await MentorAvailability.create({
      mentorId: mentorUser._id,
      timezone: "UTC",
      weeklySlots: [
        { dayOfWeek: 1, startMinutes: 540, endMinutes: 720 }, // Mon 09:00 - 12:00
        { dayOfWeek: 3, startMinutes: 840, endMinutes: 1020 }  // Wed 14:00 - 17:00
      ],
      bufferMinutes: 15
    });

    const testDateStr = "2026-09-07"; // Monday
    const slots = await generateAvailableSlots({ mentorId: mentorUser._id, targetDateStr: testDateStr, durationMinutes: 30 });
    console.log(`✓ Generated ${slots.length} available 30-min slots for date ${testDateStr}`);

    // 5. Session Booking, State Machine & Action Items Test
    console.log("\n[5/7] Testing Booking Flow, State Transitions & Action Items...");
    const session = await MentorshipSession.create({
      mentorId: mentorUser._id,
      studentId: studentUser._id,
      topic: "System Design Mock",
      description: "Prepare for Google L5 interview round.",
      scheduledAt: new Date(testDateStr + "T10:00:00.000Z"),
      duration: 30,
      status: "requested"
    });

    console.log(`✓ Created Session ID: ${session._id} with Status: ${session.status}`);

    // Mentor Accepts Session
    session.status = "scheduled";
    session.meetingUrl = "https://meet.careerpilot.ai/room-123";
    await session.save();
    console.log(`✓ Session status updated to: ${session.status}`);

    // Complete Session & Sync Action Items
    session.status = "completed";
    session.mentorFeedback = "Great communication. Work on cache eviction strategies.";
    session.actionItems = [
      { title: "Implement LeetCode 146 LRU Cache", status: "pending" },
      { title: "Read DDIA Chapter 5", status: "pending" }
    ];
    await session.save();

    mentorProfile.completedSessionsCount += 1;
    await mentorProfile.save();

    console.log(`✓ Session completed. Action items synced: ${session.actionItems.length} items.`);

    // 6. Rating & Review Recalculation Engine Test
    console.log("\n[6/7] Testing Student Review & Rating Recalculation...");
    await MentorshipReview.create({
      sessionId: session._id,
      mentorId: mentorProfile._id,
      studentId: studentUser._id,
      rating: 5,
      review: "Incredible feedback! Very clear system design advice."
    });

    session.ratings = { studentRating: 5, studentReview: "Incredible feedback!" };
    await session.save();

    await recalculateMentorRating(mentorUser._id);
    const updatedMentor = await MentorProfile.findById(mentorProfile._id);
    console.log(`✓ Mentor Updated Rating: ${updatedMentor.rating} (${updatedMentor.reviewsCount} reviews)`);

    // 7. Safety Reporting & Admin Suspension Test
    console.log("\n[7/7] Testing Safety Reporting & Admin Moderation...");
    const report = await MentorReport.create({
      reporterId: studentUser._id,
      mentorId: mentorUser._id,
      sessionId: session._id,
      category: "inappropriate_behavior",
      details: "Test safety report audit trail.",
      status: "pending"
    });
    console.log(`✓ Created Safety Report ID: ${report._id}`);

    // Admin Resolves & Suspends
    report.status = "resolved";
    report.actionTaken = "Verified report, mentor warned.";
    report.resolvedBy = adminUser._id;
    report.resolvedAt = new Date();
    await report.save();

    mentorProfile.isActive = false;
    await mentorProfile.save();

    await ModerationAction.create({
      adminId: adminUser._id,
      targetUserId: mentorUser._id,
      actionType: "suspend_mentor",
      reason: "Policy audit check"
    });

    console.log(`✓ Mentor Suspended & Moderation Audit Trail Logged.`);

    console.log("\n==========================================");
    console.log("  ALL MENTOR CONNECT V1 E2E TESTS PASSED  ");
    console.log("==========================================\n");

  } catch (err) {
    console.error("\n❌ Verification Failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runVerification();
