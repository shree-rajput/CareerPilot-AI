/**
 * CareerPilot AI - Central Activation Engine
 * Implements deterministic guards, confidence evaluation, and fail-closed activation.
 * Single Source of Truth for CareerPilot UI & API invocation.
 *
 * Decision states:
 *   ACTIVATE       — High confidence job. Show overlay.
 *   RETRY_PENDING  — Adapter confirmed job page, but DOM not yet populated. Caller should retry.
 *   SKIP           — Not a job page, or ambiguous with insufficient evidence. Stay silent.
 */

(function () {
  const CONFIDENCE_ACTIVATION_THRESHOLD = 60;
  const MANUAL_INSPECT_THRESHOLD = 35;

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
      adapterConfirmed: false,
    };

    try {
      const urlObj = new URL(urlStr);
      diagnostics.domain = urlObj.hostname.toLowerCase();

      // 1. SITE BLOCKLIST GUARD
      if (window.__CAREERPILOT_SITE_BLOCKLIST__) {
        const blocked = await window.__CAREERPILOT_SITE_BLOCKLIST__.isDomainBlocked(urlStr);
        if (blocked) {
          diagnostics.reason = "Domain in site blocklist";
          _logDebug(diagnostics);
          return diagnostics;
        }
      }

      // 2. ROUTE GUARD — filter out definitively non-job platform routes
      const path = urlObj.pathname.toLowerCase();
      const isDefinitelyNotJobRoute =
        path === "/" ||
        path.startsWith("/feed") ||
        path.startsWith("/in/") ||      // LinkedIn profiles
        path.startsWith("/mynetwork") ||
        path.startsWith("/messaging") ||
        path.startsWith("/notifications") ||
        path.startsWith("/settings") ||
        path.startsWith("/account") ||
        path.startsWith("/login") ||
        path.startsWith("/sign_in") ||
        path.startsWith("/signup") ||
        path.startsWith("/problems/") || // LeetCode
        path.startsWith("/explore") ||
        path.startsWith("/contest") ||
        (path.includes("/privacy") && !path.includes("/job")) ||
        (path.includes("/cookie") && !path.includes("/job")) ||
        (path.includes("/terms") && !path.includes("/job"));

      // URL-level job indicators override non-job route classification
      const hasExplicitJobUrlParam =
        urlStr.includes("currentJobId=") ||
        urlStr.includes("jk=") ||
        urlStr.includes("gh_jid=") ||
        urlStr.includes("JobId=") ||
        /\/jobs\/view\/\d+/.test(urlStr) ||
        /\/jobs\/\d+/.test(path);

      if (isDefinitelyNotJobRoute && !hasExplicitJobUrlParam) {
        diagnostics.reason = "Non-job platform route";
        _logDebug(diagnostics);
        return diagnostics;
      }

      // 3. ADAPTER RESOLUTION
      //    First try specific adapter from registry. If none found, fall back to generic adapter.
      const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
      let adapter = null;

      if (registry) {
        adapter = registry.getAdapterForUrl(urlStr);
      }

      // If registry is missing or no specific adapter matched, use generic adapter as fallback
      if (!adapter && window.__CAREERPILOT_GENERIC_ADAPTER__) {
        adapter = window.__CAREERPILOT_GENERIC_ADAPTER__;
      }

      if (!adapter) {
        // Genuine unavailability — scripts may not have loaded yet
        diagnostics.reason = "Adapter registry not yet initialized";
        _logDebug(diagnostics);
        return diagnostics;
      }

      diagnostics.adapter = adapter.sourceName || "generic";

      if (adapter.category === "COLLEGE_PLACEMENT_PORTAL") {
        diagnostics.contextType = "college_opportunity";
      } else if (
        adapter.category === "JOB_PORTAL" ||
        adapter.category === "ATS" ||
        adapter.category === "COMPANY_CAREER_SITE"
      ) {
        diagnostics.contextType = "job";
      }

      // 4. ADAPTER isJobPage CHECK
      const adapterConfirmedJobPage = adapter.isJobPage(doc, urlStr);
      diagnostics.adapterConfirmed = adapterConfirmedJobPage;

      if (!adapterConfirmedJobPage && !isManualInspect) {
        diagnostics.reason = "Page is not an active job listing";
        _logDebug(diagnostics);
        return diagnostics;
      }

      // 5. EXTRACT DETAILS & CALCULATE CONFIDENCE SCORE (evidence aggregation)
      const extracted = adapter.extract(doc);
      let score = 0;

      // JSON-LD JobPosting schema (+35)
      const jsonLdJobPosting = _detectJsonLdJobPosting(doc);
      if (jsonLdJobPosting) {
        score += 35;
        diagnostics.signals.push("JSON-LD JobPosting schema (+35)");
        // Augment extracted with JSON-LD data where extraction was empty
        if (!extracted.title && jsonLdJobPosting.title) extracted.title = jsonLdJobPosting.title;
        if (!extracted.company && jsonLdJobPosting.hiringOrganization?.name) extracted.company = jsonLdJobPosting.hiringOrganization.name;
        if (!extracted.location && jsonLdJobPosting.jobLocation?.address?.addressLocality) extracted.location = jsonLdJobPosting.jobLocation.address.addressLocality;
        if (!extracted.description && jsonLdJobPosting.description) extracted.description = jsonLdJobPosting.description.substring(0, 2000);
      }

      // URL structure evidence (+25)
      const urlIsStrongJobSignal =
        /\/jobs\/view\/\d+/.test(urlStr) ||
        /\/viewjob/.test(urlStr) ||
        /[?&]jk=/.test(urlStr) ||
        /[?&]gh_jid=/.test(urlStr) ||
        /[?&]JobId=/i.test(urlStr) ||
        /\/jobs\/\d+/.test(path) ||
        /\/job-details/.test(path) ||
        /\/job_details/.test(path) ||
        /\/career-details/.test(path) ||
        /\/position\/[a-z0-9_-]+/i.test(path) ||
        /\/vacancy\/[a-z0-9_-]+/i.test(path) ||
        adapter.category === "ATS";

      if (urlIsStrongJobSignal) {
        score += 25;
        diagnostics.signals.push("Strong job URL pattern (+25)");
      }

      // OpenGraph title/description as fallback for title/company (+5 each)
      if (!extracted.title) {
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
        if (ogTitle && ogTitle.length >= 3) {
          extracted.title = ogTitle.split(" - ")[0].split(" | ")[0].trim();
        }
      }
      if (!extracted.company) {
        const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
        if (ogSite) extracted.company = ogSite.trim();
      }

      // Document title fallback for empty title — very reliable for known portals
      if (!extracted.title) {
        const docTitle = doc.title || "";
        // Typical format: "Job Title at Company | LinkedIn", "Job Title - Company", etc.
        const titleParts = docTitle.split(/\s+[\-\|@at]+\s+/i);
        if (titleParts.length >= 1 && titleParts[0].length >= 3) {
          const candidate = titleParts[0].trim();
          const genericTitles = /^(home|login|search|jobs|careers|welcome|index|linkedin|indeed|glassdoor|naukri)$/i;
          if (!genericTitles.test(candidate)) {
            extracted.title = candidate;
          }
        }
        // Extract company from doc title if still missing
        if (!extracted.company && titleParts.length >= 2) {
          const companyCand = titleParts[1].replace(/\s*\|.*$/, "").trim();
          if (companyCand.length >= 2) extracted.company = companyCand;
        }
      }

      // Title signal (+20)
      const titleIsValid =
        extracted.title &&
        extracted.title.length >= 3 &&
        !/^(home|login|search|jobs|careers|welcome|index|untitled role)$/i.test(extracted.title);
      if (titleIsValid) {
        score += 20;
        diagnostics.signals.push(`Valid job title: "${extracted.title}" (+20)`);
      }

      // Company signal (+10)
      const companyIsValid =
        extracted.company &&
        extracted.company.length >= 2 &&
        !/^(unknown|company|n\/a)$/i.test(extracted.company);
      if (companyIsValid) {
        score += 10;
        diagnostics.signals.push(`Valid company: "${extracted.company}" (+10)`);
      }

      // Description signal (+20)
      if (extracted.description && extracted.description.length >= 80) {
        score += 20;
        diagnostics.signals.push("Comprehensive job description (+20)");
      }

      // Location signal (+5)
      if (extracted.location && extracted.location.length >= 2) {
        score += 5;
        diagnostics.signals.push("Location metadata (+5)");
      }

      // Apply / CTA button signal (+15)
      const applyBtn = adapter.getApplyButton ? adapter.getApplyButton(doc) : null;
      if (applyBtn) {
        score += 15;
        diagnostics.signals.push("Apply/CTA button found (+15)");
      }

      // Negative signals: generic/non-job pages (-50)
      const negativePageTitle =
        /(privacy policy|cookie policy|terms of service|terms and conditions)/i.test(extracted.title || doc.title);
      const negativePagePath =
        /(privacy|cookie|terms|conditions)/i.test(path) && !/job/.test(path);
      if (negativePageTitle || negativePagePath) {
        score -= 50;
        diagnostics.signals.push("Negative: generic non-job page (-50)");
      }

      diagnostics.confidence = score;
      diagnostics.confidenceScore = score;
      diagnostics.extracted = extracted;

      // 6. ACTIVATION DECISION
      const threshold = isManualInspect ? MANUAL_INSPECT_THRESHOLD : CONFIDENCE_ACTIVATION_THRESHOLD;

      if (score >= threshold) {
        // Full confidence — activate
        diagnostics.shouldActivate = true;
        diagnostics.decision = "ACTIVATE";
        diagnostics.reason = `Job detected with confidence ${score}`;
      } else if (adapterConfirmedJobPage && !isManualInspect && score >= 20) {
        // Adapter confirmed it's a job page, URL may have fired, but DOM content not loaded yet.
        // Signal caller to retry after DOM settles.
        diagnostics.decision = "RETRY_PENDING";
        diagnostics.reason = "Adapter confirmed job page — awaiting DOM content";
      } else {
        diagnostics.shouldActivate = false;
        diagnostics.decision = "SKIP";
        // Internal reason only — never shown to user
        diagnostics.reason = "Insufficient evidence to confirm job page";
      }

      _logDebug(diagnostics);
      return diagnostics;

    } catch (err) {
      diagnostics.decision = "SKIP";
      diagnostics.reason = `Evaluation error: ${err.message}`;
      _logDebug(diagnostics);
      return diagnostics;
    }
  }

  function _detectJsonLdJobPosting(doc) {
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        if (!script.textContent) continue;
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
            return item;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function _logDebug(diag) {
    // Debug logging — never shown to end users
    if (console && console.debug) {
      console.debug("[CareerPilot Debug]", {
        hostname: diag.domain,
        adapter: diag.adapter,
        adapterConfirmed: diag.adapterConfirmed,
        confidence: diag.confidence,
        decision: diag.decision,
        signals: diag.signals,
      });
    }
  }

  window.__CAREERPILOT_ACTIVATION_ENGINE__ = {
    CONFIDENCE_ACTIVATION_THRESHOLD,
    evaluateActivation,
  };
})();
