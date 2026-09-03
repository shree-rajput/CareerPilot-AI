import { BaseAdapter } from "./baseAdapter.js";
import { cleanText, stripHtml } from "../utils/sanitizer.js";

export class GenericAdapter extends BaseAdapter {
  constructor() {
    super("generic");
  }

  // Layer 1: JSON-LD JobPosting schema
  extractJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        const data = JSON.parse(script.textContent);
        
        // Handle direct object or graph array
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
    } catch (e) {
      // Ignore JSON-LD parse errors
    }
    return null;
  }

  // Layer 2: OpenGraph & Meta tags
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

    // Parse title formats like "Senior Engineer at Acme Corp" or "Acme Corp - Senior Engineer"
    if (ogTitle && ogTitle.includes(" at ")) {
      const parts = ogTitle.split(" at ");
      title = parts[0];
      company = parts[1]?.split("|")[0]?.trim() || company;
    } else if (ogTitle && ogTitle.includes(" - ")) {
      const parts = ogTitle.split(" - ");
      title = parts[0];
      company = parts[1]?.split("|")[0]?.trim() || company;
    }

    return {
      title,
      company,
      description: ogDesc,
    };
  }

  // Layer 3: Semantic DOM elements
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

    // Determine host domain for source
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
