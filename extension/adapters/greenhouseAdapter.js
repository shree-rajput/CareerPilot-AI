/**
 * CareerPilot AI - Greenhouse ATS Adapter
 */
(function () {
  class GreenhouseAdapter {
    constructor() {
      this.sourceName = "greenhouse";
      this.category = "ATS";
    }

    matches(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase().includes("greenhouse.io") || urlObj.searchParams.has("gh_jid");
      } catch (e) {
        return false;
      }
    }

    isJobPage(doc = window.document, urlStr = window.location.href) {
      if (!this.matches(urlStr)) return false;
      try {
        const urlObj = new URL(urlStr);
        const path = urlObj.pathname.toLowerCase();
        // Ignore general greenhouse homepage or login pages
        if (path === "/" || path.includes("/login") || path.includes("/sign_in")) return false;
        
        const hasJobId = urlObj.searchParams.has("gh_jid") || /\/jobs\/\d+/.test(path);
        const titleEl = doc.querySelector(".app-title, h1");
        const descEl = doc.querySelector("#content, .content, #main");
        return Boolean(hasJobId || (titleEl && descEl));
      } catch (e) {
        return false;
      }
    }

    extractJobId(urlStr = window.location.href) {
      try {
        const urlObj = new URL(urlStr);
        const ghJid = urlObj.searchParams.get("gh_jid");
        if (ghJid) return ghJid;
        const match = urlObj.pathname.match(/\/jobs\/(\d+)/);
        if (match) return match[1];
      } catch (e) {}
      return "";
    }

    getCanonicalJobUrl(urlStr = window.location.href) {
      try {
        const u = new URL(urlStr);
        u.searchParams.delete("utm_source");
        u.searchParams.delete("utm_medium");
        return u.toString();
      } catch (e) {
        return urlStr;
      }
    }

    extractTitle(doc = window.document) {
      const el = doc.querySelector(".app-title, h1");
      return el ? el.textContent.trim() : "";
    }

    extractCompany(doc = window.document) {
      const el = doc.querySelector(".company-name, .heading");
      if (el) return el.textContent.replace(/^at\s+/i, "").trim();
      try {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length > 0 && parts[0] !== "jobs") return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch (e) {}
      return "";
    }

    extractLocation(doc = window.document) {
      const el = doc.querySelector(".location");
      return el ? el.textContent.trim() : "";
    }

    extractDescription(doc = window.document) {
      const el = doc.querySelector("#content, .content, #main");
      return el ? (el.innerText || el.textContent).trim() : "";
    }

    extractSalary() {
      return "";
    }

    getApplyButton(doc = window.document) {
      return doc.querySelector("#submit_app, input[type='submit'], button[type='submit']");
    }

    detectSubmissionConfirmation(doc = window.document) {
      const bodyText = (doc.body?.innerText || "").toLowerCase();
      return (
        bodyText.includes("thank you for applying") ||
        bodyText.includes("application submitted") ||
        bodyText.includes("your application has been received") ||
        Boolean(doc.querySelector(".application-submitted, #application_confirmed"))
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

  const instance = new GreenhouseAdapter();
  if (window.__CAREERPILOT_PORTAL_REGISTRY__) {
    window.__CAREERPILOT_PORTAL_REGISTRY__.registerAdapter(instance);
  }
  window.__CAREERPILOT_GREENHOUSE_ADAPTER__ = instance;
})();
