/**
 * CareerPilot AI - Email Lifecycle Detection & Context Test Suite
 * Validates relevance classification, event classification, company/role body regex extraction,
 * transition safeguards, and ambiguity detection across 18 realistic email scenarios.
 */

import assert from "node:assert";
import {
  classifyEmailEvent,
  classifyEmailRelevance,
  extractCompanyAndRoleFromEmail,
} from "../src/services/career/emailClassificationService.js";
import { canTransitionStatus } from "../src/services/career/statusTransitionEngine.js";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING GMAIL LIFECYCLE & CONTEXT TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] Scenario ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Scenario ${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // --------------------------------------------------
  // 1. SCREENSHOT REGRESSION FIXTURE (Soranova Technologies)
  // --------------------------------------------------
  test("Screenshot Fixture: Application Received from Recooty", () => {
    const screenshotEmail = {
      messageId: "msg-soranova-001",
      threadId: "thread-001",
      senderName: "Soranova Hiring Team",
      senderEmail: "notifications@recooty.com",
      senderDomain: "recooty.com",
      subject: "Application Received - Thank You!",
      bodyText:
        "Thank you for applying for the Software Developer- Fresher position at Soranova Technologies Private Limited. We have received your application, and our hiring team is currently reviewing all submissions. If you are among the qualified candidates, you will receive a call or an email from one of our recruiters to arrange an interview.",
    };

    const classified = classifyEmailEvent(screenshotEmail);

    assert.strictEqual(classified.isApplicationRelevant, true, "Should be application relevant");
    assert.strictEqual(classified.eventType, "APPLICATION_RECEIVED", "Event type should be APPLICATION_RECEIVED");
    assert.strictEqual(classified.detectedStatus, "applied", "Detected status should be 'applied'");
    assert.strictEqual(classified.detectedCompany, "Soranova Technologies Private Limited", "Should extract exact company");
    assert.strictEqual(classified.detectedRole, "Software Developer- Fresher", "Should extract exact role");
    assert.strictEqual(classified.eventConfidence, "HIGH", "Event confidence should be HIGH");
  });

  // --------------------------------------------------
  // 2. Application Submitted
  // --------------------------------------------------
  test("Application Submitted Event", () => {
    const email = {
      senderEmail: "jobs@acme.com",
      subject: "Application Submitted: Senior Backend Engineer at Acme Corp",
      bodyText: "Thank you for submitting your application for the Senior Backend Engineer role at Acme Corp.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.detectedStatus, "applied");
    assert.strictEqual(classified.detectedCompany, "Acme Corp");
    assert.strictEqual(classified.detectedRole, "Senior Backend Engineer");
  });

  // --------------------------------------------------
  // 3. Application Advanced
  // --------------------------------------------------
  test("Application Shortlisted / Advanced", () => {
    const email = {
      senderEmail: "careers@techstart.io",
      subject: "Update on your application",
      bodyText: "Congratulations! You have been shortlisted for the next round for the Fullstack Developer position at TechStart.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "APPLICATION_ADVANCED");
  });

  // --------------------------------------------------
  // 4. Online Assessment (OA) Invitation
  // --------------------------------------------------
  test("OA Invitation Event", () => {
    const email = {
      senderEmail: "recruiting@hackercompany.com",
      subject: "Coding Assessment Invitation - HackerRank",
      bodyText: "Please complete the technical online assessment for your software engineer application at HackerCompany.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "OA_INVITATION");
    assert.strictEqual(classified.detectedStatus, "oa");
  });

  // --------------------------------------------------
  // 5. Interview Invitation
  // --------------------------------------------------
  test("Interview Invitation Event", () => {
    const email = {
      senderEmail: "talent@meta.com",
      subject: "Interview Invitation: Meta Engineering",
      bodyText: "We would like to invite you for a virtual interview for the Frontend Engineer position at Meta.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "INTERVIEW_INVITATION");
    assert.strictEqual(classified.detectedStatus, "interview");
    assert.strictEqual(classified.eventConfidence, "HIGH");
  });

  // --------------------------------------------------
  // 6. Interview Scheduled
  // --------------------------------------------------
  test("Interview Scheduled Event", () => {
    const email = {
      senderEmail: "calendar@google.com",
      subject: "Confirmed: Technical Interview with Google",
      bodyText: "Your technical interview with Google for Systems Architect is scheduled for Monday at 10:00 AM.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "INTERVIEW_SCHEDULED");
    assert.strictEqual(classified.detectedStatus, "interview");
  });

  // --------------------------------------------------
  // 7. Offer Received Event
  // --------------------------------------------------
  test("Offer Received Event", () => {
    const email = {
      senderEmail: "hr@stripe.com",
      subject: "Offer of Employment - Stripe",
      bodyText: "We are pleased to offer you the position of Staff Software Engineer at Stripe.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "OFFER_RECEIVED");
    assert.strictEqual(classified.detectedStatus, "offer");
    assert.strictEqual(classified.eventConfidence, "HIGH");
  });

  // --------------------------------------------------
  // 8. Application Rejected Event
  // --------------------------------------------------
  test("Application Rejected Event", () => {
    const email = {
      senderEmail: "no-reply@greenhouse.io",
      subject: "Your Application - Soranova Technologies",
      bodyText: "Thank you for taking the time to interview. Unfortunately, we have decided not to move forward with your application.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "APPLICATION_REJECTED");
    assert.strictEqual(classified.detectedStatus, "rejected");
  });

  // --------------------------------------------------
  // 9. Application Withdrawn Event
  // --------------------------------------------------
  test("Application Withdrawn Event", () => {
    const email = {
      senderEmail: "careers@workday.com",
      subject: "Application Withdrawal Confirmed",
      bodyText: "This confirms that your application for the Product Manager role has been withdrawn.",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, true);
    assert.strictEqual(classified.eventType, "APPLICATION_WITHDRAWN");
    assert.strictEqual(classified.detectedStatus, "withdrawn");
  });

  // --------------------------------------------------
  // 10. False Positive Protection: Interview Advice Newsletter
  // --------------------------------------------------
  test("False Positive: Interview Advice Newsletter", () => {
    const email = {
      senderEmail: "newsletter@geeksforgeeks.org",
      subject: "10 Interview Questions Every Developer Should Know",
      bodyText: "Here are top 10 interview questions and answers to help prepare for your next technical interview round.",
    };

    const relevance = classifyEmailRelevance(email);
    assert.strictEqual(relevance.isRelevant, false, "Newsletter should NOT be application relevant");
    assert.strictEqual(relevance.relevanceCategory, "JOB_NEWSLETTER");
  });

  // --------------------------------------------------
  // 11. False Positive Protection: Job Alert Digest
  // --------------------------------------------------
  test("False Positive: Indeed Job Digest", () => {
    const email = {
      senderEmail: "alert@indeed.com",
      subject: "Top job picks for you on Indeed",
      bodyText: "Check out these new jobs matching your search: Recommended jobs for you in Indore.",
    };

    const relevance = classifyEmailRelevance(email);
    assert.strictEqual(relevance.isRelevant, false, "Job alert digest should be ignored");
  });

  // --------------------------------------------------
  // 12. Transition Rule: Saved -> Applied (Allowed)
  // --------------------------------------------------
  test("Transition Rule: saved -> applied", () => {
    const ok = canTransitionStatus("saved", "applied", "email");
    assert.strictEqual(ok, true);
  });

  // --------------------------------------------------
  // 13. Transition Rule: Applied -> Interview (Allowed)
  // --------------------------------------------------
  test("Transition Rule: applied -> interview", () => {
    const ok = canTransitionStatus("applied", "interview", "email");
    assert.strictEqual(ok, true);
  });

  // --------------------------------------------------
  // 14. Transition Rule: Interview -> Offer (Allowed)
  // --------------------------------------------------
  test("Transition Rule: interview -> offer", () => {
    const ok = canTransitionStatus("interview", "offer", "email");
    assert.strictEqual(ok, true);
  });

  // --------------------------------------------------
  // 15. Transition Protection: Offer -> Interview (Forbidden Downgrade)
  // --------------------------------------------------
  test("Transition Protection: offer -> interview (Forbidden)", () => {
    const ok = canTransitionStatus("offer", "interview", "email");
    assert.strictEqual(ok, false, "Cannot downgrade offer to interview from older email");
  });

  // --------------------------------------------------
  // 16. Transition Protection: Rejected -> Applied (Forbidden)
  // --------------------------------------------------
  test("Transition Protection: rejected -> applied (Forbidden)", () => {
    const ok = canTransitionStatus("rejected", "applied", "email");
    assert.strictEqual(ok, false, "Cannot automatically revert terminal rejected status via email");
  });

  // --------------------------------------------------
  // 17. Body Regex Extraction for Position & Company
  // --------------------------------------------------
  test("Body Regex Extraction: Complex text format", () => {
    const result = extractCompanyAndRoleFromEmail({
      subject: "Update on your recent application",
      bodyText: "We are reviewing your application for the Senior Software Engineer position at Soranova Technologies Private Limited.",
      senderEmail: "hr@soranova.com",
    });

    assert.strictEqual(result.role, "Senior Software Engineer");
    assert.strictEqual(result.company, "Soranova Technologies Private Limited");
  });

  // --------------------------------------------------
  // 18. Unrelated Personal Email
  // --------------------------------------------------
  test("Unrelated Personal Email Ignored", () => {
    const email = {
      senderEmail: "friend@gmail.com",
      subject: "Dinner plans tonight",
      bodyText: "Hey, are we still meeting for dinner at 7 PM tonight?",
    };

    const classified = classifyEmailEvent(email);
    assert.strictEqual(classified.isApplicationRelevant, false);
    assert.strictEqual(classified.eventType, "OTHER");
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} SCENARIOS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
