/**
 * CareerPilot AI — Central Content Script
 * Enforces Fail-Closed activation, Circuit Breaker safeguards, SPA navigation observers,
 * and Central Activation Engine decision processing.
 */

(function () {
  if (window.__CAREERPILOT_EXTRACTOR_INITIALIZED__) {
    return;
  }
  window.__CAREERPILOT_EXTRACTOR_INITIALIZED__ = true;

  let currentAnalysisInFlight = false;
  let lastEvaluatedUrl = "";
  let lastEvaluatedJobId = "";
  let navDebounceTimer = null;

  function cleanText(str) {
    if (!str || typeof str !== "string") return "";
    return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\s+/g, " ").trim();
  }

  function sanitizeJobUrl(rawUrl = "") {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    try {
      const url = new URL(rawUrl);
      const trackingParams = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "refId", "trackingId", "trk", "currentJobId", "fbclid", "gclid", "gh_src"
      ];
      trackingParams.forEach((p) => url.searchParams.delete(p));
      return url.toString();
    } catch (e) {
      return rawUrl.trim();
    }
  }

  // 1. Central Page Orchestrator & Activation Pipeline
  async function runActivationPipeline() {
    const currentUrl = window.location.href;

    // Check Circuit Breaker
    if (window.__CAREERPILOT_CIRCUIT_BREAKER__) {
      if (!window.__CAREERPILOT_CIRCUIT_BREAKER__.canProcess()) {
        console.warn("[CareerPilot] Circuit breaker active. Suppressing execution for current tab.");
        if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
        return;
      }
    }

    // Gmail Tab Check -> Delegate to Gmail Observer
    if (window.location.hostname.includes("mail.google.com")) {
      if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      return;
    }

    // Run Central Activation Engine Evaluation
    const engine = window.__CAREERPILOT_ACTIVATION_ENGINE__;
    if (!engine) return;

    const evaluation = await engine.evaluateActivation(document, currentUrl);

    // Development diagnostic logging
    if (console && console.debug) {
      console.debug(`[CareerPilot] Activation Evaluation:`, {
        domain: evaluation.domain,
        adapter: evaluation.adapterName,
        confidenceScore: evaluation.confidenceScore,
        decision: evaluation.decision,
        reason: evaluation.reason,
      });
    }

    // FAIL CLOSED: If decision is SKIP -> Remain SILENT & Remove Stale Overlay
    if (evaluation.decision !== "ACTIVATE") {
      if (window.__CAREERPILOT_INTENT_OVERLAY__) {
        window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      }
      return;
    }

    // Record Activation in Circuit Breaker
    if (window.__CAREERPILOT_CIRCUIT_BREAKER__) {
      if (!window.__CAREERPILOT_CIRCUIT_BREAKER__.recordActivation()) return;
    }

    const jobData = evaluation.extracted;
    if (!jobData || !jobData.title || !jobData.company) {
      if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      return;
    }

    const canonicalUrl = sanitizeJobUrl(jobData.url || currentUrl);

    // STEP 1: Render Overlay in EXTRACTING state
    if (window.__CAREERPILOT_INTENT_OVERLAY__) {
      window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
        state: "EXTRACTING",
        jobContext: jobData,
      });
    }

    // STEP 2: Send tab context to Background Service Worker
    chrome.runtime.sendMessage({
      type: "SET_TAB_JOB_CONTEXT",
      payload: {
        jobContext: {
          url: canonicalUrl,
          company: jobData.company,
          role: jobData.title,
          location: jobData.location,
          description: jobData.description,
          sourcePlatform: jobData.source || "generic",
          detectedAt: new Date().toISOString(),
          state: "JOB_VIEWED",
        },
      },
    });

    // STEP 3: Deduplicated Job Analysis API Request
    if (currentAnalysisInFlight) return;
    currentAnalysisInFlight = true;

    if (window.__CAREERPILOT_INTENT_OVERLAY__) {
      window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
        state: "ANALYZING",
        jobContext: jobData,
      });
    }

    chrome.runtime.sendMessage(
      {
        type: "ANALYZE_JOB",
        payload: {
          company: jobData.company,
          title: jobData.title,
          role: jobData.title,
          url: canonicalUrl,
          externalJobId: jobData.externalJobId,
          source: jobData.source || "extension",
        },
      },
      (res) => {
        currentAnalysisInFlight = false;

        if (chrome.runtime.lastError) {
          if (window.__CAREERPILOT_INTENT_OVERLAY__) {
            window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
              state: "READY",
              jobContext: jobData,
              onConfirm: handleTrackingConfirm,
              onIgnore: handleIgnoreAction,
            });
          }
          return;
        }

        const data = res?.data;

        if (!data || !data.isAuthenticated) {
          if (window.__CAREERPILOT_INTENT_OVERLAY__) {
            window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
              state: "UNAUTHENTICATED",
              jobContext: jobData,
            });
          }
          return;
        }

        if (window.__CAREERPILOT_INTENT_OVERLAY__) {
          window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
            state: "READY",
            jobContext: jobData,
            matchData: data,
            onConfirm: handleTrackingConfirm,
            onIgnore: handleIgnoreAction,
            onRetry: runActivationPipeline,
          });
        }
      }
    );
  }

  function handleTrackingConfirm(confirmedContext) {
    return new Promise((resolve, reject) => {
      const canonicalUrl = sanitizeJobUrl(confirmedContext.url || window.location.href);

      chrome.runtime.sendMessage(
        {
          type: "CAPTURE_JOB_REQUEST",
          payload: {
            company: confirmedContext.company,
            role: confirmedContext.role || confirmedContext.title,
            jobUrl: canonicalUrl,
            jobDescription: confirmedContext.description || "",
            targetStatus: "saved",
            source: "extension_auto_overlay",
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject({ userMessage: "We couldn't track this application right now." });
            return;
          }
          if (response?.success) {
            chrome.runtime.sendMessage({
              type: "SET_TAB_JOB_CONTEXT",
              payload: {
                jobContext: {
                  url: canonicalUrl,
                  company: confirmedContext.company,
                  role: confirmedContext.role || confirmedContext.title,
                  state: "APPLICATION_CREATED",
                },
              },
            });
            resolve(response.data);
          } else {
            reject({ userMessage: response?.userMessage || "Failed to save application." });
          }
        }
      );
    });
  }

  function handleIgnoreAction() {
    chrome.runtime.sendMessage({
      type: "DISMISS_APPLICATION_INTENT",
    });
  }

  // 2. SPA Navigation & Debounced DOM Observer
  function handleUrlOrStateChange() {
    const currentUrl = window.location.href;
    if (currentUrl === lastEvaluatedUrl) return;

    lastEvaluatedUrl = currentUrl;
    runActivationPipeline();
  }

  function observeSpaAndDomChanges() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
      origPush.apply(this, args);
      setTimeout(handleUrlOrStateChange, 50);
    };

    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      setTimeout(handleUrlOrStateChange, 50);
    };

    window.addEventListener("popstate", () => setTimeout(handleUrlOrStateChange, 50));
    window.addEventListener("hashchange", () => setTimeout(handleUrlOrStateChange, 50));

    // Gmail has its own observeGmailEvents observer - skip general observer on Gmail
    if (window.location.hostname.includes("mail.google.com")) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      // Filter out mutations caused by CareerPilot's own overlay host
      const isInternalMutation = mutations.every((m) => {
        const targetId = m.target?.id || m.target?.parentElement?.id || "";
        return targetId.includes("careerpilot");
      });

      if (isInternalMutation) return;

      if (window.__CAREERPILOT_CIRCUIT_BREAKER__) {
        if (!window.__CAREERPILOT_CIRCUIT_BREAKER__.recordMutation()) return;
      }

      if (navDebounceTimer) clearTimeout(navDebounceTimer);
      navDebounceTimer = setTimeout(() => {
        if (window.location.href !== lastEvaluatedUrl) {
          handleUrlOrStateChange();
        }
      }, 500);
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  observeSpaAndDomChanges();

  // 3. Gmail Pipeline Setup
  let lastGmailMsgId = "";
  let gmailTimer = null;

  function observeGmailEvents() {
    if (!window.location.hostname.includes("mail.google.com")) return;

    const observer = new MutationObserver(() => {
      if (gmailTimer) clearTimeout(gmailTimer);
      gmailTimer = setTimeout(() => {
        if (!window.__CAREERPILOT_GMAIL_EXTRACTOR__?.isGmail()) return;
        const msg = window.__CAREERPILOT_GMAIL_EXTRACTOR__.extractOpenedGmailMessage();
        if (!msg || !msg.messageId || msg.messageId === lastGmailMsgId) return;

        lastGmailMsgId = msg.messageId;

        chrome.runtime.sendMessage({ type: "PROCESS_EMAIL_EVENT", payload: msg }, (res) => {
          if (chrome.runtime.lastError) return;
          if (res?.success && res.data && window.__CAREERPILOT_GMAIL_OVERLAY__) {
            window.__CAREERPILOT_GMAIL_OVERLAY__.renderGmailOverlay({
              response: res.data,
              onConfirm: () => {},
              onUndo: () => {},
              onIgnore: () => {},
            });
          }
        });
      }, 1000);
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // 4. DOM Apply Button Click Observer & Submission Evidence Monitor
  function setupApplyButtonClickListener() {
    if (window.location.hostname.includes("mail.google.com")) return;

    document.addEventListener("click", (e) => {
      const applyBtn = typeof safeFindApplyButton === "function" ? safeFindApplyButton(document) : null;
      if (!applyBtn) return;

      const target = e.target;
      if (applyBtn.contains(target) || target === applyBtn) {
        const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
        const adapter = registry ? registry.getAdapterForUrl(window.location.href) : null;
        const extracted = adapter ? adapter.extract(document) : {};

        const company = extracted.company || "Company";
        const role = extracted.title || "Position";
        const canonicalUrl = sanitizeJobUrl(extracted.url || window.location.href);

        chrome.runtime.sendMessage({
          type: "CAPTURE_JOB_REQUEST",
          payload: {
            company,
            role,
            jobUrl: canonicalUrl,
            jobDescription: extracted.description || "",
            targetStatus: "apply_started",
            source: "extension_auto_overlay",
            evidence: "Candidate clicked Apply button in DOM"
          }
        });

        chrome.runtime.sendMessage({
          type: "SET_TAB_JOB_CONTEXT",
          payload: {
            jobContext: {
              url: canonicalUrl,
              company,
              role,
              state: "APPLY_STARTED",
              status: "apply_started",
              startedAt: Date.now()
            }
          }
        });
      }
    }, true);
  }

  function checkSubmissionEvidence() {
    if (window.location.hostname.includes("mail.google.com")) return;

    chrome.runtime.sendMessage({ type: "GET_TAB_JOB_CONTEXT" }, (res) => {
      if (chrome.runtime.lastError || !res?.success || !res?.jobContext) return;
      const ctx = res.jobContext;

      if (ctx.state === "APPLY_STARTED" || ctx.status === "apply_started") {
        const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
        const adapter = registry ? registry.getAdapterForUrl(window.location.href) : null;
        const isSubmitted = adapter?.detectSubmissionConfirmation ? adapter.detectSubmissionConfirmation(document) : false;

        if (isSubmitted) {
          chrome.runtime.sendMessage({
            type: "CAPTURE_JOB_REQUEST",
            payload: {
              company: ctx.company,
              role: ctx.role,
              jobUrl: ctx.url || window.location.href,
              targetStatus: "applied",
              source: "extension_auto_overlay",
              evidence: "Strong submission evidence detected in DOM"
            }
          });
        }
      }
    });
  }

  observeGmailEvents();
  setupApplyButtonClickListener();

  // Initial trigger after DOM ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => {
      runActivationPipeline();
      checkSubmissionEvidence();
    }, 300);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        runActivationPipeline();
        checkSubmissionEvidence();
      }, 300);
    });
  }

  // 4. Runtime Message Listener (Unified Messaging Protocol)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const isGmail = window.location.hostname.includes("mail.google.com");

    if (request.type === "PING") {
      sendResponse({ ok: true, status: "PONG" });
      return true;
    }

    if (request.type === "GET_PAGE_CONTEXT") {
      const context = isGmail ? "GMAIL_EMAIL" : "JOB_POSTING";
      sendResponse({ ok: true, context });
      return true;
    }

    if (request.type === "GET_GMAIL_EVENT") {
      const emailData = window.__CAREERPILOT_GMAIL_EXTRACTOR__?.extractOpenedGmailMessage() || null;
      sendResponse({ ok: true, emailData });
      return true;
    }

    if (request.type === "GET_JOB_DATA" || request.type === "ON_DEMAND_INSPECT") {
      (async () => {
        try {
          const engine = window.__CAREERPILOT_ACTIVATION_ENGINE__;
          if (!engine) {
            sendResponse({ ok: false, code: "ENGINE_UNAVAILABLE", isJobPage: false, reason: "Activation engine not initialized." });
            return;
          }

          const evaluation = await engine.evaluateActivation(document, window.location.href);

          if (request.type === "ON_DEMAND_INSPECT") {
            const isJob = evaluation.confidenceScore >= 40 || Boolean(evaluation.extracted && evaluation.extracted.title && evaluation.extracted.company);
            sendResponse({
              ok: true,
              status: isJob ? "JOB_DETECTED" : "JOB_NOT_DETECTED",
              isJobPage: isJob,
              data: evaluation.extracted || null,
              confidence: evaluation.confidenceScore >= 75 ? "HIGH" : evaluation.confidenceScore >= 50 ? "MEDIUM" : "LOW",
              confidenceScore: evaluation.confidenceScore,
              reason: evaluation.reason,
              signals: evaluation.signals,
            });
            return;
          }

          const isJob = evaluation.decision === "ACTIVATE" || evaluation.confidenceScore >= 60;
          sendResponse({
            ok: true,
            status: isJob ? "JOB_DETECTED" : "JOB_NOT_DETECTED",
            isJobPage: isJob,
            data: isJob ? evaluation.extracted : null,
            confidence: evaluation.confidenceScore >= 75 ? "HIGH" : evaluation.confidenceScore >= 50 ? "MEDIUM" : "LOW",
            confidenceScore: evaluation.confidenceScore,
            reason: evaluation.reason,
            signals: evaluation.signals,
          });
        } catch (e) {
          sendResponse({ ok: false, code: "INSPECTION_FAILED", isJobPage: false, reason: e.message });
        }
      })();
      return true;
    }

    if (request.type === "TRIGGER_INTENT_TOAST") {
      runActivationPipeline();
      sendResponse({ ok: true });
      return true;
    }

    return true;
  });
})();
