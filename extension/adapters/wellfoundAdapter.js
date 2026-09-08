/**
 * CareerPilot AI - Wellfound (AngelList) Job Adapter
 */
(function () {
  class WellfoundAdapter {
    constructor() {
      this.sourceName = "wellfound";
      this.category = "JOB_PORTAL";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("wellfound.com") || urlObj.hostname.toLowerCase().includes("angel.co");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        if (path.includes("/jobs/") || path.includes("/l/")) return true;
        const titleEl = doc.querySelector("h1, .styles_title__");
        const descEl = doc.querySelector("[class*='styles_description__'], .job-description");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/\/jobs\/(\d+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        u.search = "";
        return u.toString();
      } catch (e) {
        return urlStr;
      }
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector("h1, [class*='styles_jobTitle__']");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector("[class*='styles_startupName__'], [class*='styles_companyName__']");
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector("[class*='styles_location__']");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector("[class*='styles_description__'], .job-description");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector("[class*='styles_compensation__']");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      if (typeof safeFindApplyButton === "function") {
        return safeFindApplyButton(doc, ["button[data-test='ApplyButton']"]);
      }
      return doc.querySelector("button[data-test='ApplyButton']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("application submitted") || bodyText.includes("applied!");
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

  const instance = new WellfoundAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_WELLFOUND_ADAPTER__ = instance;
})();
