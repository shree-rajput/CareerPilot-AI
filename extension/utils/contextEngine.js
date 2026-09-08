/**
 * CareerPilot AI - Application Context Engine
 * Preserves job discovery context when navigating from Job Portal -> External ATS/Company page.
 * Enforces tab isolation and context expiration (15 minutes).
 */

(function () {
  const CONTEXT_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

  async function createPendingContext(tabId, jobData) {
    if (!jobData || !jobData.company || !jobData.title) return null;

    const now = Date.now();
    const context = {
      id: `ctx-${now}-${Math.random().toString(36).substring(2, 7)}`,
      tabId,
      jobId: jobData.externalJobId || "",
      title: jobData.title || "",
      company: jobData.company || "",
      location: jobData.location || "",
      sourcePortal: jobData.source || "unknown",
      sourceJobUrl: jobData.url || window.location.href,
      canonicalJobUrl: jobData.url || window.location.href,
      description: jobData.description || "",
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + CONTEXT_EXPIRATION_MS).toISOString(),
      status: "applying",
    };

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: "SET_TAB_JOB_CONTEXT",
        tabId,
        payload: { jobContext: context },
      });
    }

    return context;
  }

  async function getPendingContext(tabId) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve(null);
        return;
      }

      chrome.runtime.sendMessage({ type: "GET_TAB_JOB_CONTEXT", tabId }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success || !res.jobContext) {
          resolve(null);
          return;
        }

        const ctx = res.jobContext;
        if (!ctx.expiresAt || new Date(ctx.expiresAt).getTime() < Date.now()) {
          // Expired context -> clear it
          chrome.runtime.sendMessage({ type: "SET_TAB_JOB_CONTEXT", tabId, payload: { jobContext: null } });
          resolve(null);
          return;
        }

        resolve(ctx);
      });
    });
  }

  function matchContextWithPage(pendingCtx, pageData) {
    if (!pendingCtx || !pageData) return { match: false, score: 0, signals: [] };

    let score = 0;
    const signals = [];

    // Company token match
    const ctxComp = (pendingCtx.company || "").toLowerCase().trim();
    const pageComp = (pageData.company || "").toLowerCase().trim();
    if (ctxComp && pageComp) {
      if (ctxComp === pageComp || pageComp.includes(ctxComp) || ctxComp.includes(pageComp)) {
        score += 40;
        signals.push("Company match");
      }
    }

    // Role / Title token match
    const ctxTitle = (pendingCtx.title || "").toLowerCase().trim();
    const pageTitle = (pageData.title || "").toLowerCase().trim();
    if (ctxTitle && pageTitle) {
      if (ctxTitle === pageTitle) {
        score += 40;
        signals.push("Exact title match");
      } else if (pageTitle.includes(ctxTitle) || ctxTitle.includes(pageTitle)) {
        score += 25;
        signals.push("Partial title match");
      }
    }

    // Location match
    if (pendingCtx.location && pageData.location) {
      if (pendingCtx.location.toLowerCase() === pageData.location.toLowerCase()) {
        score += 15;
        signals.push("Location match");
      }
    }

    // URL / JobId match
    if (pendingCtx.jobId && pageData.externalJobId && pendingCtx.jobId === pageData.externalJobId) {
      score += 30;
      signals.push("External Job ID match");
    }

    return {
      match: score >= 40,
      score,
      signals,
    };
  }

  window.__CAREERPILOT_CONTEXT_ENGINE__ = {
    createPendingContext,
    getPendingContext,
    matchContextWithPage,
  };
})();
