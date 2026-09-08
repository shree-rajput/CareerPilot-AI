/**
 * CareerPilot AI - Generic Company Career Site Adapter
 * Fallback adapter for arbitrary company career websites (e.g. mnjsoftware.com/corporate/careers/job-details.aspx?JobId=J0208)
 */
(function () {
  class GenericAdapter {
    constructor() {
      this.sourceName = "generic";
      this.category = "COMPANY_CAREER_SITE";
    }

    matches(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const params = u.searchParams;
        const jobId =
          params.get("JobId") ||
          params.get("jobId") ||
          params.get("job_id") ||
          params.get("req") ||
          params.get("requisitionId") ||
          params.get("postingId") ||
          params.get("id");
        if (jobId) return jobId;

        const path = u.pathname.toLowerCase();
        const match = path.match(/\/(jobs?|careers?|vacancy|position)\/([a-zA-Z0-9_-]+)/);
        if (match) return match[2];
      } catch (e) {}
      return "";
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const u = new URL(urlStr);
        const path = u.pathname.toLowerCase();
        const host = u.hostname.toLowerCase();

        // Exclude general homepages, logins, blog posts
        if (path === "/" || path.includes("/login") || path.includes("/sign_in") || path.includes("/about") || path.includes("/services")) {
          return false;
        }

        // Generic Careers Landing Homepage (e.g. company.com/careers) -> SILENT
        if ((path === "/careers" || path === "/careers/" || path === "/jobs" || path === "/jobs/") && !u.search) {
          return false;
        }

        const hasJobId = Boolean(this.extractJobId(urlStr));

        // Check JSON-LD
        let hasJsonLd = false;
        try {
          const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            if (!script.textContent) continue;
            const data = JSON.parse(script.textContent);
            const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
            for (const item of items) {
              if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
                hasJsonLd = true;
                break;
              }
            }
            if (hasJsonLd) break;
          }
        } catch (e) {}

        if (hasJsonLd) return true;

        const isJobPath = /\/(job-details|job_details|career-details|position|vacancy|openings|jobs?\/[a-z0-9_-]+)/i.test(path);
        const titleEl = doc.querySelector('[itemprop="title"], [data-qa="job-title"], .job-title, .posting-headline h2, h1');
        const descEl = doc.querySelector('[itemprop="description"], #job-description, .job-description, .posting-description, #content, article');

        const titleText = titleEl ? titleEl.textContent.trim() : "";
        const descText = descEl ? (typeof cleanJobDescriptionText === "function" ? cleanJobDescriptionText(descEl) : (descEl.innerText || descEl.textContent).trim()) : "";

        const isNonGenericTitle = titleText.length >= 3 && !/^(home|careers|jobs|welcome|login|search|index)$/i.test(titleText);
        const hasJobContent = isNonGenericTitle && descText.length >= 80;

        if (hasJobId && hasJobContent) return true;
        if (isJobPath && hasJobContent) return true;
        const applyBtn = typeof safeFindApplyButton === "function" ? safeFindApplyButton(doc) : null;
        if (hasJobContent && applyBtn) return true;

        return false;
      } catch (e) {
        return false;
      }
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "refId", "trackingId", "fbclid", "gclid"];
        trackingParams.forEach((p) => u.searchParams.delete(p));
        return u.toString();
      } catch (e) {
        return urlStr;
      }
    }

    extractTitle(doc = window.document) {
      const el =
        doc.querySelector('[itemprop="title"]') ||
        doc.querySelector('[data-qa="job-title"]') ||
        doc.querySelector(".job-title") ||
        doc.querySelector(".posting-headline h2") ||
        doc.querySelector("h1");
      return el ? el.textContent.trim() : doc.title.split("-")[0].split("|")[0].trim();
    }

    extractCompany(doc = window.document) {
      const el =
        doc.querySelector('[itemprop="hiringOrganization"]') ||
        doc.querySelector('[data-qa="company-name"]') ||
        doc.querySelector(".company-name") ||
        doc.querySelector(".org") ||
        doc.querySelector(".company");
      if (el) return el.textContent.trim();

      const ogMeta = doc.querySelector('meta[property="og:site_name"]');
      if (ogMeta && ogMeta.getAttribute("content")) return ogMeta.getAttribute("content").trim();

      try {
        const parts = window.location.hostname.replace(/^www\./, "").split(".");
        if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el =
        doc.querySelector('[itemprop="jobLocation"]') ||
        doc.querySelector(".location") ||
        doc.querySelector(".job-location") ||
        doc.querySelector(".posting-category");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el =
        doc.querySelector('[itemprop="description"]') ||
        doc.querySelector("#job-description") ||
        doc.querySelector(".job-description") ||
        doc.querySelector(".posting-description") ||
        doc.querySelector("#content") ||
        doc.querySelector("article");

      const raw = el ? (el.innerText || el.textContent) : "";
      if (typeof cleanJobDescriptionText === "function") {
        return cleanJobDescriptionText(el || raw);
      }
      return raw.trim();
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      if (typeof safeFindApplyButton === "function") {
        return safeFindApplyButton(doc, ["button[type='submit']", "input[type='submit']", "a[href*='apply']"]);
      }
      return null;
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return (
        bodyText.includes("thank you for applying") ||
        bodyText.includes("your application has been submitted") ||
        bodyText.includes("application submitted successfully")
      );
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

  const instance = new GenericAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_GENERIC_ADAPTER__ = instance;
})();
