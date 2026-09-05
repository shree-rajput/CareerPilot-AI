import { BaseAdapter } from "./baseAdapter.js";
import { cleanText } from "../utils/sanitizer.js";

export class AshbyAdapter extends BaseAdapter {
  constructor() {
    super("ashby");
  }

  extractJobId(urlStr) {
    try {
      const urlObj = new URL(urlStr || window.location.href);
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (/[0-9a-f-]{10,}/i.test(lastPart)) return lastPart;
      }
    } catch (e) {}
    return "";
  }

  extractDomSelectors() {
    const titleEl = document.querySelector("h1") || document.querySelector(".ashby-job-posting-heading");
    const companyEl =
      document.querySelector('[class*="CompanyHeader"]') ||
      document.querySelector("a[href*='ashbyhq.com']") ||
      document.querySelector(".ashby-job-posting-company-name");

    const metaList = document.querySelectorAll(".ashby-job-posting-brief-list-item, [class*='JobPostingMeta']");
    let location = "";
    let employmentType = "";
    let workplaceType = "";

    metaList.forEach((el) => {
      const text = cleanText(el.textContent);
      if (/remote|hybrid|onsite/i.test(text)) {
        if (/remote/i.test(text)) workplaceType = "Remote";
        else if (/hybrid/i.test(text)) workplaceType = "Hybrid";
        else workplaceType = "Onsite";
      }
      if (/full-time|part-time|contract|internship/i.test(text)) {
        employmentType = text;
      } else if (!location && text.length < 50) {
        location = text;
      }
    });

    const descEl = document.querySelector(".ashby-job-posting-description") || document.querySelector("[class*='JobPostingDescription']");

    let company = companyEl ? cleanText(companyEl.textContent) : "";
    if (!company) {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 1 && pathParts[0] !== "jobs") {
        company = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
      }
    }

    return {
      title: titleEl ? titleEl.textContent : "",
      company,
      location,
      workplaceType,
      employmentType,
      description: descEl ? descEl.innerText || descEl.textContent : "",
    };
  }

  extract() {
    const domData = this.extractDomSelectors();
    const externalJobId = this.extractJobId();

    return this.createNormalizedPayload({
      externalJobId,
      title: domData.title,
      company: domData.company,
      location: domData.location,
      workplaceType: domData.workplaceType,
      employmentType: domData.employmentType,
      url: window.location.href,
      description: domData.description,
      applicationMethod: "external",
    });
  }
}
