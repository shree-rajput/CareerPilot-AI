/**
 * CareerPilot AI - Page Context Detector
 * Responsibilities:
 * - Determine the execution context of the active page (JOB_POSTING, GMAIL_EMAIL, OTHER)
 * - Provide clean separation between Job Posting Capture and Gmail Application Lifecycle pipelines.
 */

(function () {
  const CONTEXT_TYPES = {
    JOB_POSTING: "JOB_POSTING",
    GMAIL_EMAIL: "GMAIL_EMAIL",
    OTHER: "OTHER",
  };

  function isGmail() {
    return window.location.hostname.includes("mail.google.com");
  }

  function isJobPostingPage() {
    if (isGmail()) return false;

    const url = window.location.href;
    const path = window.location.pathname.toLowerCase();

    // Check JSON-LD
    let hasJsonLdJob = false;
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
            hasJsonLdJob = true;
            break;
          }
        }
        if (hasJsonLdJob) break;
      }
    } catch (e) {}

    if (hasJsonLdJob) return true;

    // Check URL job posting indicators
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
      /lever\.co/.test(window.location.hostname) ||
      /greenhouse\.io/.test(window.location.hostname) ||
      /naukri\.com\/job-listings/.test(url) ||
      /wellfound\.com\/jobs/.test(url);

    if (isJobUrl) return true;

    // Be more permissive: if there's a title and an apply button, it's likely a job page context.
    // The extraction engine in content_script.js will make the final strict determination.
    const titleEl = document.querySelector("h1") || document.querySelector("h2");
    
    const applyButtons = Array.from(document.querySelectorAll("button, a, input[type='submit']")).filter(el => {
      const text = (el.value || el.textContent || "").trim().toLowerCase();
      return /^(apply|apply now|easy apply|submit application|apply for this job|apply for this position|submit)$/i.test(text);
    });

    if (titleEl && applyButtons.length > 0) return true;

    // Check DOM headings and description containers as fallback
    const strictTitleEl =
      document.querySelector(".job-details-jobs-unified-top-card__job-title") ||
      document.querySelector(".jobs-unified-top-card__job-title") ||
      document.querySelector(".jobsearch-JobInfoHeader-title") ||
      document.querySelector('[itemprop="title"]') ||
      document.querySelector('[data-qa="job-title"]') ||
      document.querySelector(".job-title");

    const descEl =
      document.querySelector("#job-details") ||
      document.querySelector(".jobs-description__content") ||
      document.querySelector("#jobDescriptionText") ||
      document.querySelector('[itemprop="description"]') ||
      document.querySelector("#job-description") ||
      document.querySelector(".job-description");

    if (strictTitleEl && descEl) return true;

    return false;
  }

  function detectContext() {
    if (isGmail()) {
      return CONTEXT_TYPES.GMAIL_EMAIL;
    }

    if (isJobPostingPage()) {
      return CONTEXT_TYPES.JOB_POSTING;
    }

    return CONTEXT_TYPES.OTHER;
  }

  window.__CAREERPILOT_CONTEXT_DETECTOR__ = {
    CONTEXT_TYPES,
    isGmail,
    isJobPostingPage,
    detectContext,
  };
})();
