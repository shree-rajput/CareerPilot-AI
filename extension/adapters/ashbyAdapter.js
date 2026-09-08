/**
 * CareerPilot AI - Ashby ATS Adapter
 */
(function () {
  class AshbyAdapter {
    constructor() {
      this.sourceName = "ashby";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("ashbyhq.com");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        if (path === "/" || path.includes("/login")) return false;

        const hasJobId = /[0-9a-f-]{10,}/i.test(path);
        const titleEl = doc.querySelector("h1, .ashby-job-posting-heading");
        const descEl = doc.querySelector(".ashby-job-posting-description, [class*='JobPostingDescription']");
        return Boolean(hasJobId || (titleEl && descEl));
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length > 0 && /[0-9a-f-]{10,}/i.test(parts[parts.length - 1])) return parts[parts.length - 1];
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
      const el = doc.querySelector("h1, .ashby-job-posting-heading");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector("[class*='CompanyHeader'], .ashby-job-posting-company-name");
      if (el) return el.textContent.trim();
      try {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length >= 1 && parts[0] !== "jobs") return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector("[class*='JobPostingLocation']");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".ashby-job-posting-description, [class*='JobPostingDescription']");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("button[type='submit'], a[href*='application']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("thank you for applying") || bodyText.includes("application submitted");
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

  const instance = new AshbyAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_ASHBY_ADAPTER__ = instance;
})();
