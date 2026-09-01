import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import MentorshipSession from "../models/MentorshipSession.js";
import { PreparationPlan } from "../models/PreparationPlan.js";
import { Notification } from "../models/Notification.js";
import { Message } from "../models/Message.js";
import { requestSession, respondToSession, completeSession } from "../services/career/mentorSessionService.js";
import { createNotification, getUserNotifications, markAsRead } from "../services/notification/notificationService.js";
import { runNotificationEngine } from "../services/notification/notificationEngine.js";
import { getNextBestActions } from "../services/career/nextBestActionService.js";
import { sendMessage, getConversation } from "../controllers/messageController.js";

dotenv.config();

async function runAudit() {
  console.log("Starting Mentor Ecosystem & Real Notifications Audit Suite...\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/careerpilot";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for Audit.\n");

  const candidateEmail = `candidate_${Date.now()}@test.careerpilot.ai`;
  const mentorEmail = `mentor_${Date.now()}@test.careerpilot.ai`;

  let candidate = await User.create({
    name: "Alex Candidate",
    email: candidateEmail,
    passwordHash: "dummyhash",
    readinessScore: 75,
    targetRoles: [{ title: "Frontend Developer", isPrimary: true }]
  });

  let mentor = await User.create({
    name: "Dr. Sarah Mentor",
    email: mentorEmail,
    passwordHash: "dummyhash",
    mentorStatus: "approved",
    mentorProfile: {
      role: "Senior Staff Engineer",
      company: "Google",
      experienceYears: 8,
      skills: ["React", "System Design", "Node.js"],
      topics: ["System Design", "Mock Interview"],
      rating: 4.9,
      reviewsCount: 12
    }
  });

  console.log(`Created Candidate (${candidate.name}) and Mentor (${mentor.name}).`);

  // --- Test 1: AI -> Human Mentor Escalation ---
  console.log("\n--- Test 1: AI -> Human Mentor Escalation ---");
  const actions = await getNextBestActions(candidate._id);
  const mentorAction = actions.find((a) => a.type === "mentorship");
  if (!mentorAction) throw new Error("Mentor action card not returned!");
  console.log(`✅ Test 1 PASSED: Escalation action card returned: "${mentorAction.title}"`);

  // --- Test 2: Student Booking Session & AI Student Prep Brief ---
  console.log("\n--- Test 2: Student Session Booking & AI Brief ---");
  const session = await requestSession({
    studentId: candidate._id.toString(),
    mentorId: mentor._id.toString(),
    topic: "Frontend System Design & State Architecture",
    description: "I get confused when designing real-time dashboard state caching.",
    duration: 45,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  if (!session || !session.aiBrief) throw new Error("Session or AI brief missing!");
  console.log("AI Prep Brief Generated:", session.aiBrief.backgroundSummary || session.aiBrief.summary || session.aiBrief);
  console.log("✅ Test 2 PASSED: Session booked & AI Brief generated.");

  // --- Test 3: Mentor Notification & Email Queueing ---
  console.log("\n--- Test 3: Notification & Email Dispatch ---");
  const mentorNotifs = await getUserNotifications(mentor._id);
  if (mentorNotifs.unreadCount === 0) throw new Error("Mentor received no notification!");
  console.log(`Notification Title: "${mentorNotifs.notifications[0].title}"`);
  console.log("✅ Test 3 PASSED: Notification created & email queued.");

  // --- Test 4: Idempotency Protection ---
  console.log("\n--- Test 4: Idempotency Deduplication ---");
  const idempotencyKey = `test_dedup_${Date.now()}`;
  const notif1 = await createNotification({
    userId: candidate._id,
    type: "SYSTEM",
    title: "Idempotent Test",
    message: "First trigger",
    idempotencyKey
  });

  const notif2 = await createNotification({
    userId: candidate._id,
    type: "SYSTEM",
    title: "Idempotent Test Duplicate",
    message: "Second trigger",
    idempotencyKey
  });

  if (notif1._id.toString() !== notif2._id.toString()) throw new Error("Idempotency deduplication failed!");
  console.log("✅ Test 4 PASSED: Duplicate trigger prevented by idempotency key.");

  // --- Test 5: Mentor Responding to Request ---
  console.log("\n--- Test 5: Mentor Accept Session ---");
  const updatedSession = await respondToSession(session._id.toString(), {
    status: "scheduled",
    meetingUrl: "https://meet.google.com/test-room-123"
  });

  if (updatedSession.status !== "scheduled") throw new Error("Session status update failed!");
  const candidateNotifs = await getUserNotifications(candidate._id);
  const acceptNotif = candidateNotifs.notifications.find((n) => n.type === "MENTOR_ACCEPTED");
  if (!acceptNotif) throw new Error("Candidate notification for session acceptance missing!");
  console.log("✅ Test 5 PASSED: Session accepted & candidate notified.");

  // --- Test 6: Direct Student ↔ Mentor Messaging ---
  console.log("\n--- Test 6: Direct Messaging ---");
  const msgReq = {
    user: { id: candidate._id.toString() },
    body: { receiverId: mentor._id.toString(), text: "Hi Dr. Sarah, looking forward to our session!" }
  };
  let msgRes = {};
  await sendMessage(msgReq, { status: () => ({ json: (d) => { msgRes = d; } }) }, (err) => { if (err) throw err; });
  if (!msgRes.success) throw new Error("Failed to send direct message!");

  const convReq = { user: { id: mentor._id.toString() }, params: { otherUserId: candidate._id.toString() } };
  let convRes = {};
  await getConversation(convReq, { status: () => ({ json: (d) => { convRes = d; } }) }, (err) => { if (err) throw err; });
  if (!convRes.data || convRes.data.length === 0) throw new Error("Conversation thread empty!");
  console.log(`Direct Message: "${convRes.data[0].text}"`);
  console.log("✅ Test 6 PASSED: Direct messaging working between candidate and mentor.");

  // --- Test 7: Mentor Completing Session & Feedback Loop Sync ---
  console.log("\n--- Test 7: Mentor Feedback Loop & Plan Sync ---");
  const completed = await completeSession(session._id.toString(), {
    mentorFeedback: "Alex demonstrated solid React fundamentals but needs practice with virtualized lists and state normalization.",
    rawNotes: "Recommend 2 LeetCode questions and virtual list refactoring.",
    actionItems: ["Practice Virtualized List implementation", "Normalize Redux/Zustand state schema"]
  });

  if (completed.status !== "completed") throw new Error("Session completion failed!");
  
  const studentPlan = await PreparationPlan.findOne({ userId: candidate._id, isActive: true });
  if (!studentPlan || studentPlan.actionItems.length === 0) throw new Error("Mentor action items failed to sync to PreparationPlan!");
  
  console.log("Synced Mentor Action Items to Student Plan:", studentPlan.actionItems.map(i => i.title));
  console.log("✅ Test 7 PASSED: Session completed & action items synced to candidate preparation checklist.");

  // Cleanup test users & records
  await Promise.all([
    User.deleteOne({ _id: candidate._id }),
    User.deleteOne({ _id: mentor._id }),
    MentorshipSession.deleteOne({ _id: session._id }),
    PreparationPlan.deleteMany({ userId: candidate._id }),
    Notification.deleteMany({ userId: { $in: [candidate._id, mentor._id] } }),
    Message.deleteMany({ senderId: candidate._id })
  ]);

  console.log("\n==========================================");
  console.log("MENTOR & NOTIFICATIONS AUDIT COMPLETE: ALL PASSED!");
  console.log("==========================================");

  await mongoose.disconnect();
  process.exit(0);
}

runAudit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
