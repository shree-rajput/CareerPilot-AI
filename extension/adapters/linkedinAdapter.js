/**
 * CareerPilot AI - LinkedIn Job Adapter
 */
(function () {
  class LinkedInAdapter {
    constructor() {
      this.sourceName = "linkedin";
      this.category = "JOB_PORTAL";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("linkedin.com");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        const hasJobId = /\/jobs\/view\/(\d+)/.test(path) || urlObj.searchParams.has("currentJobId");
        if (hasJobId) return true;

        const titleEl = doc.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24");
        const descEl = doc.querySelector("#job-details, .jobs-description__content");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        const match = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
        if (match) return match[1];
        return urlObj.searchParams.get("currentJobId") || "";
      } catch (e) {
        return "";
      }
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      const jobId = this.extractJobId(urlStr);
      if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}/`;
      try {
        const u = new URL(urlStr);
        u.search = "";
        return u.toString();
      } catch (e) {
        return urlStr;
      }
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, .jobs-details-top-card__job-title");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-details-top-card__company-url, .jobs-unified-top-card__primary-description a");
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const bullets = doc.querySelectorAll(".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet");
      if (bullets && bullets.length > 0) return bullets[0].textContent.trim();
      return "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector("#job-details, .jobs-description__content, .jobs-box__html-content");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector(".job-details-preferences-and-skills, .salary-main-card");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector(".jobs-apply-button, button[data-job-id]");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("application sent") || bodyText.includes("your application was submitted") || bodyText.includes("applied successfully");
    }

    extract(doc = window.document) {
      const title = this.extractTitle(doc);
      const company = this.extractCompany(doc);
      const location = this.extractLocation(doc);
      const description = this.extractDescription(doc);
      const salary = this.extractSalary(doc);
      const externalJobId = this.extractJobId();
      const canonicalUrl = this.getCanonicalJobUrl();

      return {
        source: this.sourceName,
        externalJobId,
        title,
        company,
        location,
        url: canonicalUrl,
        description,
        salary,
        category: this.category,
      };
    }
  }

  const instance = new LinkedInAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_LINKEDIN_ADAPTER__ = instance;
})();
