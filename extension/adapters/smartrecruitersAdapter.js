import { BaseAdapter } from "./baseAdapter.js";
import { cleanText } from "../utils/sanitizer.js";

export class SmartRecruitersAdapter extends BaseAdapter {
  constructor() {
    super("smartrecruiters");
  }

  extractJobId(urlStr) {
    try {
      const urlObj = new URL(urlStr || window.location.href);
      const match = urlObj.pathname.match(/\/([0-9a-f-]{10,})/i) || urlObj.pathname.match(/\/([0-9]{8,})/);
      if (match) return match[1];
    } catch (e) {}
    return "";
  }

  extractDomSelectors() {
    const titleEl = document.querySelector("#job-title") || document.querySelector("h1.job-title") || document.querySelector("h1");
    const companyEl = document.querySelector(".company-name") || document.querySelector('[data-qa="company-name"]');
    const locationEl = document.querySelector('[itemprop="jobLocation"]') || document.querySelector(".job-detail .location");
    const descEl = document.querySelector("#job-description") || document.querySelector(".job-sections");

    return {
      title: titleEl ? titleEl.textContent : "",
      company: companyEl ? cleanText(companyEl.textContent) : "",
      location: locationEl ? cleanText(locationEl.textContent) : "",
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
      url: window.location.href,
      description: domData.description,
      applicationMethod: "external",
    });
  }
}
