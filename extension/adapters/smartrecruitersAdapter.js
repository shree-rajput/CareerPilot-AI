/**
 * CareerPilot AI - SmartRecruiters ATS Adapter
 */
(function () {
  class SmartRecruitersAdapter {
    constructor() {
      this.sourceName = "smartrecruiters";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("smartrecruiters.com");
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

        const titleEl = doc.querySelector("#job-title, h1");
        const descEl = doc.querySelector("#job-description, .job-sections");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/\/([0-9a-f-]{10,})/i) || urlStr.match(/\/([0-9]{8,})/);
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
      const el = doc.querySelector("#job-title, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".company-name, [data-qa='company-name']");
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector('[itemprop="jobLocation"], .job-detail .location');
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector("#job-description, .job-sections");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("#st-apply, .btn-primary, button[type='submit']");
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

  const instance = new SmartRecruitersAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_SMARTRECRUITERS_ADAPTER__ = instance;
})();
