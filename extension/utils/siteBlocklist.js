/**
 * CareerPilot AI - Site Blocklist & Domain Guard
 * Manages disabled domains to enforce fail-closed behavior on non-career websites.
 */

(function () {
  const DEFAULT_BLOCKED_DOMAINS = [
    "leetcode.com",
    "github.com",
    "youtube.com",
    "google.com",
    "stackoverflow.com",
    "reddit.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
  ];

  async function getBlockedDomains() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        resolve(DEFAULT_BLOCKED_DOMAINS);
        return;
      }

      chrome.storage.local.get(["blockedDomains"], (result) => {
        if (!result.blockedDomains || !Array.isArray(result.blockedDomains)) {
          chrome.storage.local.set({ blockedDomains: DEFAULT_BLOCKED_DOMAINS });
          resolve(DEFAULT_BLOCKED_DOMAINS);
        } else {
          resolve(result.blockedDomains);
        }
      });
    });
  }

  async function isDomainBlocked(urlStr = window.location.href) {
    try {
      const urlObj = new URL(urlStr);
      const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");
      const blockedList = await getBlockedDomains();

      return blockedList.some((blocked) => {
        const cleanBlocked = blocked.toLowerCase().trim().replace(/^www\./, "");
        return host === cleanBlocked || host.endsWith("." + cleanBlocked);
      });
    } catch (e) {
      return true; // Fail closed if URL parsing fails
    }
  }

  async function addBlockedDomain(domainStr) {
    if (!domainStr || typeof domainStr !== "string") return false;
    const clean = domainStr.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const current = await getBlockedDomains();
    if (!current.includes(clean)) {
      current.push(clean);
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ blockedDomains: current });
      }
    }
    return true;
  }

  async function removeBlockedDomain(domainStr) {
    if (!domainStr || typeof domainStr !== "string") return false;
    const clean = domainStr.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const current = await getBlockedDomains();
    const updated = current.filter((d) => d !== clean);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ blockedDomains: updated });
    }
    return true;
  }

  window.__CAREERPILOT_SITE_BLOCKLIST__ = {
    DEFAULT_BLOCKED_DOMAINS,
    getBlockedDomains,
    isDomainBlocked,
    addBlockedDomain,
    removeBlockedDomain,
  };
})();
