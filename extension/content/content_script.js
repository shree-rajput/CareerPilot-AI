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

  // 5. Greenhouse & Lever Adapters
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

  // 7. Job Page Detection Engine
  function detectJobPage() {
    const url = window.location.href;
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();

    let confidence = 0;
    const reasons = [];

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
    } catch (e) {}

    if (jsonLdJob) {
      confidence += 50;
      reasons.push("JSON-LD JobPosting schema found");
    }

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

    const titleEl =
      document.querySelector(".job-details-jobs-unified-top-card__job-title") ||
      document.querySelector(".jobs-unified-top-card__job-title") ||
      document.querySelector(".jobsearch-JobInfoHeader-title") ||
      document.querySelector('[itemprop="title"]') ||
      document.querySelector('[data-qa="job-title"]') ||
      document.querySelector(".job-title") ||
      document.querySelector("h1");

    const titleText = titleEl ? cleanText(titleEl.textContent) : "";
    if (titleText && titleText.length >= 3 && titleText.length <= 140) {
      confidence += 15;
      reasons.push("Job title element detected");
    }

    const descEl =
      document.querySelector("#job-details") ||
      document.querySelector(".jobs-description__content") ||
      document.querySelector("#jobDescriptionText") ||
      document.querySelector('[itemprop="description"]') ||
      document.querySelector("#job-description") ||
      document.querySelector(".job-description") ||
      document.querySelector("article");

    const descText = descEl ? cleanText(descEl.textContent) : "";
    if (descText && descText.length >= 60) {
      confidence += 15;
      reasons.push("Job description content block detected");
    }

    let detectedPlatform = "generic";
    if (host.includes("linkedin.com")) detectedPlatform = "linkedin";
    else if (host.includes("indeed.com")) detectedPlatform = "indeed";
    else if (host.includes("greenhouse.io")) detectedPlatform = "greenhouse";
    else if (host.includes("lever.co")) detectedPlatform = "lever";

    const isJobPage = confidence >= 30 && Boolean(titleText) && Boolean(descText);

    return {
      isJobPage,
      confidence: Math.min(100, confidence),
      reason: reasons.join(", ") || "Insufficient job posting indicators on page",
      detectedPlatform,
      extractedTitle: titleText,
      hasDescription: Boolean(descText),
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
      default:
        return new GenericAdapter();
    }
  }

  function extractCurrentJob() {
    if (cachedExtractionResult && cachedUrl === window.location.href) {
      return cachedExtractionResult;
    }

    const detection = detectJobPage();

    if (!detection.isJobPage) {
      const genericAdapter = new GenericAdapter();
      const fallbackPayload = genericAdapter.extract();

      if (fallbackPayload.title && fallbackPayload.description && fallbackPayload.description.length >= 50) {
        cachedUrl = window.location.href;
        cachedExtractionResult = {
          isJobPage: true,
          status: "JOB_DETECTED",
          data: fallbackPayload,
          detection: { ...detection, isJobPage: true, detectedPlatform: "generic" },
          diagnostics: {
            stage: "extractionCompleted",
            strategy: "generic_fallback",
            confidence: fallbackPayload.extractionConfidence,
          },
        };
        return cachedExtractionResult;
      }

      return {
        isJobPage: false,
        status: "JOB_NOT_DETECTED",
        reason: detection.reason,
        detection,
        diagnostics: {
          stage: "detectionFailed",
          hostname: window.location.hostname,
        },
      };
    }

    const platformAdapter = getAdapter(detection.detectedPlatform);
    let jobData = platformAdapter.extract();

    // Fallback: If platform adapter returned low confidence, try GenericAdapter
    if (jobData.extractionConfidence === "LOW" && detection.detectedPlatform !== "generic") {
      const genericAdapter = new GenericAdapter();
      const genericData = genericAdapter.extract();
      if (genericData.extractionConfidence !== "LOW" || (genericData.description && genericData.description.length > jobData.description.length)) {
        jobData = genericData;
      }
    }

    cachedUrl = window.location.href;
    cachedExtractionResult = {
      isJobPage: true,
      status: "JOB_DETECTED",
      data: jobData,
      detection,
      diagnostics: {
        stage: "extractionCompleted",
        detectedPlatform: detection.detectedPlatform,
        confidence: jobData.extractionConfidence,
        source: jobData.source,
      },
    };

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

  // 9. Message Listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_JOB_DATA") {
      const result = extractCurrentJob();
      sendResponse(result);
    } else if (request.type === "PING") {
      sendResponse({ status: "PONG", ok: true });
    }
    return true;
  });
})();
