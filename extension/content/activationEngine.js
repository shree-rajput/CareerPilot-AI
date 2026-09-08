/**
 * CareerPilot AI - Central Activation Engine
 * Implements deterministic guards, confidence evaluation, and fail-closed activation.
 * Single Source of Truth for CareerPilot UI & API invocation.
 */

(function () {
  const CONFIDENCE_ACTIVATION_THRESHOLD = 60;

  async function evaluateActivation(doc = window.document, urlStr = window.location.href, options = {}) {
    const isManualInspect = Boolean(options.isManualInspect);

    const diagnostics = {
      shouldActivate: false,
      contextType: "unknown",
      mode: isManualInspect ? "on_demand" : "automatic",
      confidence: 0,
      confidenceScore: 0,
      adapter: "none",
      decision: "SKIP",
      reason: "",
      signals: [],
      extracted: null,
      domain: "",
    };

    try {
      const urlObj = new URL(urlStr);
      diagnostics.domain = urlObj.hostname.toLowerCase();

      // 1. SITE BLOCKLIST GUARD
      if (window.__CAREERPILOT_SITE_BLOCKLIST__) {
        const blocked = await window.__CAREERPILOT_SITE_BLOCKLIST__.isDomainBlocked(urlStr);
        if (blocked) {
          diagnostics.reason = "Domain disabled or in site blocklist";
          logDebugInfo(diagnostics);
          return diagnostics;
        }
      }

      // 2. ROUTE GUARD (Filter out non-job platform routes)
      const path = urlObj.pathname.toLowerCase();
      const isNonJobRoute =
        path === "/" ||
        path.startsWith("/feed") ||
        path.startsWith("/in/") ||
        path.startsWith("/mynetwork") ||
        path.startsWith("/messaging") ||
        path.startsWith("/notifications") ||
        path.startsWith("/settings") ||
        path.startsWith("/account") ||
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/problems/") || // LeetCode problems
        path.startsWith("/explore") ||
        path.startsWith("/contest");

      if (isNonJobRoute && !urlStr.includes("currentJobId=") && !urlStr.includes("jk=") && !urlStr.includes("gh_jid=") && !urlStr.includes("JobId=")) {
        diagnostics.reason = "Page path is a non-job platform route";
        logDebugInfo(diagnostics);
        return diagnostics;
      }

      // 3. PORTAL / ATS / COLLEGE ADAPTER RESOLUTION
      const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
      if (!registry) {
        diagnostics.reason = "Portal registry missing";
        logDebugInfo(diagnostics);
        return diagnostics;
      }

      const adapter = registry.getAdapterForUrl(urlStr);
      if (!adapter) {
        diagnostics.reason = "Unsupported website — No matching job/ATS adapter";
        logDebugInfo(diagnostics);
        return diagnostics;
      }

      diagnostics.adapter = adapter.sourceName;
      if (adapter.category === "COLLEGE_PLACEMENT_PORTAL") {
        diagnostics.contextType = "college_opportunity";
      } else if (adapter.category === "JOB_PORTAL" || adapter.category === "ATS" || adapter.category === "COMPANY_CAREER_SITE") {
        diagnostics.contextType = "job";
      }

      // 4. ADAPTER IS_JOB_PAGE CHECK
      const isJob = adapter.isJobPage(doc, urlStr);
      if (!isJob && !isManualInspect) {
        diagnostics.reason = "Adapter indicates page is not an active job listing or application form";
        logDebugInfo(diagnostics);
        return diagnostics;
      }

      // 5. EXTRACT DETAILS & CALCULATE CONFIDENCE SCORE
      const extracted = adapter.extract(doc);
      let score = 0;

      // JSON-LD schema (+35)
      if (doc.querySelector('script[type="application/ld+json"]')?.textContent?.includes("JobPosting")) {
        score += 35;
        diagnostics.signals.push("JSON-LD JobPosting schema (+35)");
      }

      // Job URL structure (+25)
      if (
        /\/jobs\/view\//.test(urlStr) ||
        /\/viewjob/.test(urlStr) ||
        /jk=/.test(urlStr) ||
        /gh_jid=/.test(urlStr) ||
        /JobId=/i.test(urlStr) ||
        /\/jobs\/\d+/.test(path) ||
        adapter.category === "ATS"
      ) {
        score += 25;
        diagnostics.signals.push("Known job URL structure (+25)");
      }

      // Title signal (+20)
      if (extracted.title && extracted.title.length >= 3 && !/^(home|login|search|jobs|careers|welcome|index)$/i.test(extracted.title)) {
        score += 20;
        diagnostics.signals.push("Valid job title (+20)");
      }

      // Company signal (+10)
      if (extracted.company && extracted.company.length >= 2 && !/^(unknown|company)$/i.test(extracted.company)) {
        score += 10;
        diagnostics.signals.push("Valid company name (+10)");
      }

      // Description signal (+20)
      if (extracted.description && extracted.description.length >= 80) {
        score += 20;
        diagnostics.signals.push("Comprehensive job description (+20)");
      }

      // Location signal (+5)
      if (extracted.location) {
        score += 5;
        diagnostics.signals.push("Location metadata (+5)");
      }

      // Apply / Submit CTA signal (+15)
      const applyBtn = adapter.getApplyButton ? adapter.getApplyButton(doc) : null;
      if (applyBtn) {
        score += 15;
        diagnostics.signals.push("Apply/Submit CTA button (+15)");
      }

      diagnostics.confidence = score;
      diagnostics.confidenceScore = score;
      diagnostics.extracted = extracted;

      // 6. CONFIDENCE THRESHOLD CHECK
      const threshold = isManualInspect ? 40 : CONFIDENCE_ACTIVATION_THRESHOLD;
      const isNonGenericTitle = extracted.title && extracted.title.length >= 3 && !/^(home|login|search|jobs|careers|welcome|index|untitled role)$/i.test(extracted.title);
      const isNonGenericCompany = extracted.company && extracted.company.length >= 2 && !/^(unknown|company)$/i.test(extracted.company);

      if (score >= threshold && isNonGenericTitle && isNonGenericCompany) {
        diagnostics.shouldActivate = true;
        diagnostics.decision = "ACTIVATE";
        diagnostics.reason = `Confidence score ${score} meets threshold (>= ${threshold})`;
      } else {
        diagnostics.shouldActivate = false;
        diagnostics.decision = "SKIP";
        diagnostics.reason = `Confidence score ${score} below threshold (${threshold}) or metadata missing — Fail Closed`;
      }

      logDebugInfo(diagnostics);
      return diagnostics;
    } catch (err) {
      diagnostics.decision = "SKIP";
      diagnostics.reason = `Evaluation error: ${err.message}`;
      logDebugInfo(diagnostics);
      return diagnostics;
    }
  }

  function logDebugInfo(diag) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["debugMode"], (res) => {
        if (res?.debugMode || true) {
          console.debug("[CareerPilot Debug]", {
            hostname: diag.domain,
            adapter: diag.adapter,
            context: diag.contextType,
            confidence: diag.confidence,
            decision: diag.decision,
            reason: diag.reason,
            signals: diag.signals,
          });
        }
      });
    }
  }

  window.__CAREERPILOT_ACTIVATION_ENGINE__ = {
    CONFIDENCE_ACTIVATION_THRESHOLD,
    evaluateActivation,
  };
})();
