/**
 * CareerPilot AI - Workday ATS Adapter
 */
(function () {
  class WorkdayAdapter {
    constructor() {
      this.sourceName = "workday";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        const host = urlObj.hostname.toLowerCase();
        return host.includes("workday.com") || host.includes("myworkdayjobs.com");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        // Workday homepage / login page / employee login must return FALSE -> SILENT
        if (path === "/" || path.includes("/login") || path.includes("/sign_in") || path.endsWith("/workday")) {
          return false;
        }

        const hasJobId = /_([A-Za-z0-9_-]+)$/.test(path) || /\/job\//.test(path);
        const titleEl = doc.querySelector('[data-automation-id="jobPostingHeader"], h1');
        const descEl = doc.querySelector('[data-automation-id="jobPostingDescription"], #jobDescriptionText');
        return Boolean(hasJobId || (titleEl && descEl));
      } catch (e) {
        return false;
      }
    }

    extractJobId(doc = window.document, urlStr = window.location.href) {
      try {
        const reqEl = doc.querySelector('[data-automation-id="requisitionId"]');
        if (reqEl && reqEl.textContent.trim()) return reqEl.textContent.trim();

        const match = urlStr.match(/_([A-Za-z0-9_-]+)$/) || urlStr.match(/\/job\/([A-Za-z0-9_-]+)/) || urlStr.match(/(R\d+)/i);
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
      const el = doc.querySelector('[data-automation-id="jobPostingHeader"], h1');
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector('[data-automation-id="company-name"], [data-automation-id="jobPostingCompany"]');
      if (el) return el.textContent.trim();
      try {
        const host = window.location.hostname.toLowerCase();
        if (host.includes("crowdstrike")) return "CrowdStrike";
        const part = host.split(".")[0];
        if (part && part.length > 2) return part.charAt(0).toUpperCase() + part.slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector('[data-automation-id="locations"], [data-automation-id="jobPostingLocation"]');
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector('[data-automation-id="jobPostingDescription"], #jobDescriptionText');
      if (!el) return "";
      return typeof window.cleanJobDescriptionText === "function"
        ? window.cleanJobDescriptionText(el, doc)
        : el.innerText.trim();
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      if (typeof window.safeFindApplyButton === "function") {
        return window.safeFindApplyButton(doc, [
          '[data-automation-id="advisorApplyButton"]',
          '[data-automation-id="bottom-apply-button"]',
        ]);
      }
      return doc.querySelector('[data-automation-id="advisorApplyButton"], [data-automation-id="bottom-apply-button"]');
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return (
        bodyText.includes("congratulations, your application has been submitted") ||
        bodyText.includes("application submitted") ||
        bodyText.includes("thank you for applying") ||
        Boolean(doc.querySelector('[data-automation-id="completionMessage"]'))
      );
    }

    extract(doc = window.document) {
      if (typeof window.extractJsonLdJobPosting === "function") {
        const jsonLd = window.extractJsonLdJobPosting(doc);
        if (jsonLd && jsonLd.title && jsonLd.description) {
          return {
            source: this.sourceName,
            externalJobId: jsonLd.identifier || this.extractJobId(doc),
            title: jsonLd.title,
            company: jsonLd.company || this.extractCompany(doc),
            location: jsonLd.location || this.extractLocation(doc),
            url: this.getCanonicalJobUrl(),
            description: jsonLd.description,
            salary: this.extractSalary(doc),
            category: this.category,
          };
        }
      }

      return {
        source: this.sourceName,
        externalJobId: this.extractJobId(doc),
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

  const instance = new WorkdayAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_WORKDAY_ADAPTER__ = instance;
})();
