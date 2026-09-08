/**
 * CareerPilot AI - Page Context Detector
 * Responsibilities:
 * - Determine the execution context of the active page (JOB_POSTING, GMAIL_EMAIL, OTHER)
 * - Specialized resilient detection for Indeed, LinkedIn, ATS platforms, and generic job sites.
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

  /**
   * Resilient Indeed Job Page Detector
   * Distinguishes between homepage/search-results-without-selection and actual active job postings.
   */
  function isIndeedJobPage(doc = window.document, urlStr = window.location.href) {
    try {
      const urlObj = new URL(urlStr);
      const host = urlObj.hostname.toLowerCase();
      if (!host.includes("indeed.")) return false;

      const path = urlObj.pathname.toLowerCase();
      const params = urlObj.searchParams;

      // 1. Exclude non-job Indeed routes
      if (
        path.startsWith("/account") ||
        path.startsWith("/myjobs") ||
        path.startsWith("/salaries") ||
        path.startsWith("/resume") ||
        path.startsWith("/hire") ||
        path.startsWith("/career-advice") ||
        path.startsWith("/cmp")
      ) {
        return false;
      }

      // 2. Check Job Identifiers in URL
      const jkParam = params.get("jk") || params.get("vjs") || params.get("vjk");
      const isViewJobUrl = /\/(viewjob|rc\/clk|m\/viewjob)\b/i.test(path);

      // 3. Check JSON-LD
      let hasJsonLdJob = false;
      try {
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
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

      // 4. Check Key Indeed DOM Elements
      const titleEl =
        doc.querySelector(".jobsearch-JobInfoHeader-title") ||
        doc.querySelector("h1.jobsearch-JobInfoHeader-title") ||
        doc.querySelector("h1[data-testid='simpler-job-title']");

      const descEl =
        doc.querySelector("#jobDescriptionText") ||
        doc.querySelector(".jobsearch-jobDescriptionText") ||
        doc.querySelector("#jobDetailsSection");

      const hasJobDom = Boolean(titleEl || descEl);

      // If standalone viewjob URL with params or JSON-LD exists
      if (isViewJobUrl && jkParam) return true;
      if (hasJsonLdJob) return true;

      // Search results page with an active selected job in split pane
      if (path.includes("/jobs") && jkParam && hasJobDom) return true;

      // Fallback DOM check for dynamic loading
      if (titleEl && descEl) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  function isJobPostingPage() {
    if (isGmail()) return false;

    const url = window.location.href;
    const host = window.location.hostname.toLowerCase();

    if (host.includes("indeed.")) {
      return isIndeedJobPage();
    }

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
      /lever\.co/.test(host) ||
      /greenhouse\.io/.test(host) ||
      /naukri\.com\/job-listings/.test(url) ||
      /wellfound\.com\/jobs/.test(url);

    if (isJobUrl) return true;

    const titleEl = document.querySelector("h1") || document.querySelector("h2");
    const applyButtons = Array.from(document.querySelectorAll("button, a, input[type='submit']")).filter(el => {
      const text = (el.value || el.textContent || "").trim().toLowerCase();
      return /^(apply|apply now|easy apply|submit application|apply for this job|apply for this position|submit)$/i.test(text);
    });

    if (titleEl && applyButtons.length > 0) return true;

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
    isIndeedJobPage,
    isJobPostingPage,
    detectContext,
  };
})();

