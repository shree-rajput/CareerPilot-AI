/**
 * CareerPilot AI - Naukri Job Adapter
 */
(function () {
  class NaukriAdapter {
    constructor() {
      this.sourceName = "naukri";
      this.category = "JOB_PORTAL";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("naukri.com");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        if (path.includes("/job-listings")) return true;
        const titleEl = doc.querySelector("h1.styles_jd-header-title__r221H, .jd-header-title, h1.jd-header-title");
        const descEl = doc.querySelector(".styles_job-desc-container__txpYf, .job-desc");
        return Boolean(titleEl && descEl);
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/-(\d+)\?/);
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
      const el = doc.querySelector("h1.styles_jd-header-title__r221H, .jd-header-title, h1.jd-header-title, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".styles_jd-header-comp-name__M2BCall, .comp-name, a.pad-rt-8");
      return el ? el.textContent.trim() : "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".styles_jdc__location__xsvmo, .loc, .location");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".styles_job-desc-container__txpYf, .job-desc, section.job-desc");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary(doc = window.document) {
      const el = doc.querySelector(".styles_jdc__salary__W__j7, .salary");
      return el ? el.textContent.trim() : "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("#apply-button, .apply-button, button.apply-btn");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return bodyText.includes("successfully applied") || bodyText.includes("application sent");
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

  const instance = new NaukriAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_NAUKRI_ADAPTER__ = instance;
})();
