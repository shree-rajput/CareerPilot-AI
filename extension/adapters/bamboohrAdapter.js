/**
 * CareerPilot AI - BambooHR ATS Adapter
 */
(function () {
  class BambooHRAdapter {
    constructor() {
      this.sourceName = "bamboohr";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("bamboohr.com");
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

        const titleEl = doc.querySelector(".jss-e1, .JobPostingHeader__title, h1");
        const descEl = doc.querySelector(".JobPosting__description, [class*='JobPostingDescription']");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/id=(\d+)/) || urlStr.match(/\/jobs\/view\.php\?id=(\d+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        return u.toString();
      } catch (e) {
        return urlStr;
      }
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector(".JobPostingHeader__title, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".JobPostingHeader__companyName");
      if (el) return el.textContent.trim();
      try {
        const parts = window.location.hostname.split(".");
        if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".JobPostingHeader__location");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".JobPosting__description, [class*='JobPostingDescription']");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("button[type='submit'], a[href*='apply']");
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

  const instance = new BambooHRAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_BAMBOOHR_ADAPTER__ = instance;
})();
