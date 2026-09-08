/**
 * CareerPilot AI - Jobvite ATS Adapter
 */
(function () {
  class JobviteAdapter {
    constructor() {
      this.sourceName = "jobvite";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("jobvite.com");
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

        const titleEl = doc.querySelector(".jv-job-detail-name, h2.jv-header");
        const descEl = doc.querySelector(".jv-job-detail-description");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/\/j\/([a-zA-Z0-9]+)/);
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
      const el = doc.querySelector(".jv-job-detail-name, h2.jv-header");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".jv-logo img");
      if (el && el.getAttribute("alt")) return el.getAttribute("alt").trim();
      try {
        const parts = window.location.hostname.split(".");
        if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".jv-job-detail-meta");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".jv-job-detail-description");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector(".jv-button-apply, a[href*='apply']");
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

  const instance = new JobviteAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_JOBVITE_ADAPTER__ = instance;
})();
