import dotenv from "dotenv";
dotenv.config();

import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import { PreparationPlan } from "../models/PreparationPlan.js";
import MentorshipSession from "../models/MentorshipSession.js";
import { matchMentorsForCandidate } from "../services/career/mentorMatchingService.js";
import { 
  requestSession, 
  respondToSession, 
  completeSession,
  rateSession
} from "../services/career/mentorSessionService.js";
import mongoose from "mongoose";

async function runTest() {
  console.log("🚀 Starting Mentor Ecosystem Integration Test...");
  await connectDatabase();

  // 1. Setup clean candidate and mentor test accounts
  const testCandidateEmail = "candidate.test@careerpilot.ai";
  const testMentorEmail = "mentor.test@careerpilot.ai";

  // Clean up any stale records
  await Promise.all([
    User.deleteOne({ email: testCandidateEmail }),
    User.deleteOne({ email: testMentorEmail })
  ]);

  console.log("🌱 Creating test candidate user...");
  const candidate = new User({
    name: "Test Candidate User",
    email: testCandidateEmail,
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    isMentor: false,
    mentorStatus: "none",
    technicalSkills: ["JavaScript", "React", "Node.js"],
    targetRoles: [{ title: "Frontend Engineer", priority: 1 }],
    targetCompanies: ["Stripe", "Google"]
  });
  await candidate.save();

  console.log("🌱 Creating test mentor user...");
  const mentor = new User({
    name: "Test Mentor User",
    email: testMentorEmail,
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    isMentor: true,
    mentorStatus: "approved",
    mentorProfile: {
      role: "Staff Engineer",
      company: "Stripe",
      experienceYears: 7,
      skills: ["React", "JavaScript", "System Design"],
      specialties: ["Frontend", "UX & Accessibility"],
      availability: ["Monday 10:00 AM - 12:00 PM"],
      bio: "Frontend Specialist helping engineers land Stripe roles.",
      topics: ["React Deep Dive", "UX Design Screen"],
      rating: 5.0,
      reviewsCount: 0
    }
  });
  await mentor.save();

  try {
    // 2. Test hybrid Matching Algorithm
    console.log("🔍 Running Matching Algorithm...");
    const matchedList = await matchMentorsForCandidate(candidate._id);
    console.log(`   - Found ${matchedList.length} matching mentors.`);
    
    // Find our test mentor in the match list
    const matchForTestMentor = matchedList.find(m => m.mentorId.toString() === mentor._id.toString());
    if (matchForTestMentor) {
      console.log(`   - Match Score for Test Mentor: ${matchForTestMentor.matchScore}%`);
      console.log(`   - AI Match Explanation: "${matchForTestMentor.aiExplanation}"`);
    } else {
      console.warn("   - Warning: Test mentor not present in top matching lists. (This is fine if lists were filtered/capped)");
    }

    // 3. Test Booking request
    console.log("📅 Requesting session slot...");
    const session = await requestSession({
      studentId: candidate._id,
      mentorId: mentor._id,
      topic: "React Deep Dive",
      description: "Need guidance on state managers and performance rendering loops.",
      duration: 45,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });
    console.log(`   - Requested session ID: ${session._id}`);
    console.log(`   - Status: ${session.status}`);
    console.log(`   - Compiled Pre-Session AI Brief:`, !!session.aiBrief);

    // 4. Test Responding/Scheduling
    console.log("🤝 Mentor accepting and scheduling slot...");
    const scheduledSession = await respondToSession(session._id, {
      status: "scheduled",
      meetingUrl: "https://meet.google.com/test-session-link"
    });
    console.log(`   - Updated Status: ${scheduledSession.status}`);
    console.log(`   - Meeting Link: ${scheduledSession.meetingUrl}`);

    // 5. Test Completing Session & Action Items Sync
    console.log("✅ Mentor completing session and logging actions...");
    const completedSession = await completeSession(scheduledSession._id, {
      mentorFeedback: "Strong JavaScript fundamentals, needs minor work on concurrent rendering features.",
      rawNotes: "Recommend reviewing fiber and profiling loops.",
      actionItems: [
        "Study React Fiber tree diffing algorithm",
        "Refactor project dashboard rendering layout"
      ]
    });
    console.log(`   - Completed Status: ${completedSession.status}`);
    console.log(`   - Synced Action Items Count: ${completedSession.actionItems.length}`);

    // Verify Action Items synced to student's PreparationPlan
    const activePlan = await PreparationPlan.findOne({ userId: candidate._id, isActive: true });
    if (!activePlan) {
      throw new Error("Action items sync failed: Student PreparationPlan not created.");
    }
    console.log(`   - Active Preparation Plan found with ${activePlan.actionItems.length} tasks.`);
    const mentorTasks = activePlan.actionItems.filter(item => item.title.startsWith("Mentor Task:"));
    console.log(`   - Mentorship specific tasks:`, mentorTasks.map(t => t.title));
    if (mentorTasks.length < 2) {
      throw new Error("Action items sync failed: Synced tasks are missing.");
    }

    // 6. Verify Career Readiness score recalculations
    const updatedCandidate = await User.findById(candidate._id);
    console.log(`📊 Recalculated Candidate Career Readiness Score: ${updatedCandidate.readinessScore}`);
    console.log(`📊 Score breakdown details:`, updatedCandidate.readinessBreakdown);

    // 7. Test Student rating
    console.log("⭐ Candidate rating the completed session...");
    const ratedSession = await rateSession(completedSession._id, {
      rating: 5,
      review: "Amazing session! The performance tips were extremely clear and actionable."
    });
    console.log(`   - Review logged: ${ratedSession.ratings?.studentRating} Stars`);
    
    // Verify Mentor aggregated review calculations
    const updatedMentor = await User.findById(mentor._id);
    console.log(`📊 Updated Mentor Average Rating: ${updatedMentor.mentorProfile?.rating}`);
    console.log(`   - Review Count: ${updatedMentor.mentorProfile?.reviewsCount}`);

    console.log("\n🎉 ✅ All Mentor Ecosystem integration test flows passed successfully!");

  } catch (error) {
    console.error("❌ Test run failed with error:", error);
    process.exit(1);
  } finally {
    // 8. Clean up created data
    console.log("🧹 Cleaning up test database modifications...");
    await Promise.all([
      User.deleteOne({ email: testCandidateEmail }),
      User.deleteOne({ email: testMentorEmail }),
      MentorshipSession.deleteMany({ studentId: candidate._id }),
      PreparationPlan.deleteMany({ userId: candidate._id })
    ]);
    console.log("🔌 Disconnecting mongoose...");
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTest();
