import { cleanText, stripHtml } from "./sanitizer.js";

/**
 * Detect whether the current webpage contains an active job posting.
 * Evaluates URL patterns, JSON-LD schemas, OpenGraph metadata, and semantic DOM structures.
 */
export function detectJobPage() {
  const url = window.location.href;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  let confidence = 0;
  const reasons = [];

  // Signal 1: JSON-LD JobPosting schema (Strongest signal)
  let jsonLdJob = null;
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      if (!script.textContent) continue;
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
          jsonLdJob = item;
          break;
        }
      }
      if (jsonLdJob) break;
    }
  } catch (e) {
    // Ignore JSON-LD parse errors
  }

  if (jsonLdJob) {
    confidence += 50;
    reasons.push("JSON-LD JobPosting schema found");
  }

  // Signal 2: Known Job URL Patterns
  const isJobUrl =
    /\/jobs\/(view|collections|search-results)/.test(url) ||
    /currentJobId=/.test(url) ||
    /\/viewjob/.test(url) ||
    /jk=/.test(url) ||
    /\/job\//.test(path) ||
    /\/careers?\//.test(path) ||
    /\/position\//.test(path) ||
    /\/vacancy\//.test(path) ||
    /gh_jid=/.test(url) ||
    /lever\.co/.test(host) ||
    /greenhouse\.io/.test(host) ||
    /naukri\.com\/job-listings/.test(url) ||
    /wellfound\.com\/jobs/.test(url);

  if (isJobUrl) {
    confidence += 20;
    reasons.push("URL matches job posting pattern");
  }

  // Signal 3: Semantic Headings & Job Title Elements
  const titleEl =
    document.querySelector('[itemprop="title"]') ||
    document.querySelector('[data-qa="job-title"]') ||
    document.querySelector(".job-title") ||
    document.querySelector(".posting-headline h2") ||
    document.querySelector(".jobsearch-JobInfoHeader-title") ||
    document.querySelector(".jobs-unified-top-card__job-title") ||
    document.querySelector("h1");

  const titleText = titleEl ? cleanText(titleEl.textContent) : "";
  if (titleText && titleText.length >= 3 && titleText.length <= 120) {
    confidence += 15;
    reasons.push("Job title element detected");
  }

  // Signal 4: Job Description Container
  const descEl =
    document.querySelector('[itemprop="description"]') ||
    document.querySelector("#job-description") ||
    document.querySelector(".job-description") ||
    document.querySelector(".posting-description") ||
    document.querySelector(".jobs-description-content") ||
    document.querySelector(".jobsearch-jobDescriptionText") ||
    document.querySelector("article");

  const descText = descEl ? cleanText(descEl.textContent) : "";
  if (descText && descText.length >= 100) {
    confidence += 15;
    reasons.push("Job description content block detected");
  }

  // Determine Platform
  let detectedPlatform = "generic";
  if (host.includes("linkedin.com")) detectedPlatform = "linkedin";
  else if (host.includes("indeed.com")) detectedPlatform = "indeed";
  else if (host.includes("greenhouse.io")) detectedPlatform = "greenhouse";
  else if (host.includes("lever.co")) detectedPlatform = "lever";
  else if (host.includes("naukri.com")) detectedPlatform = "naukri";
  else if (host.includes("wellfound.com")) detectedPlatform = "wellfound";

  const isJobPage = confidence >= 35 && Boolean(titleText) && Boolean(descText);

  return {
    isJobPage,
    confidence: Math.min(100, confidence),
    reason: reasons.join(", ") || "Insufficient job posting indicators on page",
    detectedPlatform,
    extractedTitle: titleText,
    hasDescription: Boolean(descText),
  };
}
