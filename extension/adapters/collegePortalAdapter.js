/**
 * CareerPilot AI - College Placement Portal Adapter
 * Supports university placement portals (e.g. Superset, CoCubes, AMCAT, custom .edu placement portals)
 */

(function () {
  const DEFAULT_COLLEGE_DOMAINS = [
    "join-superset.com",
    "superset.in",
    "cocubes.com",
    "myamcat.com",
    "unostop.com",
    "firstnoline.com",
  ];

  class CollegePortalAdapter {
    constructor() {
      this.sourceName = "college_portal";
      this.category = "COLLEGE_PLACEMENT_PORTAL";
    }

    async matchesAsync(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();

        // 1. Check default known college placement platforms
        if (DEFAULT_COLLEGE_DOMAINS.some((d) => host.includes(d))) {
          return true;
        }

        // 2. Check if URL matches .edu or .ac.in placement paths
        const path = u.pathname.toLowerCase();
        if ((host.endsWith(".edu") || host.endsWith(".ac.in")) && (path.includes("/placement") || path.includes("/tnp") || path.includes("/jobs"))) {
          return true;
        }

        // 3. Check user-configured trusted college domains in chrome.storage.local
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          const res = await new Promise((resolve) => chrome.storage.local.get(["collegeDomains"], resolve));
          const customDomains = res?.collegeDomains || [];
          if (Array.isArray(customDomains) && customDomains.some((d) => host.includes(d.toLowerCase()))) {
            return true;
          }
        }

        return false;
      } catch (e) {
        return false;
      }
    }

    matches(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        if (DEFAULT_COLLEGE_DOMAINS.some((d) => host.includes(d))) return true;
        const path = u.pathname.toLowerCase();
        if ((host.endsWith(".edu") || host.endsWith(".ac.in")) && (path.includes("/placement") || path.includes("/tnp") || path.includes("/jobs"))) {
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const path = u.pathname.toLowerCase();

        // Non-job college portal pages (dashboard, profile, results, settings) -> SILENT
        if (
          path === "/" ||
          path.includes("/dashboard") ||
          path.includes("/profile") ||
          path.includes("/results") ||
          path.includes("/settings") ||
          path.includes("/login") ||
          path.includes("/resume")
        ) {
          return false;
        }

        // Opportunity / Drive / Job pages -> DETECT
        const isOpportunityPage =
          path.includes("/opportunities") ||
          path.includes("/drives") ||
          path.includes("/jobs") ||
          path.includes("/placements/") ||
          u.searchParams.has("driveId") ||
          u.searchParams.has("opportunityId");

        const titleEl = doc.querySelector(".opportunity-title, .drive-header, h1, h2");
        const descEl = doc.querySelector(".job-description, .drive-details, #opportunity-description");

        return Boolean(isOpportunityPage || (titleEl && descEl));
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        const driveId = u.searchParams.get("driveId") || u.searchParams.get("opportunityId") || u.searchParams.get("id");
        if (driveId) return driveId;

        const match = u.pathname.match(/\/(opportunities|drives|jobs)\/([a-zA-Z0-9_-]+)/);
        if (match) return match[2];
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
      const el = doc.querySelector(".opportunity-title, .drive-title, .job-title, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".company-name, .employer-name, .organization-name");
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".location, .job-location");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".job-description, .drive-details, #opportunity-description");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector(".ctc-details, .salary-package, .package-details");
      return el ? el.textContent.trim() : "";
    }

    extractEligibility(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      const cgpaMatch = bodyText.match(/cgpa\s*[:>=]\s*(\d+(\.\d+)?)/i);
      const branchMatch = bodyText.match(/(b\.?tech|c\.?s\.?e|i\.?t|e\.?c\.?e|m\.?c\.?a)/i);

      if (cgpaMatch || branchMatch) {
        return {
          status: "POSSIBLY ELIGIBLE",
          criteria: `Found criteria: ${cgpaMatch ? cgpaMatch[0] : ""} ${branchMatch ? branchMatch[0] : ""}`.trim(),
        };
      }

      return {
        status: "INSUFFICIENT DATA",
        criteria: "Review placement portal eligibility criteria manually.",
      };
    }

    getApplyButton(doc = window.document) {
      if (typeof safeFindApplyButton === "function") {
        return safeFindApplyButton(doc, ["button.apply-btn", "button[data-test='apply']"]);
      }
      return doc.querySelector("button.apply-btn, button[data-test='apply']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("registered successfully") || bodyText.includes("applied for drive") || bodyText.includes("application submitted");
    }

    extract(doc = window.document) {
      const eligibility = this.extractEligibility(doc);
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
        eligibilityStatus: eligibility.status,
        eligibilityDetails: eligibility.criteria,
      };
    }
  }

  const instance = new CollegePortalAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_COLLEGE_PORTAL_ADAPTER__ = instance;
})();
