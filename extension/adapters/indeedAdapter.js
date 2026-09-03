import { BaseAdapter } from "./baseAdapter.js";
import { cleanText, stripHtml } from "../utils/sanitizer.js";

export class IndeedAdapter extends BaseAdapter {
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
      // ignore
    }
    return null;
  }

  // Layer 2: DOM Selectors
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
