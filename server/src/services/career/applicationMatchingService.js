/**
 * CareerPilot AI - Application Matching Service
 * Matches incoming email events to the user's existing CareerPilot applications.
 * Enforces dual-confidence separation (eventConfidence & applicationMatchConfidence)
 * and detects AMBIGUOUS_MATCH scenarios when multiple company applications exist.
 */

import { Application } from "../../models/Application.js";

function cleanToken(str) {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getTokens(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export async function matchEmailToApplication(userId, emailData, classifiedEvent) {
  const {
    detectedCompany = "",
    detectedRole = "",
  } = classifiedEvent || {};

  const {
    senderEmail = "",
    senderDomain = "",
    subject = "",
    links = [],
    threadId = "",
  } = emailData || {};

  // Fetch active candidate applications
  const userApplications = await Application.find({ userId })
    .select("_id company role status jobUrl statusHistory createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!userApplications || userApplications.length === 0) {
    return {
      matchedApplication: null,
      confidence: "LOW",
      confidenceScore: 0,
      isAmbiguous: false,
      matchingCandidates: [],
      matchSignals: ["NO_CANDIDATE_APPLICATIONS_FOUND"],
      reasoning: "No job applications found in candidate workspace.",
    };
  }

  const cleanDetCompany = cleanToken(detectedCompany);
  const detCompanyTokens = getTokens(detectedCompany);
  const detRoleTokens = getTokens(detectedRole || subject);
  const cleanSenderDomain = cleanToken(senderDomain.split(".")[0]);

  const candidatesWithScores = userApplications.map((app) => {
    let score = 0;
    const signals = [];

    const cleanAppCompany = cleanToken(app.company);
    const appCompanyTokens = getTokens(app.company);
    const appRoleTokens = getTokens(app.role);

    // 1. Exact / Partial Company Match
    if (cleanDetCompany && cleanAppCompany && cleanDetCompany === cleanAppCompany) {
      score += 45;
      signals.push("EXACT_COMPANY_MATCH");
    } else if (
      cleanDetCompany &&
      cleanAppCompany &&
      (cleanDetCompany.includes(cleanAppCompany) || cleanAppCompany.includes(cleanDetCompany))
    ) {
      score += 35;
      signals.push("PARTIAL_COMPANY_MATCH");
    } else if (detCompanyTokens.some((t) => appCompanyTokens.includes(t))) {
      score += 20;
      signals.push("TOKEN_COMPANY_MATCH");
    }

    // 2. Sender Domain Match
    if (
      cleanSenderDomain &&
      cleanAppCompany &&
      (cleanSenderDomain.includes(cleanAppCompany) || cleanAppCompany.includes(cleanSenderDomain))
    ) {
      score += 25;
      signals.push("SENDER_DOMAIN_MATCH");
    }

    // 3. Role Title Match
    const roleTokenOverlap = detRoleTokens.filter((t) => appRoleTokens.includes(t));
    if (roleTokenOverlap.length > 0) {
      score += Math.min(30, roleTokenOverlap.length * 15);
      signals.push(`ROLE_TOKEN_MATCH_${roleTokenOverlap.length}`);
    }

    // 4. Job URL Match
    if (
      app.jobUrl &&
      links.some(
        (link) =>
          link.toLowerCase().includes(app.jobUrl.toLowerCase()) ||
          app.jobUrl.toLowerCase().includes(link.toLowerCase())
      )
    ) {
      score += 35;
      signals.push("JOB_URL_MATCH");
    }

    // 5. Thread ID Match
    if (
      threadId &&
      app.statusHistory?.some(
        (sh) => sh.note?.includes(threadId) || sh.evidence?.includes(threadId)
      )
    ) {
      score += 30;
      signals.push("THREAD_ID_MATCH");
    }

    return {
      application: app,
      score,
      signals,
    };
  });

  // Sort by score descending
  candidatesWithScores.sort((a, b) => b.score - a.score);

  const topMatch = candidatesWithScores[0];
  const runnerUp = candidatesWithScores[1];

  if (!topMatch || topMatch.score < 25) {
    return {
      matchedApplication: null,
      confidence: "LOW",
      confidenceScore: topMatch?.score || 0,
      isAmbiguous: false,
      matchingCandidates: [],
      matchSignals: topMatch?.signals || ["LOW_MATCH_SCORE"],
      reasoning: "No application matched the email criteria with sufficient confidence.",
    };
  }

  // Check for Ambiguous Match (Multiple applications at same company with close scores)
  const closeMatches = candidatesWithScores.filter((c) => c.score >= 35 && topMatch.score - c.score < 15);
  const isAmbiguous = closeMatches.length > 1;

  if (isAmbiguous) {
    return {
      matchedApplication: null,
      confidence: "MEDIUM",
      confidenceScore: topMatch.score,
      isAmbiguous: true,
      matchingCandidates: closeMatches.map((c) => ({
        _id: c.application._id,
        company: c.application.company,
        role: c.application.role,
        status: c.application.status,
        score: c.score,
      })),
      matchSignals: ["AMBIGUOUS_MULTIPLE_COMPANY_APPLICATIONS"],
      reasoning: "Multiple candidate applications match the email company. User confirmation required.",
    };
  }

  // Determine application match confidence level
  let confidence = "LOW";
  const scoreGap = runnerUp ? topMatch.score - runnerUp.score : topMatch.score;

  if (topMatch.score >= 50 && (scoreGap >= 15 || !runnerUp || runnerUp.score < 30)) {
    confidence = "HIGH";
  } else if (topMatch.score >= 35) {
    confidence = "MEDIUM";
  }

  return {
    matchedApplication: topMatch.application,
    confidence,
    confidenceScore: topMatch.score,
    isAmbiguous: false,
    matchingCandidates: [
      {
        _id: topMatch.application._id,
        company: topMatch.application.company,
        role: topMatch.application.role,
        status: topMatch.application.status,
        score: topMatch.score,
      },
    ],
    matchSignals: topMatch.signals,
    reasoning: `Matched '${topMatch.application.company} - ${topMatch.application.role}' via signals: ${topMatch.signals.join(", ")}`,
  };
}
