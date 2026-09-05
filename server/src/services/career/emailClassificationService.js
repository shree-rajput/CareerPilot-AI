/**
 * CareerPilot AI - Email Event Classification Service
 * Multi-signal classification for job application lifecycle emails.
 * Supports relevance filtering, false-positive protection (newsletters/alerts),
 * body-text company/role extraction, and event confidence calculation.
 */

const ATS_DOMAINS = new Set([
  "greenhouse.io",
  "ghdirect.com",
  "lever.co",
  "workday.com",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "taleo.net",
  "icims.com",
  "bamboohr.com",
  "jobvite.com",
  "hire.lever.co",
  "recruiting.paylocity.com",
  "recooty.com",
  "rippling.com",
  "breezy.hr",
]);

// False positive indicators (newsletters, job alerts, advice, promotional)
const NEWSLETTER_INDICATORS = [
  "jobs you may be interested in",
  "recommended jobs for you",
  "top job picks",
  "new jobs matching your search",
  "interview questions every developer should know",
  "how to prepare for your interview",
  "career advice newsletter",
  "weekly job digest",
  "daily job alert",
  "top 10 skills",
  "resume tips",
  "webinar invitation",
  "unsubscribe from this newsletter",
  "manage your job alerts",
];

const REJECTION_PHRASES = [
  "unfortunately",
  "not moving forward",
  "decided not to proceed",
  "application unsuccessful",
  "will not be moving forward",
  "position has been filled",
  "not selected",
  "regret to inform",
  "pursue other candidates",
  "other candidates whose qualifications",
  "decided to move forward with other",
  "not to advance your application",
  "unsuccessful on this occasion",
];

const INTERVIEW_PHRASES = [
  "interview invitation",
  "technical interview",
  "recruiter interview",
  "phone screen",
  "virtual interview",
  "onsite interview",
  "interview scheduling",
  "schedule your interview",
  "next interview round",
  "invite you for an interview",
  "invite you to interview",
  "schedule a time to speak",
  "schedule a time to chat",
  "like to schedule a call",
  "availability for a call",
  "arrange an interview",
];

const OA_PHRASES = [
  "online assessment",
  "coding assessment",
  "technical assessment",
  "hackerrank",
  "codesignal",
  "testgorilla",
  "karat assessment",
  "assessment invitation",
  "complete the assessment",
  "take home assignment",
  "take-home test",
];

const OFFER_PHRASES = [
  "employment offer",
  "pleased to offer",
  "delighted to offer",
  "offer of employment",
  "offer letter",
  "compensation details",
  "welcome to the team",
  "congratulations on your offer",
  "offer for the position",
];

const APPLIED_PHRASES = [
  "thank you for applying",
  "application received",
  "received your application",
  "we have received your application",
  "thank you for your interest in",
  "application submitted",
  "successfully submitted your application",
  "received your resume",
];

const ADVANCED_PHRASES = [
  "moving forward with your application",
  "shortlisted for the next round",
  "selected for the next stage",
  "we'd like to proceed with your application",
  "moved to the next stage",
  "progressed to the next step",
];

const WITHDRAWN_PHRASES = [
  "application has been withdrawn",
  "application withdrawal confirmed",
  "you have withdrawn your application",
  "confirming your withdrawal",
];

function extractEvidenceSnippet(text, keywords) {
  if (!text) return "";
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + kw.length + 60);
      return text.substring(start, end).replace(/\s+/g, " ").trim();
    }
  }
  return text.substring(0, 120).trim();
}

/**
 * Enhanced Company & Role Extraction from Email (Subject, Body, Sender, and Hints)
 */
