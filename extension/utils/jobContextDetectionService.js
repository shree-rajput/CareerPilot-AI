import { cleanText } from "./sanitizer.js";

/**
 * Generic Job Context Detection Engine
 * Determines if a webpage is a valid job posting based on Positive Evidence.
 * DOES NOT rely on a domain blacklist (e.g., chatgpt.com).
 */
export class JobContextDetectionService {
  /**
   * Detects job context and returns structured result.
   * @param {Document} doc - Document object (defaults to window.document)
   * @param {string} url - URL string (defaults to window.location.href)
   */
  static detectJobContext(doc = window.document, url = window.location.href) {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    let score = 0;
    const evidence = [];
    const reasons = [];

    // --- 1. NEGATIVE & CONTRADICTORY SIGNALS (Subtractive) ---
    // If it's a known email context, defer entirely.
    if (host.includes("mail.google.com") || host.includes("outlook.live.com")) {
      return this._buildResult(0, "NON_JOB_PAGE", "email_provider", ["Email inbox detected"], ["Gmail/Outlook context"]);
    }

    // Check for conversational / chat AI interfaces
    if (doc.querySelector('textarea[placeholder*="message" i]') || doc.querySelector('textarea[placeholder*="chat" i]')) {
      score -= 30;
      reasons.push("Presence of conversational chat interface");
    }

    // Check for article/blog semantics
    if (doc.querySelector("article") && doc.querySelector('meta[property="article:published_time"]')) {
      score -= 40;
      reasons.push("Page structure matches a published article/blog");
    }

    // Check for search engine/forum layouts (many small result items, upvote arrows, etc.)
    if (doc.querySelectorAll(".search-result, .g, .yuRUbf").length > 5) {
      score -= 40;
      reasons.push("Layout resembles a generic search engine result page");
    }

    if (doc.querySelector(".question-page") || doc.querySelector(".answercell")) {
      score -= 50;
      reasons.push("Forum / Q&A layout detected (e.g., StackOverflow)");
    }

    // --- 2. POSITIVE SIGNALS (Additive) ---
    // Signal A: JSON-LD JobPosting schema (Strongest generic signal)
    let hasJsonLd = false;
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
            hasJsonLd = true;
            break;
          }
        }
        if (hasJsonLd) break;
      }
    } catch (e) {}

    if (hasJsonLd) {
      score += 50;
      evidence.push("Valid JSON-LD JobPosting schema found");
    }

    // Signal B: Application Elements (Apply Buttons)
    const applyButtons = Array.from(doc.querySelectorAll("button, a")).filter(el => {
      const text = (el.textContent || "").trim().toLowerCase();
      // "easy apply", "apply now", "submit application"
      return /^(apply|apply now|easy apply|submit application|apply for this job|apply for this position)$/i.test(text);
    });

    if (applyButtons.length > 0) {
      score += 20;
      evidence.push("Prominent Application button found");
    }

    // Signal C: URL Semantics
    if (/\/jobs?\//.test(path) || /\/careers?\//.test(path) || /\/vacanc(y|ies)\//.test(path) || /\/requisition\//.test(path) || /jk=|gh_jid=/.test(url)) {
      score += 15;
      evidence.push("URL structure contains career/job posting identifiers");
    }

    // Signal D: Semantic Job Requirements / Qualifications
    const headers = Array.from(doc.querySelectorAll("h1, h2, h3, h4, strong, b")).map(el => (el.textContent || "").toLowerCase());
    const hasReqs = headers.some(t => t.includes("requirements") || t.includes("qualifications") || t.includes("what you'll do") || t.includes("responsibilities"));
    if (hasReqs) {
      score += 15;
      evidence.push("Job requirements/responsibilities section detected");
    }

    // Signal E: Compensation / Salary blocks
    if (doc.body && doc.body.textContent && /(\$|€|£)\s*\d{2,3},?\d{3}\s*(-\s*(\$|€|£)?\s*\d{2,3},?\d{3})?/.test(doc.body.textContent)) {
      // Looks for $60,000 - $80,000 or similar
      if (headers.some(t => t.includes("salary") || t.includes("compensation") || t.includes("pay"))) {
        score += 10;
        evidence.push("Compensation/Salary metadata detected");
      }
    }

    // --- 3. PLATFORM & CONTEXT DETERMINATION ---
    let platform = "unknown";
    if (host.includes("linkedin.com")) platform = "linkedin";
    else if (host.includes("indeed.com")) platform = "indeed";
    else if (host.includes("greenhouse.io") || url.includes("gh_jid")) platform = "greenhouse";
    else if (host.includes("lever.co")) platform = "lever";
    else if (host.includes("workday.com") || host.includes("myworkdayjobs.com")) platform = "workday";
    else if (host.includes("ashbyhq.com")) platform = "ashby";
    else if (host.includes("smartrecruiters.com")) platform = "smartrecruiters";
    else if (host.includes("naukri.com")) platform = "naukri";
    else if (host.includes("wellfound.com")) platform = "wellfound";

    let contextType = "UNKNOWN";
    if (score >= 40) {
      contextType = "JOB_POSTING";
      // Determine if it's just a general career page vs a specific posting
      if (path === "/careers" || path === "/jobs" || path === "/careers/") {
        if (!hasJsonLd && applyButtons.length === 0) {
          contextType = "CAREER_PAGE";
          score -= 20; // Reduce score for general landing pages
          reasons.push("Appears to be a general career landing page, not a specific job");
        }
      }
    } else {
      contextType = "NON_JOB_PAGE";
    }

    return this._buildResult(score, contextType, platform, evidence, reasons, url);
  }

  static _buildResult(score, contextType, platform, evidence, reasons, url = "") {
    // Thresholds:
    // >= 70 : HIGH
    // 40-69 : MEDIUM
    // < 40  : LOW
    let confidence = "LOW";
    if (score >= 70) confidence = "HIGH";
    else if (score >= 40) confidence = "MEDIUM";

    return {
      isJobContext: confidence === "HIGH" || confidence === "MEDIUM",
      confidence,
      score: Math.max(0, Math.min(100, score)),
      contextType,
      platform,
      evidence,
      reasons,
      jobUrl: url
    };
  }
}
