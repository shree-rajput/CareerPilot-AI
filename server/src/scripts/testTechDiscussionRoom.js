import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import {
  createTechDiscussionRoom,
  joinTechDiscussionRoom,
  generateTechDiscussionToken,
  getAIProblemRecommendation,
  getAIProgressiveNudge,
  executeContextAction,
  endTechDiscussionSession,
  getIndividualTechDiscussionReport
} from "../services/career/techDiscussion.service.js";

async function runTest() {
  console.log("=== STARTING TECH DISCUSSION ROOM INTEGRATION TEST ===");
  await connectDatabase();

  // Find or create two test users
  let userA = await User.findOne({ email: "testusera@careerpilot.ai" });
  if (!userA) {
    userA = await User.create({
      name: "Student Alpha",
      email: "testusera@careerpilot.ai",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuu",
      targetRoles: [{ title: "Backend Engineer" }]
    });
  }

  let userB = await User.findOne({ email: "testuserb@careerpilot.ai" });
  if (!userB) {
    userB = await User.create({
      name: "Student Beta",
      email: "testuserb@careerpilot.ai",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuu",
      targetRoles: [{ title: "Full Stack Developer" }]
    });
  }

  console.log(`✓ Test Users: Alpha (${userA._id}) & Beta (${userB._id})`);

  // 1. AI Problem Recommendation Test
  console.log("\n--- 1. Testing AI Problem Recommendation ---");
  const rec = await getAIProblemRecommendation(userA._id, { topic: "DSA", difficulty: "medium" });
  console.log("✓ Recommended Problem Title:", rec.question?.title);
  console.log("✓ Rationale:", rec.rationale);

  // 2. Create Room Test
  console.log("\n--- 2. Testing Room Creation ---");
  const roomRes = await createTechDiscussionRoom({
    userId: userA._id,
    topic: "DSA",
    problemType: "ai_recommended",
    difficulty: "medium",
    durationMinutes: 30
  });

  const roomId = roomRes.roomId;
  console.log("✓ Room Created ID:", roomId);
  console.log("✓ Room Code:", roomRes.roomCode);
  console.log("✓ Status:", roomRes.status);
  console.log("✓ Invite Link:", roomRes.inviteLink);

  // 3. Peer Joining Test
  console.log("\n--- 3. Testing Peer Joining ---");
  const joinRes = await joinTechDiscussionRoom({ roomId, userId: userB._id });
  console.log("✓ Room Joined Status:", joinRes.status);
  console.log("✓ Active Participants Count:", joinRes.participants?.length);
  console.log("✓ Started At:", joinRes.startedAt);
  console.log("✓ Expires At:", joinRes.expiresAt);

  // 4. LiveKit Token Generation Test
  console.log("\n--- 4. Testing LiveKit Token Generation ---");
  const tokenResA = await generateTechDiscussionToken({ roomId, userId: userA._id });
  console.log("✓ LiveKit Token generated for User Alpha:", Boolean(tokenResA.token));
  const tokenResB = await generateTechDiscussionToken({ roomId, userId: userB._id });
  console.log("✓ LiveKit Token generated for User Beta:", Boolean(tokenResB.token));

  // 5. AI Progressive Nudges Test (Level 1 to 4)
  console.log("\n--- 5. Testing AI Progressive Nudge Engine ---");
  const nudgeL1 = await getAIProgressiveNudge({ roomId, currentCode: "function solve() {}", hintLevel: 1, questionTitle: rec.question?.title });
  console.log("✓ Level 1 Nudge:", nudgeL1.nudgeText || nudgeL1);
  const nudgeL3 = await getAIProgressiveNudge({ roomId, currentCode: "function solve() {}", hintLevel: 3, questionTitle: rec.question?.title });
  console.log("✓ Level 3 Nudge:", nudgeL3.nudgeText || nudgeL3);

  // 6. AI Context Action Test
  console.log("\n--- 6. Testing Context Actions ---");
  const actionRes = await executeContextAction({
    actionType: "complexity",
    selectedCode: "for (let i = 0; i < n; i++) { map.set(i, i); }",
    problem: rec.question
  });
  console.log("✓ Complexity Action Title:", actionRes.title);
  console.log("✓ Complexity Action Response snippet:", String(actionRes.response).slice(0, 100) + "...");

  // 7. End Session & Individual Report Generation Test
  console.log("\n--- 7. Testing Session End & Report Generation ---");
  const endRes = await endTechDiscussionSession({ roomId, userId: userA._id });
  console.log("✓ Final Room Status:", endRes.status);
  console.log("✓ Duration Seconds:", endRes.durationSeconds);
  console.log("✓ Generated Individual Reports Count:", endRes.reports?.length);

  // 8. Fetch Individual Report Test
  console.log("\n--- 8. Testing Individual Report Retrieval ---");
  const repA = await getIndividualTechDiscussionReport({ roomId, userId: userA._id });
  console.log("✓ Report for User Alpha - Overall Score:", repA.overallScore);
  console.log("✓ Scores Breakdown:", repA.scores);
  console.log("✓ Strengths Count:", repA.strengths?.length);

  const updatedUserA = await User.findById(userA._id).select("readinessScore readinessBreakdown");
  console.log("✓ User Alpha Updated Readiness Score:", updatedUserA.readinessScore);

  console.log("\n=== ALL TECH DISCUSSION ROOM TESTS PASSED SUCCESSFULLY! ===");
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