export function extractCompanyAndRoleFromEmail({
  subject = "",
  bodyText = "",
  senderName = "",
  senderDomain = "",
  extractedCompanyHints = "",
  extractedRoleHints = "",
}) {
  let company = cleanString(extractedCompanyHints);
  let role = cleanString(extractedRoleHints);

  const fullText = `${subject} \n ${bodyText}`;

  // 1. Search Body text for "for your <Role> application/position at <Company>" or "applying for <Role> position at <Company>"
  if (!company || !role) {
    const bodyMatch1 = fullText.match(
      /(?:applying|applied|application|assessment)\s+for\s+(?:the\s+|your\s+)?(.+?)\s+(?:position|role|application)\s+at\s+([A-Z0-9\s&.\-]+?)(?:\.|\,|\s+and|\s+if|\n|$)/i
    );
    if (bodyMatch1) {
      if (!role) role = cleanString(bodyMatch1[1]);
      if (!company) company = cleanString(bodyMatch1[2]);
    }
  }

  // 2. Search Body text for "for the <Role> position at <Company>" or "<Role> at <Company>"
  if (!company || !role) {
    const bodyMatch2 = fullText.match(
      /(?:for\s+the|for\s+a|for\s+your)\s+([A-Z][A-Za-z0-9\s\-]+?)\s+(?:position|role|application)\s+at\s+([A-Z0-9\s&.\-]+?)(?:\.|\,|\s+and|\n|$)/i
    );
    if (bodyMatch2) {
      if (!role) role = cleanString(bodyMatch2[1]);
      if (!company) company = cleanString(bodyMatch2[2]);
    }
  }

  // 3. Search Subject pattern: "... for <Role> at <Company>"
  if (!company || !role) {
    const forAtMatch = subject.match(
      /(?:for|to|position|role)?\s*([^-(]+?)\s+at\s+([A-Z0-9\s&.\-]+?)(?:\s+-\s+|\s+\(|\s*$)/i
    );
    if (forAtMatch) {
      const rawRole = forAtMatch[1]
        ?.replace(/update on your application/i, "")
        ?.replace(/application/i, "")
        ?.trim();
      if (!role && rawRole) role = cleanString(rawRole);
      if (!company && forAtMatch[2]?.trim()) company = cleanString(forAtMatch[2]);
    }
  }

  // 4. Search Subject pattern: "<Role> - <Company>" or "<Company> - <Role>"
  const KNOWN_TOOLS = new Set(["hackerrank", "codesignal", "testgorilla", "karat", "greenhouse", "lever", "workday"]);
  if ((!company || !role) && subject.includes(" - ")) {
    const parts = subject.split(" - ");
    if (parts.length >= 2) {
      const p2 = cleanString(parts[1]);
      if (!KNOWN_TOOLS.has(p2.toLowerCase())) {
        if (!role) role = cleanString(parts[0]);
        if (!company) company = p2;
      } else {
        if (!role) role = cleanString(parts[0]).replace(/coding assessment invitation|interview invitation|assessment/gi, "").trim();
      }
    }
  }

  // 5. Sender Domain Fallback for Company
  if ((!company || KNOWN_TOOLS.has(company.toLowerCase())) && senderDomain && !ATS_DOMAINS.has(senderDomain.toLowerCase())) {
    const domainName = senderDomain.split(".")[0];
    if (domainName && domainName.length > 2 && !["gmail", "yahoo", "hotmail", "outlook"].includes(domainName)) {
      company = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
  }

  // 6. Sender Name Fallback
  if ((!company || KNOWN_TOOLS.has(company.toLowerCase())) && senderName && !senderName.toLowerCase().includes("no-reply")) {
    const cleanSender = senderName.replace(/careers|recruiting|team|jobs|hr|notifications/gi, "").trim();
    if (cleanSender.length > 2) {
      company = cleanSender;
    }
  }

  return { company, role };
}

function cleanString(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Step 1: Relevance Classifier
 * Determines if email is application-related vs newsletter / promotional.
 */
export function classifyEmailRelevance(emailData) {
  const {
    senderEmail = "",
    senderDomain = "",
    senderName = "",
    subject = "",
    bodyText = "",
  } = emailData || {};

  const fullText = `${subject} \n ${bodyText}`.toLowerCase();
  const domainLower = (senderDomain || "").toLowerCase();

  // Check for false positive newsletters/alerts
  const isNewsletter = NEWSLETTER_INDICATORS.some((indicator) => fullText.includes(indicator));
  if (isNewsletter) {
    return {
      isRelevant: false,
      relevanceCategory: "JOB_NEWSLETTER",
      confidenceScore: 10,
      reasoning: "Matched newsletter / job alert keyword indicators",
    };
  }

  // Check positive relevance signals
  const isAtsSender = ATS_DOMAINS.has(domainLower);
  const isRecruiterEmail =
    /careers|recruiting|talent|jobs|hr|interview|apply/i.test(senderEmail) ||
    /careers|recruiting|talent/i.test(senderName);

  let lifecycleKeywordMatches = 0;
  [
    ...REJECTION_PHRASES,
    ...INTERVIEW_PHRASES,
    ...OA_PHRASES,
    ...OFFER_PHRASES,
    ...APPLIED_PHRASES,
    ...ADVANCED_PHRASES,
    ...WITHDRAWN_PHRASES,
  ].forEach((phrase) => {
    if (fullText.includes(phrase)) lifecycleKeywordMatches++;
  });

  const hasSubjectSignal = /application|interview|job|offer|resume|position|candidate|recooty/i.test(subject);

  if (isAtsSender || isRecruiterEmail || lifecycleKeywordMatches > 0 || hasSubjectSignal) {
    return {
      isRelevant: true,
      relevanceCategory: isAtsSender ? "ATS_SYSTEM_EMAIL" : isRecruiterEmail ? "RECRUITER_RELATED" : "JOB_APPLICATION_RELATED",
      confidenceScore: isAtsSender ? 95 : 85,
      reasoning: "Sufficient evidence of being related to candidate application journey",
    };
  }

  return {
    isRelevant: false,
    relevanceCategory: "UNRELATED",
    confidenceScore: 0,
    reasoning: "No application lifecycle indicators found",
  };
}

/**
 * Step 2: Main Event Classifier
 */
export function classifyEmailEvent(emailData) {
  const relevance = classifyEmailRelevance(emailData);

  const {
    senderEmail = "",
    senderDomain = "",
    senderName = "",
    subject = "",
    bodyText = "",
    extractedCompanyHints = "",
    extractedRoleHints = "",
  } = emailData || {};

  if (!relevance.isRelevant) {
    return {
      isApplicationRelevant: false,
      eventType: "OTHER",
      relevanceCategory: relevance.relevanceCategory,
      detectedStatus: "saved",
      eventConfidence: "LOW",
      confidenceScore: relevance.confidenceScore,
      evidenceSnippet: relevance.reasoning,
      detectedCompany: "",
      detectedRole: "",
    };
  }

  const fullText = `${subject} \n ${bodyText}`.toLowerCase();

  const { company, role } = extractCompanyAndRoleFromEmail({
    subject,
    bodyText,
    senderName,
    senderDomain,
    extractedCompanyHints,
    extractedRoleHints,
  });

  // Priority 1: OFFER_RECEIVED
  const offerSnippet = extractEvidenceSnippet(fullText, OFFER_PHRASES);
  if (OFFER_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "OFFER_RECEIVED",
      detectedStatus: "offer",
      eventConfidence: "HIGH",
      confidenceScore: 95,
      evidenceSnippet: offerSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 2: APPLICATION_REJECTED
  const rejectionSnippet = extractEvidenceSnippet(fullText, REJECTION_PHRASES);
  if (REJECTION_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "APPLICATION_REJECTED",
      detectedStatus: "rejected",
      eventConfidence: "HIGH",
      confidenceScore: 92,
      evidenceSnippet: rejectionSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 1.5: APPLICATION_RECEIVED / SUBMITTED (Check first if subject or body indicates Application Received with conditional interview clauses)
  const hasAppliedPhrase = APPLIED_PHRASES.some((p) => fullText.includes(p));
  const isSubjectApplied = /application received|application submitted|thank you for applying/i.test(subject);
  const isConditionalInterview =
    /if (?:you are|selected|qualified|among).+?interview/i.test(fullText) ||
    /receive a call or an email.+?interview/i.test(fullText) ||
    /arrange an interview/i.test(fullText);

  if ((hasAppliedPhrase || isSubjectApplied) && (isConditionalInterview || !INTERVIEW_PHRASES.some((p) => fullText.includes(p)))) {
    // Only yield to explicit, non-conditional offer or rejection
    const appliedSnippet = extractEvidenceSnippet(fullText, APPLIED_PHRASES);
    return {
      isApplicationRelevant: true,
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
      eventConfidence: "HIGH",
      confidenceScore: 90,
      evidenceSnippet: appliedSnippet || fullText.substring(0, 120),
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 3: INTERVIEW_INVITATION / SCHEDULED
  const interviewSnippet = extractEvidenceSnippet(fullText, INTERVIEW_PHRASES);
  if (INTERVIEW_PHRASES.some((p) => fullText.includes(p))) {
    const isScheduled = /scheduled|confirming your interview/i.test(fullText);
    return {
      isApplicationRelevant: true,
      eventType: isScheduled ? "INTERVIEW_SCHEDULED" : "INTERVIEW_INVITATION",
      detectedStatus: "interview",
      eventConfidence: "HIGH",
      confidenceScore: 90,
      evidenceSnippet: interviewSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 4: OA_INVITATION
  const oaSnippet = extractEvidenceSnippet(fullText, OA_PHRASES);
  if (OA_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "OA_INVITATION",
      detectedStatus: "oa",
      eventConfidence: "HIGH",
      confidenceScore: 88,
      evidenceSnippet: oaSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 5: APPLICATION_WITHDRAWN
  const withdrawnSnippet = extractEvidenceSnippet(fullText, WITHDRAWN_PHRASES);
  if (WITHDRAWN_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "APPLICATION_WITHDRAWN",
      detectedStatus: "withdrawn",
      eventConfidence: "HIGH",
      confidenceScore: 90,
      evidenceSnippet: withdrawnSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 6: APPLICATION_ADVANCED
  const advancedSnippet = extractEvidenceSnippet(fullText, ADVANCED_PHRASES);
  if (ADVANCED_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "APPLICATION_ADVANCED",
      detectedStatus: "applied",
      eventConfidence: "MEDIUM",
      confidenceScore: 75,
      evidenceSnippet: advancedSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Priority 7: APPLICATION_RECEIVED / SUBMITTED
  const appliedSnippet = extractEvidenceSnippet(fullText, APPLIED_PHRASES);
  if (APPLIED_PHRASES.some((p) => fullText.includes(p))) {
    return {
      isApplicationRelevant: true,
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
      eventConfidence: "HIGH",
      confidenceScore: 88,
      evidenceSnippet: appliedSnippet,
      detectedCompany: company,
      detectedRole: role,
    };
  }

  // Fallback
  return {
    isApplicationRelevant: true,
    eventType: "OTHER",
    detectedStatus: "saved",
    eventConfidence: "LOW",
    confidenceScore: 30,
    evidenceSnippet: fullText.substring(0, 100),
    detectedCompany: company,
    detectedRole: role,
  };
}
