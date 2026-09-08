/**
 * CareerPilot AI - Glassdoor Job Adapter
 */
(function () {
  class GlassdoorAdapter {
    constructor() {
      this.sourceName = "glassdoor";
      this.category = "JOB_PORTAL";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("glassdoor.");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        if (path.includes("/job-listing/") || urlObj.searchParams.has("jl")) return true;
        const titleEl = doc.querySelector("[data-test='jobTitle'], .JobDetails_jobTitle__4g2hh, h1");
        const descEl = doc.querySelector(".JobDetails_jobDescription__u2_fL, #JobDescriptionContainer");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        const jl = urlObj.searchParams.get("jl");
        if (jl) return jl;
        const match = urlStr.match(/jobListingId=(\d+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      const jl = this.extractJobId(urlStr);
      if (jl) return `https://www.glassdoor.com/job-listing/?jl=${jl}`;
      return urlStr;
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector("[data-test='jobTitle'], .JobDetails_jobTitle__4g2hh, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector("[data-test='employerName'], .JobDetails_employerName__29fv1");
      return el ? el.textContent.replace(/\d\.\d\s*★?/, "").trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector("[data-test='location'], .JobDetails_location__mSg5z");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".JobDetails_jobDescription__u2_fL, #JobDescriptionContainer");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector("[data-test='detailSalary']");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("[data-test='applyButton'], button[aria-label*='Apply']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("application submitted") || bodyText.includes("thanks for applying");
    }

    extract(doc = window.document) {
      return {
        source: this.sourceName,
        externalJobId: this.extractJobId(),
        title: this.extractTitle(doc),
        company: this.extractCompany(doc),
        location: this.extractLocation(doc),
        url: this.getCanonicalJobUrl(),
        description: this.extractDescription(doc),
        salary: this.extractSalary(doc),
        category: this.category,
      };
    }
  }

  const instance = new GlassdoorAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_GLASSDOOR_ADAPTER__ = instance;
})();
