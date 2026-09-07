/**
 * CareerPilot AI Self-Contained Content Script
 * Injected statically via manifest.json or dynamically via chrome.scripting.executeScript.
 * Self-contained classic IIFE script to ensure zero ES module syntax errors.
 */

(function () {
  // Prevent duplicate initialization
  if (window.__CAREERPILOT_EXTRACTOR_INITIALIZED__) {
    return;
  }
  window.__CAREERPILOT_EXTRACTOR_INITIALIZED__ = true;

  let cachedExtractionResult = null;
  let cachedUrl = "";

  // 1. Text & HTML Sanitizers
  function cleanText(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripHtml(htmlStr) {
    if (!htmlStr || typeof htmlStr !== "string") return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlStr;
    return cleanText(tmp.textContent || tmp.innerText || "");
  }

  function sanitizeJobUrl(rawUrl = "") {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    try {
      const url = new URL(rawUrl);
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "refId",
        "trackingId",
        "trk",
        "currentJobId",
        "fbclid",
        "gclid",
      ];
      trackingParams.forEach((p) => url.searchParams.delete(p));
      return url.toString();
    } catch (e) {
      return rawUrl.trim();
    }
  }

  // 2. Base Adapter
  class BaseAdapter {
    constructor(sourceName) {
      this.sourceName = sourceName;
    }

    calculateConfidence(data) {
      let score = 0;
      if (data.title && data.title.length >= 3) score += 35;
      if (data.company && data.company.length >= 2) score += 25;
      if (data.description && data.description.length >= 80) score += 30;
      if (data.location) score += 10;

      if (score >= 80) return "HIGH";
      if (score >= 50) return "MEDIUM";
      return "LOW";
    }

    createNormalizedPayload(data = {}) {
      const rawUrl = data.url || window.location.href;
      const cleanUrl = sanitizeJobUrl(rawUrl);

      const payload = {
        source: this.sourceName,
        externalJobId: data.externalJobId || "",
        title: cleanText(data.title || ""),
        company: cleanText(data.company || ""),
        location: cleanText(data.location || ""),
        url: cleanUrl,
        description: cleanText(data.description || ""),
        employmentType: cleanText(data.employmentType || ""),
        seniority: cleanText(data.seniority || ""),
        salary: cleanText(data.salary || ""),
        workplaceType: cleanText(data.workplaceType || ""),
        postedAt: cleanText(data.postedAt || ""),
        skills: Array.isArray(data.skills) ? data.skills.map(cleanText).filter(Boolean) : [],
        experienceRequirements: cleanText(data.experienceRequirements || ""),
        applicationMethod: cleanText(data.applicationMethod || "external"),
        externalApplyUrl: sanitizeJobUrl(data.externalApplyUrl || cleanUrl),
        extractionConfidence: "LOW",
      };

      payload.extractionConfidence = this.calculateConfidence(payload);
      return payload;
    }

    extract() {
      throw new Error("extract() must be implemented by adapter subclass.");
    }
  }

  // 3. LinkedIn Adapter
  class LinkedInAdapter extends BaseAdapter {
    constructor() {
      super("linkedin");
    }

    extractJobId(urlStr) {
      try {
        const urlObj = new URL(urlStr || window.location.href);
        const match = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
        if (match) return match[1];

        const currentJobId = urlObj.searchParams.get("currentJobId");
        if (currentJobId) return currentJobId;
      } catch (e) {}
      return "";
    }

    extractJsonLd() {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          if (!script.textContent) continue;
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
          for (const item of items) {
            if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
              return {
                title: item.title,
                company: item.hiringOrganization?.name,
                location: item.jobLocation?.address?.addressLocality || item.jobLocation?.address?.addressRegion,
                description: stripHtml(item.description || ""),
                employmentType: item.employmentType,
                postedAt: item.datePosted,
                externalJobId: item.identifier?.value || "",
                salary: item.baseSalary?.value ? `${item.baseSalary.value.value} ${item.baseSalary.currency || ""}` : "",
              };
            }
          }
        }
      } catch (e) {}
      return null;
    }

    extractDomSelectors() {
      const titleEl =
        document.querySelector(".job-details-jobs-unified-top-card__job-title") ||
        document.querySelector(".jobs-unified-top-card__job-title") ||
        document.querySelector("h1.t-24") ||
        document.querySelector(".jobs-details-top-card__job-title");

      const companyEl =
        document.querySelector(".job-details-jobs-unified-top-card__company-name") ||
        document.querySelector(".jobs-unified-top-card__company-name") ||
        document.querySelector(".jobs-details-top-card__company-url") ||
        document.querySelector(".jobs-unified-top-card__primary-description a");

      const locationBullets = document.querySelectorAll(
        ".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet"
      );

      const descEl =
        document.querySelector("#job-details") ||
        document.querySelector(".jobs-description__content") ||
        document.querySelector(".jobs-box__html-content");

      const easyApplyBtn = document.querySelector(".jobs-apply-button");
      const isEasyApply = easyApplyBtn && easyApplyBtn.textContent.includes("Easy Apply");

      let location = "";
      let workplaceType = "";
      if (locationBullets && locationBullets.length > 0) {
        const locText = cleanText(locationBullets[0].textContent);
        location = locText;
        if (/remote/i.test(locText)) workplaceType = "Remote";
        else if (/hybrid/i.test(locText)) workplaceType = "Hybrid";
        else if (/on-site|onsite/i.test(locText)) workplaceType = "Onsite";
      }

      return {
        title: titleEl ? titleEl.textContent : "",
        company: companyEl ? companyEl.textContent : "",
        location,
        workplaceType,
        description: descEl ? descEl.innerText || descEl.textContent : "",
        applicationMethod: isEasyApply ? "linkedin_easy_apply" : "external",
      };
    }

    extract() {
      const jsonLdData = this.extractJsonLd();
      const domData = this.extractDomSelectors();
      const externalJobId = this.extractJobId() || jsonLdData?.externalJobId || "";

      const combined = {
        externalJobId,
        title: domData.title || jsonLdData?.title || "",
        company: domData.company || jsonLdData?.company || "",
        location: domData.location || jsonLdData?.location || "",
        url: window.location.href,
        description: domData.description || jsonLdData?.description || "",
        employmentType: jsonLdData?.employmentType || "",
        workplaceType: domData.workplaceType || "",
        salary: jsonLdData?.salary || "",
        postedAt: jsonLdData?.postedAt || "",
        applicationMethod: domData.applicationMethod || "external",
      };

      return this.createNormalizedPayload(combined);
    }
  }

  // 4. Indeed Adapter
  class IndeedAdapter extends BaseAdapter {
    constructor() {
      super("indeed");
    }

    extractJobId(urlStr) {
      try {
        const urlObj = new URL(urlStr || window.location.href);
        const jk = urlObj.searchParams.get("jk") || urlObj.searchParams.get("vjs");
        if (jk) return jk;
        const match = urlObj.pathname.match(/\/viewjob.*[?&]jk=([a-f0-9]+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }

    extractJsonLd() {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          if (!script.textContent) continue;
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
          for (const item of items) {
            if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
              return {
                title: item.title,
                company: item.hiringOrganization?.name,
                location: item.jobLocation?.address?.addressLocality || item.jobLocation?.address?.addressRegion,
                description: stripHtml(item.description || ""),
                employmentType: item.employmentType,
                postedAt: item.datePosted,
                externalJobId: item.identifier?.value || "",
                salary: item.baseSalary?.value ? `${item.baseSalary.value.value} ${item.baseSalary.currency || ""}` : "",
              };
            }
          }
        }
      } catch (e) {}
      return null;
    }

    extractDomSelectors() {
      const titleEl =
        document.querySelector(".jobsearch-JobInfoHeader-title") ||
        document.querySelector("h1.jobsearch-JobInfoHeader-title") ||
        document.querySelector("h1[data-testid='simpler-job-title']");

      const companyEl =
        document.querySelector('[data-company-name="true"]') ||
        document.querySelector('[data-testid="inlineHeader-companyName"]') ||
        document.querySelector(".jobsearch-InlineCompanyRating div") ||
        document.querySelector(".jobsearch-CompanyReview--heading");

      const locationEl =
        document.querySelector('[data-testid="inlineHeader-companyLocation"]') ||
        document.querySelector(".jobsearch-JobInfoHeader-subtitle div:last-child") ||
        document.querySelector(".companyLocation");

      const descEl =
        document.querySelector("#jobDescriptionText") ||
        document.querySelector(".jobsearch-jobDescriptionText") ||
        document.querySelector("#jobDetailsSection");

      const salaryEl =
        document.querySelector("#salaryInfoAndJobType") ||
        document.querySelector('[data-testid="jobsearch-OtherJobDetailsContainer"]');

      let location = locationEl ? cleanText(locationEl.textContent) : "";
      let workplaceType = "";
      if (/remote/i.test(location)) workplaceType = "Remote";
      else if (/hybrid/i.test(location)) workplaceType = "Hybrid";
      else if (location) workplaceType = "Onsite";

      return {
        title: titleEl ? titleEl.textContent : "",
        company: companyEl ? companyEl.textContent : "",
        location,
        workplaceType,
        salary: salaryEl ? cleanText(salaryEl.textContent) : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
      };
    }

    extract() {
      const jsonLdData = this.extractJsonLd();
      const domData = this.extractDomSelectors();
      const externalJobId = this.extractJobId() || jsonLdData?.externalJobId || "";

      const combined = {
        externalJobId,
        title: domData.title || jsonLdData?.title || "",
        company: domData.company || jsonLdData?.company || "",
        location: domData.location || jsonLdData?.location || "",
        url: window.location.href,
        description: domData.description || jsonLdData?.description || "",
        employmentType: jsonLdData?.employmentType || "",
        workplaceType: domData.workplaceType || "",
        salary: domData.salary || jsonLdData?.salary || "",
        postedAt: jsonLdData?.postedAt || "",
        applicationMethod: "external",
      };

      return this.createNormalizedPayload(combined);
    }
  }

  // 5. Specialized ATS Adapters (Greenhouse, Lever, Workday, Ashby, SmartRecruiters)
  class GreenhouseAdapter extends BaseAdapter {
    constructor() {
      super("greenhouse");
    }
    extract() {
      const titleEl = document.querySelector(".app-title") || document.querySelector("h1");
      const companyEl = document.querySelector(".company-name") || document.querySelector(".heading");
      const locationEl = document.querySelector(".location");
      const descEl = document.querySelector("#content") || document.querySelector(".content");

      return this.createNormalizedPayload({
        title: titleEl ? titleEl.textContent : "",
        company: companyEl ? companyEl.textContent.replace(/at\s+/i, "") : "",
        location: locationEl ? locationEl.textContent : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
      });
    }
  }

  class LeverAdapter extends BaseAdapter {
    constructor() {
      super("lever");
    }
    extract() {
      const titleEl = document.querySelector(".posting-headline h2") || document.querySelector("h2");
      const companyEl = document.querySelector(".main-header-logo img")?.getAttribute("alt") || "";
      const locationEl = document.querySelector(".posting-categories .location") || document.querySelector(".location");
      const descEl = document.querySelector(".section.page-centered") || document.querySelector(".posting-page");

      return this.createNormalizedPayload({
        title: titleEl ? titleEl.textContent : "",
        company: companyEl,
        location: locationEl ? locationEl.textContent : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
      });
    }
  }

  class WorkdayAdapter extends BaseAdapter {
    constructor() {
      super("workday");
    }
    extractJobId() {
      try {
        const match = window.location.pathname.match(/_([A-Za-z0-9_-]+)$/) || window.location.pathname.match(/\/job\/([A-Za-z0-9_-]+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }
    extract() {
      const titleEl = document.querySelector('[data-automation-id="jobPostingHeader"]') || document.querySelector("h1");
      const companyEl = document.querySelector('[data-automation-id="company-name"]') || document.querySelector('[data-automation-id="jobPostingCompany"]');
      const locationEl = document.querySelector('[data-automation-id="locations"]');
      const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]') || document.querySelector("#jobDescriptionText");

      let company = companyEl ? cleanText(companyEl.textContent) : "";
      if (!company) {
        const part = window.location.hostname.split(".")[0];
        if (part && part.length > 2) company = part.charAt(0).toUpperCase() + part.slice(1);
      }

      return this.createNormalizedPayload({
        externalJobId: this.extractJobId(),
        title: titleEl ? titleEl.textContent : "",
        company,
        location: locationEl ? cleanText(locationEl.textContent) : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
        applicationMethod: "external",
      });
    }
  }

  class AshbyAdapter extends BaseAdapter {
    constructor() {
      super("ashby");
    }
    extractJobId() {
      try {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length > 0 && /[0-9a-f-]{10,}/i.test(parts[parts.length - 1])) return parts[parts.length - 1];
      } catch (e) {}
      return "";
    }
    extract() {
      const titleEl = document.querySelector("h1") || document.querySelector(".ashby-job-posting-heading");
      const companyEl = document.querySelector('[class*="CompanyHeader"]') || document.querySelector(".ashby-job-posting-company-name");
      const descEl = document.querySelector(".ashby-job-posting-description") || document.querySelector("[class*='JobPostingDescription']");

      let company = companyEl ? cleanText(companyEl.textContent) : "";
      if (!company) {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length >= 1 && parts[0] !== "jobs") company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }

      return this.createNormalizedPayload({
        externalJobId: this.extractJobId(),
        title: titleEl ? titleEl.textContent : "",
        company,
        description: descEl ? descEl.innerText || descEl.textContent : "",
        applicationMethod: "external",
      });
    }
  }

  class SmartRecruitersAdapter extends BaseAdapter {
    constructor() {
      super("smartrecruiters");
    }
    extractJobId() {
      try {
        const match = window.location.pathname.match(/\/([0-9a-f-]{10,})/i) || window.location.pathname.match(/\/([0-9]{8,})/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }
    extract() {
      const titleEl = document.querySelector("#job-title") || document.querySelector("h1");
      const companyEl = document.querySelector(".company-name") || document.querySelector('[data-qa="company-name"]');
      const locationEl = document.querySelector('[itemprop="jobLocation"]') || document.querySelector(".job-detail .location");
      const descEl = document.querySelector("#job-description") || document.querySelector(".job-sections");

      return this.createNormalizedPayload({
        externalJobId: this.extractJobId(),
        title: titleEl ? titleEl.textContent : "",
        company: companyEl ? cleanText(companyEl.textContent) : "",
        location: locationEl ? cleanText(locationEl.textContent) : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
        applicationMethod: "external",
      });
    }
  }

  // 6. Resilient Generic Adapter
  class GenericAdapter extends BaseAdapter {
    constructor() {
      super("generic");
    }

    extractJsonLd() {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          if (!script.textContent) continue;
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
          for (const item of items) {
            if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
              return {
                title: item.title,
                company: item.hiringOrganization?.name || item.hiringOrganization,
                location:
                  item.jobLocation?.address?.addressLocality ||
                  item.jobLocation?.address?.addressRegion ||
                  item.jobLocation?.name,
                description: stripHtml(item.description || ""),
                employmentType: item.employmentType,
                postedAt: item.datePosted,
                externalJobId: item.identifier?.value || "",
                salary: item.baseSalary?.value ? `${item.baseSalary.value.value} ${item.baseSalary.currency || ""}` : "",
                externalApplyUrl: item.directApplyUrl || item.url || "",
              };
            }
          }
        }
      } catch (e) {}
      return null;
    }

    extractOpenGraph() {
      const getMeta = (prop) =>
        document.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ||
        document.querySelector(`meta[name="${prop}"]`)?.getAttribute("content") ||
        "";

      const ogTitle = getMeta("og:title") || getMeta("twitter:title") || document.title;
      const ogDesc = getMeta("og:description") || getMeta("description");
      const ogSiteName = getMeta("og:site_name");

      let title = ogTitle;
      let company = ogSiteName;

      if (ogTitle && ogTitle.includes(" at ")) {
        const parts = ogTitle.split(" at ");
        title = parts[0];
        company = parts[1]?.split("|")[0]?.split("-")[0]?.trim() || company;
      } else if (ogTitle && (ogTitle.includes(" - ") || ogTitle.includes(" | "))) {
        const parts = ogTitle.split(/ - | \| /);
        title = parts[0];
        company = parts[1]?.trim() || company;
      }

      return { title, company, description: ogDesc };
    }

    extractDomSelectors() {
      const titleEl =
        document.querySelector('[itemprop="title"]') ||
        document.querySelector('[data-qa="job-title"]') ||
        document.querySelector(".job-title") ||
        document.querySelector(".posting-headline h2") ||
        document.querySelector("h1");

      const companyEl =
        document.querySelector('[itemprop="hiringOrganization"]') ||
        document.querySelector('[data-qa="company-name"]') ||
        document.querySelector(".company-name") ||
        document.querySelector(".org") ||
        document.querySelector(".company");

      const locationEl =
        document.querySelector('[itemprop="jobLocation"]') ||
        document.querySelector(".location") ||
        document.querySelector(".job-location") ||
        document.querySelector(".posting-category");

      const descEl =
        document.querySelector('[itemprop="description"]') ||
        document.querySelector("#job-description") ||
        document.querySelector(".job-description") ||
        document.querySelector(".posting-description") ||
        document.querySelector("article");

      return {
        title: titleEl ? titleEl.textContent : "",
        company: companyEl ? companyEl.textContent : "",
        location: locationEl ? cleanText(locationEl.textContent) : "",
        description: descEl ? descEl.innerText || descEl.textContent : "",
      };
    }

    extract() {
      const jsonLdData = this.extractJsonLd();
      const ogData = this.extractOpenGraph();
      const domData = this.extractDomSelectors();
      const host = window.location.hostname.replace(/^www\./, "");

      const combined = {
        externalJobId: jsonLdData?.externalJobId || "",
        title: domData.title || jsonLdData?.title || ogData?.title || "",
        company: domData.company || jsonLdData?.company || ogData?.company || host,
        location: domData.location || jsonLdData?.location || "",
        url: window.location.href,
        description: domData.description || jsonLdData?.description || ogData?.description || "",
        employmentType: jsonLdData?.employmentType || "",
        workplaceType: "",
        salary: jsonLdData?.salary || "",
        postedAt: jsonLdData?.postedAt || "",
        applicationMethod: "external",
        externalApplyUrl: jsonLdData?.externalApplyUrl || window.location.href,
      };

      return this.createNormalizedPayload(combined);
    }
  }

  // 7. Generic Job Context Detection Engine (Evidence Collector)
  function collectPageEvidence(doc = window.document, url = window.location.href) {
    if (window.__CAREERPILOT_CONTEXT_DETECTOR__?.isGmail() || window.location.hostname.includes("mail.google.com")) {
      return {
        isJobPage: false,
        isJobContext: false,
        confidence: "LOW",
        score: 0,
        contextType: "APPLICATION_EMAIL",
        detectedPlatform: "gmail",
        reason: "Gmail tab active - Email detection pipeline active",
        evidence: [],
      };
    }

    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    let score = 0;
    const evidence = [];
    const reasons = [];

    // --- 1. NEGATIVE & CONTRADICTORY SIGNALS (Subtractive) ---
    if (doc.querySelector('textarea[placeholder*="message" i]') || doc.querySelector('textarea[placeholder*="chat" i]')) {
      score -= 30;
      reasons.push("Presence of conversational chat interface");
    }

    if (doc.querySelector("article") && doc.querySelector('meta[property="article:published_time"]')) {
      score -= 40;
      reasons.push("Page structure matches a published article/blog");
    }

    if (doc.querySelectorAll(".search-result, .g, .yuRUbf").length > 5) {
      score -= 40;
      reasons.push("Layout resembles a generic search engine result page");
    }

    if (doc.querySelector(".question-page") || doc.querySelector(".answercell")) {
      score -= 50;
      reasons.push("Forum / Q&A layout detected");
    }

    // --- 2. POSITIVE SIGNALS (Additive) ---
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

    const applyButtons = Array.from(doc.querySelectorAll("button, a, input[type='submit']")).filter(el => {
      const text = (el.value || el.textContent || "").trim().toLowerCase();
      return /^(apply|apply now|easy apply|submit application|apply for this job|apply for this position|submit)$/i.test(text);
    });

    if (applyButtons.length > 0) {
      score += 20;
      evidence.push("Prominent Application button found");
    }

    if (/\/jobs?\//.test(path) || /\/careers?\//.test(path) || /\/vacanc(y|ies)\//.test(path) || /\/requisition\//.test(path) || /jk=|gh_jid=/.test(url)) {
      score += 15;
      evidence.push("URL structure contains career/job posting identifiers");
    }

    const headers = Array.from(doc.querySelectorAll("h1, h2, h3, h4, strong, b")).map(el => (el.textContent || "").toLowerCase());
    const hasReqs = headers.some(t => t.includes("requirements") || t.includes("qualifications") || t.includes("what you'll do") || t.includes("responsibilities"));
    if (hasReqs) {
      score += 15;
      evidence.push("Job requirements/responsibilities section detected");
    }

    if (doc.body && doc.body.textContent && /(\$|€|£)\s*\d{2,3},?\d{3}\s*(-\s*(\$|€|£)?\s*\d{2,3},?\d{3})?/.test(doc.body.textContent)) {
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
    else platform = "generic";

    let contextType = "UNKNOWN";
    if (score >= 40) {
      contextType = "JOB_POSTING";
      if (path === "/careers" || path === "/jobs" || path === "/careers/") {
        if (!hasJsonLd && applyButtons.length === 0) {
          contextType = "CAREER_PAGE";
          score -= 20;
          reasons.push("Appears to be a general career landing page, not a specific job");
        }
      }
    } else {
      contextType = "NON_JOB_PAGE";
      reasons.push("Insufficient job evidence");
    }

    let confidence = "LOW";
    if (score >= 70) confidence = "HIGH";
    else if (score >= 40) confidence = "MEDIUM";

    // Never strictly reject, let the user override
    return {
      isJobContext: true, // Always allow context to pass to extension
      isJobPage: true, // Always allow UI to render (will show "Review & Capture" if low score)
      confidence,
      score: Math.max(0, Math.min(100, score)),
      contextType,
      detectedPlatform: platform,
      evidence,
      reason: reasons.length > 0 ? reasons.join(", ") : "Detected partial or sufficient job evidence."
    };
  }

  function getAdapter(platform) {
    switch (platform) {
      case "linkedin":
        return new LinkedInAdapter();
      case "indeed":
        return new IndeedAdapter();
      case "greenhouse":
        return new GreenhouseAdapter();
      case "lever":
        return new LeverAdapter();
      case "workday":
        return new WorkdayAdapter();
      case "ashby":
        return new AshbyAdapter();
      case "smartrecruiters":
        return new SmartRecruitersAdapter();
      default:
        return new GenericAdapter();
    }
  }

  // 7.5 Self-Verification Pipeline
  function runSelfVerificationPipeline(evidence, initialJobData) {
    let recoveredData = { ...initialJobData };
    let verificationScore = evidence.score || 0;
    let verificationSignals = [];

    // 1. Visible Content Analysis
    const textContext = document.body.innerText || "";
    
    const jobKeywords = ["responsibilities", "qualifications", "requirements", "what you'll do", "about the role", "who you are", "years of experience"];
    let matchedKeywords = 0;
    for (const kw of jobKeywords) {
      if (textContext.toLowerCase().includes(kw)) {
        matchedKeywords++;
      }
    }
    
    if (matchedKeywords >= 2) {
      verificationScore += 30;
      verificationSignals.push("Found multiple job description keywords");
    }

    // 2. Aggressive Title/Company Recovery
    if (!recoveredData.title) {
      const h1s = Array.from(document.querySelectorAll("h1"));
      if (h1s.length > 0) {
        recoveredData.title = cleanText(h1s[0].textContent);
        verificationSignals.push("Recovered title from primary H1");
      }
    }

    if (!recoveredData.company) {
       const metaName = document.querySelector('meta[property="og:site_name"]');
       if (metaName) {
         recoveredData.company = cleanText(metaName.getAttribute("content"));
         verificationSignals.push("Recovered company from OpenGraph");
       } else {
         const domainParts = window.location.hostname.split(".");
         if (domainParts.length >= 2) {
           let name = domainParts[domainParts.length - 2];
           if (name.length > 2) {
             recoveredData.company = name.charAt(0).toUpperCase() + name.slice(1);
             verificationSignals.push("Recovered company from URL domain");
           }
         }
       }
    }

    // 3. Apply Button Deep Search
    const applyButtons = Array.from(document.querySelectorAll("button, a, div[role='button']")).filter(el => {
      const text = (el.value || el.textContent || "").trim().toLowerCase();
      return /^(apply|apply now|easy apply|submit application|apply for this job|submit)$/i.test(text);
    });
    
    if (applyButtons.length > 0) {
      verificationScore += 25;
      verificationSignals.push("Found hidden or deep Apply button");
    }

    // Recalculate Final Confidence
    if (recoveredData.title && recoveredData.title.length >= 3) verificationScore += 30;
    if (recoveredData.company && recoveredData.company.length >= 2) verificationScore += 30;
    
    let recoveredConfidence = "LOW";
    if (verificationScore >= 80) recoveredConfidence = "HIGH";
    else if (verificationScore >= 40) recoveredConfidence = "MEDIUM";

    return {
      recoveredData,
      recoveredConfidence,
      verificationSignals
    };
  }

  function extractCurrentJob() {
    if (cachedExtractionResult && cachedUrl === window.location.href) {
      return cachedExtractionResult;
    }

    const evidence = collectPageEvidence();

    const platformAdapter = getAdapter(evidence.detectedPlatform);
    let jobData = platformAdapter.extract();

    // Fallback: If platform adapter returned low confidence, try GenericAdapter
    if (jobData.extractionConfidence === "LOW" && evidence.detectedPlatform !== "generic") {
      const genericAdapter = new GenericAdapter();
      const genericData = genericAdapter.extract();
      if (genericData.extractionConfidence !== "LOW" || (genericData.description && genericData.description.length > jobData.description.length)) {
        jobData = genericData;
      }
    }
    
    // Merge detection engine's output with jobData for backend validation
    jobData.detectionConfidence = evidence.confidence;
    jobData.contextType = evidence.contextType;
    jobData.detectionScore = evidence.score;

    // Minimum Capture Contract: Must have Company and Role
    const hasMinimumIdentity = !!(jobData.company && jobData.title);

    // Dynamic Confidence
    let finalScore = evidence.score; // Base score from page structure
    if (jobData.title && jobData.title.length >= 3) finalScore += 30;
    if (jobData.company && jobData.company.length >= 2) finalScore += 30;
    if (jobData.description && jobData.description.length >= 80) finalScore += 20;
    if (jobData.externalJobId) finalScore += 15;
    if (jobData.salary) finalScore += 10;
    if (jobData.location) finalScore += 10;
    if (jobData.employmentType) finalScore += 5;
    
    let finalConfidence = "LOW";
    if (finalScore >= 80) finalConfidence = "HIGH";
    else if (finalScore >= 40) finalConfidence = "MEDIUM";

    if (hasMinimumIdentity && (finalConfidence === "HIGH" || finalConfidence === "MEDIUM" || evidence.isJobPage)) {
        cachedUrl = window.location.href;
        cachedExtractionResult = {
          isJobPage: true,
          status: "JOB_DETECTED",
          data: jobData,
          detection: evidence,
          diagnostics: {
            stage: "extractionCompleted",
            detectedPlatform: evidence.detectedPlatform,
            confidence: finalConfidence,
            source: jobData.source,
          },
        };
    } else {
        // Trigger Self-Verification Pipeline
        const recoveryResult = runSelfVerificationPipeline(evidence, jobData);
        
        // Even if recovery is partial, we DO NOT reject. We allow "Review & Capture".
        cachedUrl = window.location.href;
        cachedExtractionResult = {
          isJobPage: true,
          status: "PARTIAL_EVIDENCE",
          data: recoveryResult.recoveredData,
          detection: evidence,
          reason: evidence.reason || "Some job details are missing. Please review and capture.",
          diagnostics: {
            stage: "recoveryCompleted",
            detectedPlatform: evidence.detectedPlatform,
            confidence: recoveryResult.recoveredConfidence,
            signals: recoveryResult.verificationSignals
          }
        };
    }

    return cachedExtractionResult;
  }

  // 8. SPA Navigation & URL Change Observer
  function observeSpaNavigation() {
    const observer = new MutationObserver(() => {
      if (window.location.href !== cachedUrl) {
        cachedExtractionResult = null;
        cachedUrl = window.location.href;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("popstate", () => {
      cachedExtractionResult = null;
      cachedUrl = window.location.href;
    });
  }

  observeSpaNavigation();

  // 10. Gmail Email Observer Pipeline
  let lastProcessedGmailMsgId = "";
  let gmailDebounceTimer = null;

  function checkAndProcessGmailEmail() {
    if (!window.__CAREERPILOT_GMAIL_EXTRACTOR__?.isGmail()) return;

    const emailPayload = window.__CAREERPILOT_GMAIL_EXTRACTOR__.extractOpenedGmailMessage();
    if (!emailPayload || !emailPayload.messageId || emailPayload.messageId === lastProcessedGmailMsgId) {
      return;
    }

    lastProcessedGmailMsgId = emailPayload.messageId;

    chrome.runtime.sendMessage({ type: "PROCESS_EMAIL_EVENT", payload: emailPayload }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn("CareerPilot Gmail message error:", chrome.runtime.lastError.message);
        return;
      }
      if (res?.success && res.data && window.__CAREERPILOT_GMAIL_OVERLAY__) {
        window.__CAREERPILOT_GMAIL_OVERLAY__.renderGmailOverlay({
          response: res.data,
          onConfirm: (resp) => {},
          onUndo: (resp) => {},
          onIgnore: () => {},
        });
      }
    });
  }

  function observeGmailChanges() {
    if (!window.location.hostname.includes("mail.google.com")) return;

    const observer = new MutationObserver(() => {
      if (gmailDebounceTimer) clearTimeout(gmailDebounceTimer);
      gmailDebounceTimer = setTimeout(() => {
        checkAndProcessGmailEmail();
      }, 1000);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(checkAndProcessGmailEmail, 1500);
  }

  observeGmailChanges();

  // 9. Message Listener with Context Awareness
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const isGmail = window.__CAREERPILOT_CONTEXT_DETECTOR__?.isGmail() || window.location.hostname.includes("mail.google.com");

    if (request.type === "GET_PAGE_CONTEXT") {
      const isJobPosting = window.__CAREERPILOT_CONTEXT_DETECTOR__?.isJobPostingPage ? window.__CAREERPILOT_CONTEXT_DETECTOR__.isJobPostingPage() : false;
      const context = isGmail ? "GMAIL_EMAIL" : isJobPosting ? "JOB_POSTING" : "OTHER";
      sendResponse({ context });
    } else if (request.type === "GET_JOB_DATA") {
      if (isGmail) {
        const emailData = window.__CAREERPILOT_GMAIL_EXTRACTOR__?.extractOpenedGmailMessage();
        sendResponse({
          context: "GMAIL_EMAIL",
          isJobPage: false,
          isGmail: true,
          emailData,
          status: emailData ? "GMAIL_EMAIL_DETECTED" : "GMAIL_NO_EMAIL_OPENED",
          reason: emailData ? "Opened Gmail email detected." : "Gmail tab active but no opened email found.",
        });
      } else {
        const result = extractCurrentJob();
        sendResponse({ context: "JOB_POSTING", ...result });
      }
    } else if (request.type === "GET_GMAIL_EVENT") {
      const result = window.__CAREERPILOT_GMAIL_EXTRACTOR__?.extractOpenedGmailMessage();
      sendResponse(result);
    } else if (request.type === "PING") {
      sendResponse({ status: "PONG", ok: true });
    }
    return true;
  });
})();
