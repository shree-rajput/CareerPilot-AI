import { BaseAdapter } from "./baseAdapter.js";
import { cleanText, stripHtml } from "../utils/sanitizer.js";

export class LinkedInAdapter extends BaseAdapter {
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
    } catch (e) {
      // ignore
    }
    return "";
  }

  // Layer 1: JSON-LD
  extractJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        const data = JSON.parse(script.textContent);
        if (data && (data["@type"] === "JobPosting" || data.type === "JobPosting")) {
          return {
            title: data.title,
            company: data.hiringOrganization?.name,
            location: data.jobLocation?.address?.addressLocality || data.jobLocation?.address?.addressRegion,
            description: stripHtml(data.description || ""),
            employmentType: data.employmentType,
            postedAt: data.datePosted,
            externalJobId: data.identifier?.value || "",
            salary: data.baseSalary?.value ? `${data.baseSalary.value.value} ${data.baseSalary.currency || ""}` : "",
          };
        }
      }
    } catch (e) {
      // ignore JSON-LD parse errors
    }
    return null;
  }

  // Layer 2: OpenGraph
  extractOpenGraph() {
    const getMeta = (prop) =>
      document.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ||
      document.querySelector(`meta[name="${prop}"]`)?.getAttribute("content") ||
      "";

    const ogTitle = getMeta("og:title");
    const ogDesc = getMeta("og:description");
    if (ogTitle) {
      // LinkedIn og:title often looks like "Company hiring Job Title in Location | LinkedIn"
      const parts = ogTitle.split(/ hiring | in | \| /i);
      return {
        title: parts.length >= 2 ? parts[1] : ogTitle,
        company: parts.length >= 1 ? parts[0] : "",
        description: ogDesc,
      };
    }
    return null;
  }

  // Layer 3: Stable DOM Selectors
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
    const ogData = this.extractOpenGraph();
    const domData = this.extractDomSelectors();

    const externalJobId = this.extractJobId() || jsonLdData?.externalJobId || "";

    const combined = {
      externalJobId,
      title: domData.title || jsonLdData?.title || ogData?.title || "",
      company: domData.company || jsonLdData?.company || ogData?.company || "",
      location: domData.location || jsonLdData?.location || "",
      url: window.location.href,
      description: domData.description || jsonLdData?.description || ogData?.description || "",
      employmentType: jsonLdData?.employmentType || "",
      workplaceType: domData.workplaceType || "",
      salary: jsonLdData?.salary || "",
      postedAt: jsonLdData?.postedAt || "",
      applicationMethod: domData.applicationMethod || "external",
    };

    return this.createNormalizedPayload(combined);
  }
}
