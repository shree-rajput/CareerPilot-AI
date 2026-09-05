import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { classifyEmailEvent } from "../src/services/career/emailClassificationService.js";
import { canTransitionStatus, validateAndApplyTransition } from "../src/services/career/statusTransitionEngine.js";

describe("Email Application Lifecycle Event Pipeline Test Suite", () => {
  describe("1. Multi-Signal Email Event Classification", () => {
    it("should classify rejection emails accurately with HIGH confidence", () => {
      const email = {
        messageId: "msg-rej-1",
        senderEmail: "no-reply@greenhouse.io",
        senderDomain: "greenhouse.io",
        subject: "Update on your application for Software Engineer at Stripe",
        bodyText: "Hi Candidate, Thank you for taking the time to interview with us. Unfortunately, we have decided not to move forward with your application at this time.",
      };

      const res = classifyEmailEvent(email);
      assert.equal(res.isApplicationRelevant, true);
      assert.equal(res.eventType, "APPLICATION_REJECTED");
      assert.equal(res.detectedStatus, "rejected");
      assert.equal(res.eventConfidence, "HIGH");
      assert.equal(res.detectedCompany.toLowerCase(), "stripe");
    });

    it("should classify interview invitation emails accurately with HIGH confidence", () => {
      const email = {
        messageId: "msg-int-1",
        senderEmail: "recruiting@google.com",
        senderDomain: "google.com",
        subject: "Interview Invitation — Software Engineer at Google",
        bodyText: "Hi candidate, We would like to invite you to a 45-minute technical interview for the Software Engineer role.",
      };

      const res = classifyEmailEvent(email);
      assert.equal(res.isApplicationRelevant, true);
      assert.equal(res.eventType, "INTERVIEW_INVITATION");
      assert.equal(res.detectedStatus, "interview");
      assert.equal(res.eventConfidence, "HIGH");
      assert.equal(res.detectedCompany.toLowerCase(), "google");
    });

    it("should classify Online Assessment (OA) emails with HIGH confidence", () => {
      const email = {
        messageId: "msg-oa-1",
        senderEmail: "no-reply@codesignal.com",
        senderDomain: "codesignal.com",
        subject: "Complete your online assessment for Meta",
        bodyText: "Please complete your HackerRank / CodeSignal technical assessment for Meta within 5 days.",
      };

      const res = classifyEmailEvent(email);
      assert.equal(res.isApplicationRelevant, true);
      assert.equal(res.eventType, "OA_INVITATION");
      assert.equal(res.detectedStatus, "oa");
      assert.equal(res.eventConfidence, "HIGH");
    });

    it("should classify Offer emails with HIGH confidence", () => {
      const email = {
        messageId: "msg-off-1",
        senderEmail: "hr@netflix.com",
        senderDomain: "netflix.com",
        subject: "Congratulations — Offer of Employment",
        bodyText: "We are pleased to offer you the Senior Frontend Engineer position at Netflix. Please review your compensation details.",
      };

      const res = classifyEmailEvent(email);
      assert.equal(res.isApplicationRelevant, true);
      assert.equal(res.eventType, "OFFER_RECEIVED");
      assert.equal(res.detectedStatus, "offer");
      assert.equal(res.eventConfidence, "HIGH");
    });

    it("should mark company newsletters as NOT_APPLICATION_RELEVANT", () => {
      const email = {
        messageId: "msg-news-1",
        senderEmail: "newsletter@techcrunch.com",
        senderDomain: "techcrunch.com",
        subject: "Weekly Tech Digest & Top Stories",
        bodyText: "Read our latest articles on startup funding and artificial intelligence developments.",
      };

      const res = classifyEmailEvent(email);
      assert.equal(res.isApplicationRelevant, false);
      assert.equal(res.relevanceCategory, "UNRELATED");
    });
  });

  describe("2. Status Transition Engine & Lifecycle Guardrails", () => {
    it("should allow valid forward transitions (applied -> interview -> offer)", () => {
      assert.equal(canTransitionStatus("applied", "interview", "email"), true);
      assert.equal(canTransitionStatus("interview", "offer", "email"), true);
      assert.equal(canTransitionStatus("applied", "rejected", "email"), true);
    });

    it("should FORBID backward transitions (offer -> interview or interview -> applied)", () => {
      assert.equal(canTransitionStatus("offer", "interview", "email"), false);
      assert.equal(canTransitionStatus("offer", "applied", "email"), false);
      assert.equal(canTransitionStatus("interview", "applied", "email"), false);
      assert.equal(canTransitionStatus("interview", "oa", "email"), false);
    });

    it("should prevent email auto-update from downgrading offer to rejected without explicit manual confirmation", () => {
      assert.equal(canTransitionStatus("offer", "rejected", "email"), false);
      assert.equal(canTransitionStatus("offer", "rejected", "manual"), true);
    });

    it("should properly record transition details and statusHistory in Application object", () => {
      const mockApp = {
        status: "applied",
        statusHistory: [],
        save: async () => {},
      };

      const res = validateAndApplyTransition(mockApp, {
        targetStatus: "interview",
        source: "email",
        confidence: "high",
        evidence: "Technical interview invitation snippet",
      });

      assert.equal(res.success, true);
      assert.equal(mockApp.status, "interview");
      assert.equal(mockApp.statusHistory.length, 1);
      assert.equal(mockApp.statusHistory[0].fromStatus, "applied");
      assert.equal(mockApp.statusHistory[0].toStatus, "interview");
      assert.equal(mockApp.statusHistory[0].changedBy, "email");
    });
  });
});
