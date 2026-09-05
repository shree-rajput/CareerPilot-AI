import { BaseAdapter } from "./baseAdapter.js";
import { cleanText } from "../utils/sanitizer.js";

export class WorkdayAdapter extends BaseAdapter {
  constructor() {
    super("workday");
  }

  extractJobId(urlStr) {
    try {
      const urlObj = new URL(urlStr || window.location.href);
      const match = urlObj.pathname.match(/_([A-Za-z0-9_-]+)$/) || urlObj.pathname.match(/\/job\/([A-Za-z0-9_-]+)/);
      if (match) return match[1];
    } catch (e) {}
    return "";
  }

  extractDomSelectors() {
    const titleEl =
      document.querySelector('[data-automation-id="jobPostingHeader"]') ||
      document.querySelector('h1[class*="css-"]') ||
      document.querySelector('h2[data-automation-id="jobPostingTitle"]') ||
      document.querySelector("h1");

    const companyEl =
      document.querySelector('[data-automation-id="company-name"]') ||
      document.querySelector('[data-automation-id="jobPostingCompany"]') ||
      document.querySelector('.css-100wve6');

    const locationEl =
      document.querySelector('[data-automation-id="locations"]') ||
      document.querySelector('[data-automation-id="jobPostingLocation"]');

    const descEl =
      document.querySelector('[data-automation-id="jobPostingDescription"]') ||
      document.querySelector('#jobDescriptionText') ||
      document.querySelector('.css-ey85ip');

    const typeEl = document.querySelector('[data-automation-id="time"]');

    let company = companyEl ? cleanText(companyEl.textContent) : "";
    if (!company) {
      // Fallback: extract company from domain (e.g., nvidia.wd5.myworkdayjobs.com -> Nvidia)
      const host = window.location.hostname;
      const part = host.split(".")[0];
      if (part && part.length > 2) {
        company = part.charAt(0).toUpperCase() + part.slice(1);
      }
    }

    return {
      title: titleEl ? titleEl.textContent : "",
      company,
      location: locationEl ? cleanText(locationEl.textContent) : "",
      description: descEl ? descEl.innerText || descEl.textContent : "",
      employmentType: typeEl ? cleanText(typeEl.textContent) : "",
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
      employmentType: domData.employmentType,
      applicationMethod: "external",
    });
  }
}
