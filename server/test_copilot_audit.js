import mongoose from "mongoose";
import dotenv from "dotenv";
import { sendMessage, createConversation } from "./src/services/career/copilotService.js";
import { classifyIntent, mapIntentToMode, validateResponseRelevance } from "./src/services/career/copilotIntentEngine.js";

dotenv.config();

async function runAudit() {
  console.log("Starting Copilot Audit Suite...");
  
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/careerpilot");
  console.log("Connected to MongoDB");

  const { User } = await import("./src/models/User.js");
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: "Audit User",
      email: "audit@careerpilot.ai",
      experienceLevel: "student",
      targetRoles: [{ title: "Frontend Engineer", techStack: ["React", "JavaScript", "CSS"], isPrimary: true }],
      technicalSkills: ["JavaScript", "React"]
    });
  }

  const conv = await createConversation(user._id, "Audit Test Conversation");
  console.log("Created test conversation:", conv._id);

  let passedCount = 0;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // --- Test 1: Technical question ---
  console.log("\n--- Test 1: Technical question ('What is JavaScript closure?') ---");
  const t1Query = "What is JavaScript closure?";
  const t1Intent = classifyIntent(t1Query);
  console.log("Intent detected:", t1Intent, "Mode:", mapIntentToMode(t1Intent));
  const t1Res = await sendMessage(user._id, conv._id, t1Query);
  console.log("AI Reply snippet:", t1Res.reply.substring(0, 150) + "...");
  const t1Val = validateResponseRelevance(t1Res, t1Query, t1Intent, {});
  if (t1Val.isValid && !/gap in docker|resume gap|your ats score/i.test(t1Res.reply)) {
    console.log("✅ Test 1 PASSED: Direct technical answer provided without forced profile/resume bloat.");
    passedCount++;
  } else {
    console.error("❌ Test 1 FAILED:", t1Val.reason || "Profile bloat present");
  }

  await sleep(1500);

  // --- Test 2: Resume match score question ---
  console.log("\n--- Test 2: Match score question ('Why is my resume match score low?') ---");
  const t2Query = "Why is my resume match score low?";
  const t2Intent = classifyIntent(t2Query);
  console.log("Intent detected:", t2Intent, "Mode:", mapIntentToMode(t2Intent));
  const t2Res = await sendMessage(user._id, conv._id, t2Query);
  console.log("AI Reply snippet:", t2Res.reply.substring(0, 150) + "...");
  if (/match|skill|resume|score/i.test(t2Res.reply)) {
    console.log("✅ Test 2 PASSED: Match score analysis provided.");
    passedCount++;
  } else {
    console.error("❌ Test 2 FAILED: Response did not address match score.");
  }

  await sleep(1500);

  // --- Test 3: Job improvement ---
  console.log("\n--- Test 3: Job improvement question ('What should I improve for this job?') ---");
  const t3Query = "What should I improve for this job?";
  const t3Res = await sendMessage(user._id, conv._id, t3Query);
  console.log("AI Reply snippet:", t3Res.reply.substring(0, 150) + "...");
  if (t3Res.reply.length > 20) {
    console.log("✅ Test 3 PASSED: Job improvement recommendations returned.");
    passedCount++;
  } else {
    console.error("❌ Test 3 FAILED.");
  }

  await sleep(1500);

  // --- Test 4: Interview prep ---
  console.log("\n--- Test 4: React interview prep ('How should I prepare for a React interview?') ---");
  const t4Query = "How should I prepare for a React interview?";
  const t4Res = await sendMessage(user._id, conv._id, t4Query);
  console.log("AI Reply snippet:", t4Res.reply.substring(0, 150) + "...");
  if (/react|component|state|props|hook|interview/i.test(t4Res.reply)) {
    console.log("✅ Test 4 PASSED: React interview prep provided.");
    passedCount++;
  } else {
    console.error("❌ Test 4 FAILED: Did not focus on React interview prep.");
  }

  await sleep(1500);

  // --- Test 5: What should I do next ---
  console.log("\n--- Test 5: Next action ('What should I do next?') ---");
  const t5Query = "What should I do next?";
  const t5Res = await sendMessage(user._id, conv._id, t5Query);
  console.log("AI Reply snippet:", t5Res.reply.substring(0, 150) + "...");
  if (t5Res.reply.length > 20) {
    console.log("✅ Test 5 PASSED: Next actions recommendation provided.");
    passedCount++;
  } else {
    console.error("❌ Test 5 FAILED.");
  }

  await sleep(1500);

  // --- Test 6: Communication improvement ---
  console.log("\n--- Test 6: Communication advice ('How can I improve my communication?') ---");
  const t6Query = "How can I improve my communication?";
  const t6Res = await sendMessage(user._id, conv._id, t6Query);
  console.log("AI Reply snippet:", t6Res.reply.substring(0, 150) + "...");
  if (/communication|clarity|star|answer|interview/i.test(t6Res.reply) && !/docker|ats score/i.test(t6Res.reply)) {
    console.log("✅ Test 6 PASSED: Relevant communication advice provided.");
    passedCount++;
  } else {
    console.error("❌ Test 6 FAILED.");
  }

  await sleep(1500);

  // --- Test 7: Topic switch ---
  console.log("\n--- Test 7: Topic switch ('Explain MongoDB indexing' after interview question) ---");
  const t7Query = "Explain MongoDB indexing.";
  const t7Intent = classifyIntent(t7Query);
  console.log("Intent detected:", t7Intent, "Mode:", mapIntentToMode(t7Intent));
  const t7Res = await sendMessage(user._id, conv._id, t7Query);
  console.log("AI Reply snippet:", t7Res.reply.substring(0, 150) + "...");
  if (/mongodb|index|b-tree|query|performance/i.test(t7Res.reply) && !/interview preparation|resume gap/i.test(t7Res.reply)) {
    console.log("✅ Test 7 PASSED: Clean topic switch to MongoDB indexing without topic bleed.");
    passedCount++;
  } else {
    console.error("❌ Test 7 FAILED: Topic bleed detected.");
  }

  await sleep(1500);

  // --- Test 8: Ambiguous Question ---
  console.log("\n--- Test 8: Ambiguous question ('How do I improve this?') ---");
  const t8Query = "How do I improve this?";
  const t8Intent = classifyIntent(t8Query, []);
  console.log("Intent detected:", t8Intent);
  const t8Res = await sendMessage(user._id, conv._id, t8Query);
  console.log("AI Reply snippet:", t8Res.reply.substring(0, 150) + "...");
  if (/\?|clarify|specify|what would you like/i.test(t8Res.reply)) {
    console.log("✅ Test 8 PASSED: Concise clarification requested.");
    passedCount++;
  } else {
    console.error("❌ Test 8 FAILED: Did not ask for clarification.");
  }

  await sleep(1500);

  // --- Test 9: Conceptual question without profile ---
  console.log("\n--- Test 9: Conceptual question ('What is event bubbling in JavaScript?') ---");
  const t9Query = "What is event bubbling in JavaScript?";
  const t9Res = await sendMessage(user._id, conv._id, t9Query);
  console.log("AI Reply snippet:", t9Res.reply.substring(0, 150) + "...");
  if (/event|bubbling|dom|parent|target|phase/i.test(t9Res.reply) && !/gap|ats|resume/i.test(t9Res.reply)) {
    console.log("✅ Test 9 PASSED: Direct conceptual answer provided.");
    passedCount++;
  } else {
    console.error("❌ Test 9 FAILED.");
  }

  await sleep(1500);

  // --- Test 10: Non-hallucination on applications ---
  console.log("\n--- Test 10: Zero-data non-hallucination ('Which companies have I applied to?') ---");
  const t10Query = "Which companies have I applied to?";
  const t10Res = await sendMessage(user._id, conv._id, t10Query);
  console.log("AI Reply snippet:", t10Res.reply.substring(0, 150) + "...");
  if (/don't have|no application|no record|haven't applied|not applied/i.test(t10Res.reply)) {
    console.log("✅ Test 10 PASSED: Correctly stated no application records exist without hallucinating fake companies.");
    passedCount++;
  } else {
    console.error("❌ Test 10 FAILED: Invented fake application data.");
  }

  console.log(`\n==========================================`);
  console.log(`AUDIT COMPLETE: ${passedCount}/10 PASSED`);
  console.log(`==========================================`);

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
