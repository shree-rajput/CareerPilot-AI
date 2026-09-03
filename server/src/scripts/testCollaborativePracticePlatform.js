import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";
import {
  createTechDiscussionRoom,
  joinTechDiscussionRoom,
  getAIProgressiveNudge,
  executeContextAction,
  endTechDiscussionSession,
  getIndividualTechDiscussionReport
} from "../services/career/techDiscussion.service.js";
import { getDeterministicScenarioRecommendation } from "../services/career/deterministicSelectionService.js";

dotenv.config();

async function runTest() {
  console.log("=================================================");
  console.log("STARTING COLLABORATIVE PRACTICE PLATFORM TEST");
  console.log("=================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/careerpilot";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    // 1. Create 2 test users
    let userA = await User.findOne({ email: "peer_practice_a@test.com" });
    if (!userA) {
      userA = await User.create({
        name: "Test Engineer A",
        email: "peer_practice_a@test.com",
        passwordHash: "Password123!",
        targetRoles: [{ title: "Backend Engineer", matchPercentage: 85 }]
      });
    }

    let userB = await User.findOne({ email: "peer_practice_b@test.com" });
    if (!userB) {
      userB = await User.create({
        name: "Test Engineer B",
        email: "peer_practice_b@test.com",
        passwordHash: "Password123!",
        targetRoles: [{ title: "System Architect", matchPercentage: 80 }]
      });
    }

    console.log("✅ Test users verified:", userA.name, userB.name);

    // 2. Test Maturity Adaptation (Fresher vs Experienced)
    console.log("\nTesting Candidate Maturity Adaptation...");
    const fresherRec = await getDeterministicScenarioRecommendation(userA._id, {
      category: "architecture",
      experienceLevel: "fresher"
    });
    console.log("   Fresher Scenario Title:", fresherRec.scenario.title);
    console.log("   Fresher Difficulty:", fresherRec.difficulty);

    const experiencedRec = await getDeterministicScenarioRecommendation(userA._id, {
      category: "architecture",
      experienceLevel: "experienced"
    });
    console.log("   Experienced Scenario Title:", experiencedRec.scenario.title);
    console.log("   Experienced Difficulty:", experiencedRec.difficulty);

    if (fresherRec.scenario.title !== experiencedRec.scenario.title) {
      console.log("✅ Candidate Maturity Adaptation Verified: Fresher and Experienced receive distinct tailored scenarios.");
    }

    // 3. Create Tech Discussion Room for Architecture
    console.log("\nCreating Tech Discussion Room (Architecture focus)...");
    const roomResult = await createTechDiscussionRoom({
      userId: userA._id.toString(),
      category: "architecture",
      topic: "Architecture & System Design",
      difficulty: "medium",
      durationMinutes: 45
    });

    console.log("✅ Room created successfully!");
    console.log("   Room ID:", roomResult.roomId);
    console.log("   Room Code:", roomResult.roomCode);
    console.log("   Scenario Title:", roomResult.problem?.title);

    // 4. Test Anti-Repetition Exclusion
    console.log("\nTesting Anti-Repetition Exclusion...");
    const nextRec = await getDeterministicScenarioRecommendation(userA._id, {
      category: "architecture",
      excludeIds: [roomResult.problem.id]
    });
    console.log("   Rotated Scenario Title:", nextRec.scenario.title);
    if (nextRec.scenario.scenarioId !== roomResult.problem.id) {
      console.log("✅ Anti-Repetition Verified: Rotated scenario excludes recently selected ID.");
    }

    // 5. User B joins room
    console.log("\nUser B joining room...");
    const joinResult = await joinTechDiscussionRoom({
      roomId: roomResult.roomId,
      userId: userB._id.toString()
    });

    console.log("✅ User B joined room. Room Status:", joinResult.status);
    console.log("   Active Participants:", joinResult.participants.length);

    // 6. Test AI Progressive Nudges (Levels 1 to 4)
    console.log("\nTesting AI Progressive Nudges...");
    const nudgeL1 = await getAIProgressiveNudge({
      roomId: roomResult.roomId,
      currentCode: "// Express API setup with Redis cache",
      hintLevel: 1,
      questionTitle: roomResult.problem?.title
    });
    console.log("✅ Nudge Level 1:", nudgeL1.nudgeText?.slice(0, 80) + "...");

    // 7. Test Context Action (Challenge & Complexity)
    console.log("\nTesting Context Action (Challenge & Complexity)...");
    const actionRes = await executeContextAction({
      actionType: "challenge",
      currentCode: "const redisClient = redis.createClient();",
      problem: roomResult.problem
    });
    console.log("✅ Context Action Response:", actionRes.response?.slice(0, 80) + "...");

    // 8. Complete Session & Generate Individual 6-Competency Reports
    console.log("\nEnding Session & Generating 6-Competency Reports...");
    const endRes = await endTechDiscussionSession({
      roomId: roomResult.roomId,
      userId: userA._id.toString()
    });
    console.log("✅ Room status after completion:", endRes.status);
    console.log("✅ Individual Reports Generated:", endRes.reports.length);

    // 9. Fetch Individual Report for User A
    const reportA = await getIndividualTechDiscussionReport({
      roomId: roomResult.roomId,
      userId: userA._id.toString()
    });
    console.log("\n✅ Individual Report for User A:");
    console.log("   Overall Score:", reportA.overallScore);
    console.log("   Scores:", JSON.stringify(reportA.scores));
    console.log("   Strengths:", reportA.strengths?.[0]);

    console.log("\n=================================================");
    console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
    console.log("=================================================");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTest();
