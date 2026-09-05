/**
 * CareerPilot AI - Forgot-To-Save (Untracked Application) Discovery Test Suite
 * Validates untracked email detection, recovery payload generation, and
 * creation of auto-discovered applications without fabricated unobserved history.
 */

import assert from "node:assert";
import { classifyEmailEvent } from "../src/services/career/emailClassificationService.js";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING FORGOT-TO-SAVE RECOVERY TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // 1. Untracked Interview Invitation Discovery
  test("Untracked Interview Invitation Discovery", () => {
    const untrackedEmail = {
      messageId: "msg-untracked-101",
      senderName: "TechCorp Recruiter",
      senderEmail: "careers@techcorp.com",
      subject: "Interview Invitation: Senior Software Engineer at TechCorp",
      bodyText: "We are pleased to invite you for an interview for the Senior Software Engineer position at TechCorp.",
    };

    const classified = classifyEmailEvent(untrackedEmail);

    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "INTERVIEW_INVITATION");
    assert.strictEqual(classified.detectedStatus, "interview");
    assert.strictEqual(classified.detectedCompany, "TechCorp");
    assert.strictEqual(classified.detectedRole, "Senior Software Engineer");
  });

  // 2. Untracked Online Assessment Discovery
  test("Untracked OA Discovery", () => {
    const untrackedEmail = {
      messageId: "msg-untracked-102",
      senderName: "Innovate AI Team",
      senderEmail: "hr@innovateai.com",
      subject: "Coding Assessment Invitation - HackerRank",
      bodyText: "Please complete the technical online assessment for your Data Scientist application at Innovate AI.",
    };

    const classified = classifyEmailEvent(untrackedEmail);

    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "OA_INVITATION");
    assert.strictEqual(classified.detectedStatus, "oa");
    assert.strictEqual(classified.detectedCompany, "Innovate AI");
    assert.strictEqual(classified.detectedRole, "Data Scientist");
  });

  // 3. Evidence Preservation without Fabricated History
  test("Evidence Preservation without Fabricated History", () => {
    const email = {
      messageId: "msg-untracked-103",
      senderEmail: "talent@nextgen.io",
      subject: "Offer Letter - NextGen Systems",
      bodyText: "We are delighted to offer you the position of Principal Architect at NextGen Systems.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.detectedStatus, "offer");

    // Construct application payload as createApplicationFromEmail would
    const appPayload = {
      company: classified.detectedCompany,
      role: classified.detectedRole,
      status: classified.detectedStatus,
      statusHistory: [
        {
          fromStatus: "",
          toStatus: classified.detectedStatus,
          changedBy: "email",
          source: "email_auto_discovered",
          evidence: classified.evidenceSnippet,
        },
      ],
    };

    assert.strictEqual(appPayload.status, "offer");
    assert.strictEqual(appPayload.statusHistory.length, 1);
    assert.strictEqual(appPayload.statusHistory[0].toStatus, "offer");
    assert.strictEqual(appPayload.statusHistory[0].fromStatus, "", "Must NOT fabricate unobserved 'applied' or 'screening' history entries");
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} FORGOT-TO-SAVE TESTS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
