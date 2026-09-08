/**
 * CareerPilot AI - Indeed Job Adapter
 */
(function () {
  class IndeedAdapter {
    constructor() {
      this.sourceName = "indeed";
      this.category = "JOB_PORTAL";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("indeed.");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        const params = urlObj.searchParams;

        if (path.startsWith("/account") || path.startsWith("/myjobs") || path.startsWith("/salaries") || path.startsWith("/hire") || path.startsWith("/cmp")) {
          return false;
        }

        const jk = params.get("jk") || params.get("vjs") || params.get("vjk");
        const isViewJob = /\/(viewjob|rc\/clk)\b/i.test(path);
        if (isViewJob && jk) return true;

        const titleEl = doc.querySelector(".jobsearch-JobInfoHeader-title, h1[data-testid='simpler-job-title']");
        const descEl = doc.querySelector("#jobDescriptionText, .jobsearch-jobDescriptionText");
        return Boolean(titleEl && descEl && (jk || path.includes("/jobs")));
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.searchParams.get("jk") || urlObj.searchParams.get("vjs") || urlObj.searchParams.get("vjk") || "";
      } catch (e) {
        return "";
      }
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      const jk = this.extractJobId(urlStr);
      if (jk) return `https://www.indeed.com/viewjob?jk=${jk}`;
      return urlStr;
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector(".jobsearch-JobInfoHeader-title, h1[data-testid='simpler-job-title']");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector('[data-company-name="true"], [data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating div');
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector('[data-testid="inlineHeader-companyLocation"], .companyLocation');
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector("#jobDescriptionText, .jobsearch-jobDescriptionText");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector("#salaryInfoAndJobType, [data-testid='jobsearch-OtherJobDetailsContainer']");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("#indeedApplyButton, button[aria-label*='Apply'], a[href*='apply']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("your application has been submitted") || bodyText.includes("application submitted");
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

  const instance = new IndeedAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_INDEED_ADAPTER__ = instance;
})();
