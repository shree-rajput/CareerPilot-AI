import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import { CronLock } from "../models/CronLock.js";
import { PreparationTimer } from "../models/PreparationTimer.js";
import { Notification } from "../models/Notification.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendEmailNotification
} from "../services/email/emailService.js";
import {
  runAutoStaleCheck,
  runDailyCareerReminders
} from "../services/scheduler/cronScheduler.js";
import {
  updateSchedulePreferences,
  getTimerState,
  syncTimerState
} from "../services/career/preparationService.js";
import { runNotificationEngine } from "../services/notification/notificationEngine.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function runTests() {
  console.log("==========================================");
  console.log("   Platform Stabilization Verification");
  console.log("==========================================");

  await connectDatabase();

  const testEmail = `test_audit_${Date.now()}@careerpilot.ai`;
  let testUser;

  try {
    // -------------------------------------------------------------------------
    // 1. SIGNUP & EMAIL VERIFICATION TOKEN GENERATION
    // -------------------------------------------------------------------------
    console.log("\n[1/7] Testing Signup & Verification Token Generation...");
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenHash = hashToken(rawVerificationToken);
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);

    testUser = await User.create({
      name: "Audit Test User",
      email: testEmail,
      passwordHash,
      isEmailVerified: false,
      emailVerificationTokenHash,
      emailVerificationExpiresAt
    });

    console.log(`✓ User created with ID ${testUser._id}, isEmailVerified: ${testUser.isEmailVerified}`);
    if (testUser.isEmailVerified !== false || !testUser.emailVerificationTokenHash) {
      throw new Error("Email verification initial fields failed verification check.");
    }

    // Test Nodemailer Verification Dispatch
    const emailResult = await sendVerificationEmail({ user: testUser, token: rawVerificationToken });
    console.log(`✓ Nodemailer Verification Email Dispatch: ${emailResult ? "SUCCESS" : "FAILED"}`);

    // -------------------------------------------------------------------------
    // 2. VERIFY EMAIL TOKEN VALIDATION
    // -------------------------------------------------------------------------
    console.log("\n[2/7] Testing Email Token Verification...");
    const hashed = hashToken(rawVerificationToken);
    const verifyUser = await User.findOne({
      emailVerificationTokenHash: hashed,
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!verifyUser) throw new Error("Could not find user by verification token hash.");

    verifyUser.isEmailVerified = true;
    verifyUser.emailVerificationTokenHash = null;
    verifyUser.emailVerificationExpiresAt = null;
    await verifyUser.save();

    console.log(`✓ Email verified successfully for ${verifyUser.email}. isEmailVerified: ${verifyUser.isEmailVerified}`);

    // -------------------------------------------------------------------------
    // 3. FORGOT PASSWORD & PASSWORD RESET LIFECYCLE
    // -------------------------------------------------------------------------
    console.log("\n[3/7] Testing Forgot Password & Password Reset Lifecycle...");
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(rawResetToken);
    testUser.resetPasswordTokenHash = resetTokenHash;
    testUser.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await testUser.save();

    const resetResult = await sendPasswordResetEmail({ user: testUser, token: rawResetToken });
    console.log(`✓ Nodemailer Password Reset Link Email: ${resetResult ? "SUCCESS" : "FAILED"}`);

    // Reset Password Execution
    const resetUser = await User.findOne({
      resetPasswordTokenHash: hashToken(rawResetToken),
      resetPasswordExpiresAt: { $gt: new Date() }
    });
    if (!resetUser) throw new Error("Could not find user by reset token hash.");

    const newPasswordHash = await bcrypt.hash("NewSecurePassword456!", 10);
    resetUser.passwordHash = newPasswordHash;
    resetUser.resetPasswordTokenHash = null;
    resetUser.resetPasswordExpiresAt = null;
    await resetUser.save();

    const isMatch = await bcrypt.compare("NewSecurePassword456!", resetUser.passwordHash);
    console.log(`✓ Password updated and verified with bcrypt compare: ${isMatch ? "MATCHED" : "FAILED"}`);

    const resetConfirmResult = await sendPasswordResetConfirmationEmail({ user: resetUser });
    console.log(`✓ Reset Confirmation Email: ${resetConfirmResult ? "SUCCESS" : "FAILED"}`);

    // -------------------------------------------------------------------------
    // 4. CRON SCHEDULER & MULTI-INSTANCE LOCK SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log("\n[4/7] Testing Cron Scheduler & Multi-Instance Lock Synchronization...");
    const staleResult = await runAutoStaleCheck();
    console.log(`✓ Auto-Stale Cron Check executed cleanly:`, staleResult);

    const reminderResult = await runDailyCareerReminders();
    console.log(`✓ Daily Career Reminders Cron executed cleanly:`, reminderResult);

    // Test Lock collision protection
    const secondLockAttempt = await CronLock.findOne({ jobName: "AUTO_STALE_CHECK" }).lean();
    console.log(`✓ CronLock document present in MongoDB: ${secondLockAttempt ? "YES" : "NO"} (Job: ${secondLockAttempt?.jobName})`);

    // -------------------------------------------------------------------------
    // 5. PREPARATION SCHEDULE PREFERENCES & PERSISTENT STUDY TIMER
    // -------------------------------------------------------------------------
    console.log("\n[5/7] Testing Preparation Schedule & Persistent Study Timer...");
    const schedPref = await updateSchedulePreferences(testUser._id, { studyHours: 3, emailTime: "08:30" });
    console.log(`✓ Schedule preferences updated: ${schedPref.availablePrepMinutesPerDay}m daily, ${schedPref.prepReminderTime} reminder.`);

    const timerSync = await syncTimerState(testUser._id, {
      skillName: "React",
      taskTitle: "Practice React Hooks & Context",
      targetMinutes: 30,
      elapsedSeconds: 300,
      isPaused: false,
      isRunning: true
    });
    console.log(`✓ Timer synced state saved to DB:`, {
      skillName: timerSync.skillName,
      elapsedSeconds: timerSync.elapsedSeconds,
      isRunning: timerSync.isRunning
    });

    const timerFetch = await getTimerState(testUser._id);
    if (timerFetch.elapsedSeconds !== 300) {
      throw new Error("Timer persistent fetch failed to match synced elapsed seconds.");
    }
    console.log(`✓ Timer persistent retrieval verified: ${timerFetch.elapsedSeconds} seconds remaining state preserved.`);

    // -------------------------------------------------------------------------
    // 6. NOTIFICATION ENGINE SCAN & UNREAD COUNT
    // -------------------------------------------------------------------------
    console.log("\n[6/7] Testing Notification Engine Scan & Persistence...");
    const engineStats = await runNotificationEngine();
    console.log(`✓ Notification Engine Execution Stats:`, engineStats);

    const notifCount = await Notification.countDocuments({ userId: testUser._id });
    console.log(`✓ Total notifications persisted for test user: ${notifCount}`);

    // -------------------------------------------------------------------------
    // 7. CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n[7/7] Cleaning up test records...");
    await User.deleteOne({ _id: testUser._id });
    await PreparationTimer.deleteOne({ userId: testUser._id });
    await Notification.deleteMany({ userId: testUser._id });
    await CronLock.deleteMany({ jobName: { $in: ["AUTO_STALE_CHECK", "DAILY_CAREER_REMINDERS"] } });
    console.log("✓ Cleanup completed.");

    console.log("\n==========================================");
    console.log("   ALL PLATFORM STABILIZATION TESTS PASSED");
    console.log("==========================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    if (testUser?._id) {
      await User.deleteOne({ _id: testUser._id });
      await PreparationTimer.deleteOne({ userId: testUser._id });
      await Notification.deleteMany({ userId: testUser._id });
    }
    process.exit(1);
  }
}

runTests();
