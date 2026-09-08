/**
 * CareerPilot AI - Lever ATS Adapter
 */
(function () {
  class LeverAdapter {
    constructor() {
      this.sourceName = "lever";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("lever.co");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        if (path === "/" || path.includes("/login") || path.includes("/jobs")) return false;

        const hasJobId = /\/[0-9a-f-]{10,}/i.test(path);
        const titleEl = doc.querySelector(".posting-headline h2, h2");
        const descEl = doc.querySelector(".section.page-centered, .posting-page");
        return Boolean(hasJobId || (titleEl && descEl));
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const match = urlStr.match(/\/([0-9a-f-]{10,})/i);
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
      const el = doc.querySelector(".posting-headline h2, h2");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const logoEl = doc.querySelector(".main-header-logo img");
      if (logoEl && logoEl.getAttribute("alt")) return logoEl.getAttribute("alt").replace(/logo/i, "").trim();
      try {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length >= 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".posting-categories .location, .location");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector(".section.page-centered, .posting-page");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector(".postings-btn, button[type='submit'], input[type='submit']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return (
        bodyText.includes("thanks for applying") ||
        bodyText.includes("application submitted") ||
        bodyText.includes("your application has been submitted") ||
        Boolean(doc.querySelector(".application-submitted"))
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

  const instance = new LeverAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_LEVER_ADAPTER__ = instance;
})();
