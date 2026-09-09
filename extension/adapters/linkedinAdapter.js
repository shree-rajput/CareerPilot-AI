/**
 * CareerPilot AI - LinkedIn Job Adapter
 * Handles linkedin.com/jobs/view/{id} and search panels with currentJobId param.
 * Uses layered extraction: DOM selectors → document.title → OpenGraph.
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

        // Strongest signal: /jobs/view/{numericId} URL pattern
        if (/\/jobs\/view\/\d+/.test(path)) return true;

        // Search panel with focused job
        if (urlObj.searchParams.has("currentJobId")) return true;

        // DOM presence fallback (for cases where URL alone isn't conclusive)
        const titleEl = doc.querySelector([
          ".job-details-jobs-unified-top-card__job-title",
          ".jobs-unified-top-card__job-title",
          ".jobs-details-top-card__job-title",
          "h1.t-24",
          ".job-view-layout h1",
        ].join(", "));
        const descEl = doc.querySelector("#job-details, .jobs-description__content, .jobs-box__html-content");
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
      // Strategy A: LinkedIn-specific DOM selectors (maintained for current + older LinkedIn versions)
      const selectors = [
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        ".jobs-details-top-card__job-title",
        "h1.t-24",
        ".job-view-layout h1",
        ".jobs-unified-top-card h1",
        "[data-test-id='job-detail-name']",
      ];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.length >= 2) return text;
        }
      }

      // Strategy B: OpenGraph title — LinkedIn sets og:title to "Job Title at Company | LinkedIn"
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
      if (ogTitle) {
        const parts = ogTitle.split(/\s+(?:at|@|-|\|)\s+/i);
        if (parts[0] && parts[0].length >= 2 && !/^linkedin$/i.test(parts[0].trim())) {
          return parts[0].trim();
        }
      }

      // Strategy C: document.title — format: "Job Title at Company | LinkedIn"
      const docTitle = doc.title || "";
      if (docTitle && docTitle.includes(" | ")) {
        const main = docTitle.split(" | ")[0].trim();
        // Remove " at Company" suffix if present
        const atIdx = main.search(/\s+at\s+[A-Z]/);
        if (atIdx > 0) return main.substring(0, atIdx).trim();
        if (main.length >= 2 && !/^linkedin$/i.test(main)) return main;
      }

      return "";
    }

    extractCompany(doc = window.document) {
      // Strategy A: LinkedIn-specific DOM selectors
      const selectors = [
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__primary-description a",
        ".jobs-details-top-card__company-url",
        "[data-test-id='job-detail-company-name']",
      ];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.length >= 2) return text;
        }
      }

      // Strategy B: document.title — "Job Title at Company | LinkedIn"
      const docTitle = doc.title || "";
      const atMatch = docTitle.match(/\bat\s+([^|]+?)(?:\s*\||\s*$)/i);
      if (atMatch && atMatch[1]) {
        const company = atMatch[1].replace(/\s*\|.*$/, "").trim();
        if (company.length >= 2 && !/^linkedin$/i.test(company)) return company;
      }

      // Strategy C: og:site_name
      const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
      if (ogSite && !/^linkedin$/i.test(ogSite)) return ogSite.trim();

      return "";
    }

    extractLocation(doc = window.document) {
      const selectors = [
        ".job-details-jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__workplace-type",
        "[data-test-id='job-detail-location']",
        ".jobs-details-top-card__bullet",
      ];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.length >= 2) return text;
        }
      }
      // Fallback: try all bullets and return first non-empty
      const bullets = doc.querySelectorAll(".jobs-unified-top-card__metadata-container span");
      for (const b of bullets) {
        const text = b.textContent.trim();
        if (text.length >= 2 && !/^\d+$/.test(text)) return text;
      }
      return "";
    }

    extractDescription(doc = window.document) {
      const selectors = [
        "#job-details",
        ".jobs-description__content",
        ".jobs-box__html-content",
        ".jobs-description-content__text",
        "[data-test-id='job-detail-description']",
      ];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const raw = el.innerText || el.textContent;
          if (raw && raw.trim().length >= 50) {
            return typeof cleanJobDescriptionText === "function"
              ? cleanJobDescriptionText(el)
              : raw.trim().substring(0, 3000);
          }
        }
      }
      // Fallback: og:description
      const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute("content");
      return ogDesc ? ogDesc.trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector(".job-details-preferences-and-skills, .salary-main-card, .compensation-package-card");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      const selectors = [
        ".jobs-apply-button",
        "button[data-job-id]",
        ".jobs-s-apply button",
        "button.artdeco-button--primary",
        "[data-control-name='jobdetails_topcard_inapply']",
      ];
      if (typeof safeFindApplyButton === "function") {
        return safeFindApplyButton(doc, selectors);
      }
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) return el;
      }
      return null;
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return (
        bodyText.includes("application sent") ||
        bodyText.includes("your application was submitted") ||
        bodyText.includes("applied successfully") ||
        bodyText.includes("you've applied")
      );
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
