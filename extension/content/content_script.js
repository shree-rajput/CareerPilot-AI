/**
 * CareerPilot AI — Central Content Script
 * Enforces Fail-Closed activation, Circuit Breaker safeguards, SPA navigation observers,
 * and Central Activation Engine decision processing.
 *
 * Decision handling:
 *   ACTIVATE      — Show overlay immediately.
 *   RETRY_PENDING — Adapter confirmed job page but DOM not yet rendered. Watch DOM and retry.
 *   SKIP          — Remain silent, remove any stale overlay.
 */

(function () {
  if (window.__CAREERPILOT_EXTRACTOR_INITIALIZED__) {
    return;
  }
  window.__CAREERPILOT_EXTRACTOR_INITIALIZED__ = true;

  let currentAnalysisInFlight = false;
  let lastEvaluatedUrl = "";
  let navDebounceTimer = null;
  let retryObserver = null;   // MutationObserver used for RETRY_PENDING
  let retryCount = 0;
  const MAX_RETRIES = 4;
  const RETRY_INTERVAL_MS = 900;

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

  // ─── Retry Observer ───────────────────────────────────────────────────────────
  // Called when activationEngine returns RETRY_PENDING.
  // Watches for DOM content to populate, then re-runs activation pipeline.
  function startDomRetryObserver() {
    stopDomRetryObserver();
    retryCount = 0;

    // Schedule timed retries — more reliable than MutationObserver on SPAs
    // that batch-render content.
    function scheduleRetry() {
      if (retryCount >= MAX_RETRIES) {
        stopDomRetryObserver();
        return;
      }
      retryCount++;
      setTimeout(async () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastEvaluatedUrl) {
          // URL changed during retry window — abort
          stopDomRetryObserver();
          return;
        }

        const engine = window.__CAREERPILOT_ACTIVATION_ENGINE__;
        if (!engine) { stopDomRetryObserver(); return; }

        const evaluation = await engine.evaluateActivation(document, currentUrl);

        if (evaluation.decision === "ACTIVATE") {
          stopDomRetryObserver();
          await activateWithEvaluation(evaluation, currentUrl);
        } else if (evaluation.decision === "RETRY_PENDING") {
          // Not ready yet — schedule another retry
          scheduleRetry();
        } else {
          // Confident SKIP — stop retrying
          stopDomRetryObserver();
        }
      }, RETRY_INTERVAL_MS * retryCount);
    }

    scheduleRetry();
  }

  function stopDomRetryObserver() {
    retryCount = 0;
    if (retryObserver) {
      retryObserver.disconnect();
      retryObserver = null;
    }
  }

  // ─── Activation Pipeline ─────────────────────────────────────────────────────
  async function runActivationPipeline() {
    const currentUrl = window.location.href;

    // Circuit Breaker
    if (window.__CAREERPILOT_CIRCUIT_BREAKER__) {
      if (!window.__CAREERPILOT_CIRCUIT_BREAKER__.canProcess()) {
        console.warn("[CareerPilot] Circuit breaker active. Suppressing execution.");
        if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
        return;
      }
    }

    // Gmail — never run job detection on Gmail tabs
    if (window.location.hostname.includes("mail.google.com")) {
      if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      return;
    }

    const engine = window.__CAREERPILOT_ACTIVATION_ENGINE__;
    if (!engine) return;

    const evaluation = await engine.evaluateActivation(document, currentUrl);

    if (evaluation.decision === "ACTIVATE") {
      stopDomRetryObserver();
      await activateWithEvaluation(evaluation, currentUrl);
    } else if (evaluation.decision === "RETRY_PENDING") {
      // Adapter confirmed job page but DOM hasn't rendered yet — start retry loop
      startDomRetryObserver();
    } else {
      // SKIP — stay silent
      stopDomRetryObserver();
      if (window.__CAREERPILOT_INTENT_OVERLAY__) {
        window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      }
    }
  }

  async function activateWithEvaluation(evaluation, currentUrl) {
    // Record activation in circuit breaker
    if (window.__CAREERPILOT_CIRCUIT_BREAKER__) {
      if (!window.__CAREERPILOT_CIRCUIT_BREAKER__.recordActivation()) return;
    }

    const jobData = evaluation.extracted;
    // Require at minimum a title OR a canonical URL to show overlay
    if (!jobData || (!jobData.title && !jobData.url && !jobData.externalJobId)) {
      if (window.__CAREERPILOT_INTENT_OVERLAY__) window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
      return;
    }

    const canonicalUrl = sanitizeJobUrl(jobData.url || currentUrl);

    // Show overlay in EXTRACTING state immediately so user gets feedback
    if (window.__CAREERPILOT_INTENT_OVERLAY__) {
      window.__CAREERPILOT_INTENT_OVERLAY__.renderOverlayState({
        state: "EXTRACTING",
        jobContext: jobData,
      });
    }

    // Notify background of tab context
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

    // Deduplicated job analysis
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
          // Background unavailable — show READY state anyway so user can still save
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
            if (response?.category === "AUTH" || response?.error === "AUTH_REQUIRED") {
              reject({ type: "AUTH_REQUIRED", userMessage: response?.userMessage || "Please connect to CareerPilot." });
            } else {
              reject({ userMessage: response?.userMessage || "Failed to save application." });
            }
          }
        }
      );
    });
  }

  function handleIgnoreAction() {
    chrome.runtime.sendMessage({ type: "DISMISS_APPLICATION_INTENT" });
  }

  // ─── SPA Navigation Observer ──────────────────────────────────────────────────
  function handleUrlOrStateChange() {
    const currentUrl = window.location.href;
    if (currentUrl === lastEvaluatedUrl) return;

    // Stop any in-progress retry from the previous URL
    stopDomRetryObserver();
    currentAnalysisInFlight = false;

    // Clear overlay and tab context for previous page
    if (window.__CAREERPILOT_INTENT_OVERLAY__) {
      window.__CAREERPILOT_INTENT_OVERLAY__.removeOverlay();
    }
    try {
      chrome.runtime.sendMessage({
        type: "SET_TAB_JOB_CONTEXT",
        payload: { jobContext: null }
      });
    } catch(e) {}

    lastEvaluatedUrl = currentUrl;
    runActivationPipeline();
  }

  function observeSpaAndDomChanges() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
      origPush.apply(this, args);
      setTimeout(handleUrlOrStateChange, 100);
    };

    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      setTimeout(handleUrlOrStateChange, 100);
    };

    window.addEventListener("popstate", () => setTimeout(handleUrlOrStateChange, 100));
    window.addEventListener("hashchange", () => setTimeout(handleUrlOrStateChange, 100));

    // Gmail uses its own observer — skip MutationObserver on Gmail
    if (window.location.hostname.includes("mail.google.com")) return;

    const observer = new MutationObserver((mutations) => {
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
      }, 600);
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  observeSpaAndDomChanges();

  // ─── Gmail Pipeline ───────────────────────────────────────────────────────────
  let lastGmailMsgId = "";
  let gmailTimer = null;

  function observeGmailEvents() {
    if (!window.location.hostname.includes("mail.google.com")) return;

    function triggerGmailExtraction() {
      if (!window.__CAREERPILOT_GMAIL_EXTRACTOR__?.isGmail()) return;
      const msg = window.__CAREERPILOT_GMAIL_EXTRACTOR__.extractOpenedGmailMessage();
      if (!msg || !msg.messageId || msg.messageId === lastGmailMsgId) return;

      lastGmailMsgId = msg.messageId;

      chrome.runtime.sendMessage({ type: "PROCESS_EMAIL_EVENT", payload: msg }, (res) => {
        if (chrome.runtime.lastError) return;

        if (res?.success && res.data && window.__CAREERPILOT_GMAIL_OVERLAY__) {
          window.__CAREERPILOT_GMAIL_OVERLAY__.renderGmailOverlay({
            response: res.data,
            onConfirm: (response) => {
              // User confirmed a suggested status update
              if (response?.application?._id && response?.classified?.detectedStatus) {
                chrome.runtime.sendMessage({
                  type: "UPDATE_APPLICATION_STATUS",
                  payload: {
                    applicationId: response.application._id,
                    targetStatus: response.classified.detectedStatus,
                    source: "gmail_user_confirmation",
                    evidence: response.classified.evidenceSnippet || "",
                  }
                });
              }
            },
            onUndo: (response) => {
              // Undo status update — revert to previous status
              if (response?.application?._id && response?.previousStatus) {
                chrome.runtime.sendMessage({
                  type: "UPDATE_APPLICATION_STATUS",
                  payload: {
                    applicationId: response.application._id,
                    targetStatus: response.previousStatus,
                    source: "gmail_undo",
                    evidence: "User undid email event status update",
                  }
                });
              }
            },
            onIgnore: () => {
              // Record that this messageId was deliberately ignored
              if (msg.messageId) {
                chrome.storage.local.get(["ignoredEmailIds"], (res) => {
                  const ignored = res.ignoredEmailIds || [];
                  if (!ignored.includes(msg.messageId)) {
                    ignored.push(msg.messageId);
                    chrome.storage.local.set({ ignoredEmailIds: ignored.slice(-200) });
                  }
                });
              }
            },
            onAddUntracked: (data) => {
              console.log("[CareerPilot] Application created from untracked email:", data?.application?.company || data?.application?.role || data);
            }
          });
        }
      });
    }

    // Gmail routing is hash-based
    window.addEventListener("hashchange", () => {
      if (gmailTimer) clearTimeout(gmailTimer);
      gmailTimer = setTimeout(triggerGmailExtraction, 1500);
    });

    // Handle popstate (some Gmail views)
    window.addEventListener("popstate", () => {
      if (gmailTimer) clearTimeout(gmailTimer);
      gmailTimer = setTimeout(triggerGmailExtraction, 1500);
    });

    // Initial trigger for when extension loads while email is already open
    setTimeout(triggerGmailExtraction, 2000);
  }

  // ─── Apply Button Observer ────────────────────────────────────────────────────
  function setupApplyButtonClickListener() {
    if (window.location.hostname.includes("mail.google.com")) return;

    document.addEventListener("click", (e) => {
      const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
      const adapter = registry ? registry.getAdapterForUrl(window.location.href) : null;
      if (!adapter) return;

      const applyBtn = adapter.getApplyButton ? adapter.getApplyButton(document) : null;
      if (!applyBtn) return;

      const target = e.target;
      if (!applyBtn.contains(target) && target !== applyBtn) return;

      const extracted = adapter.extract(document);
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
          source: "extension_apply_click",
          evidence: "User clicked Apply button"
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
    }, true);
  }

  function checkSubmissionEvidence() {
    if (window.location.hostname.includes("mail.google.com")) return;

    chrome.runtime.sendMessage({ type: "GET_TAB_JOB_CONTEXT" }, (res) => {
      if (chrome.runtime.lastError || !res?.success || !res?.jobContext) return;
      const ctx = res.jobContext;
      if (ctx.state !== "APPLY_STARTED" && ctx.status !== "apply_started") return;

      const registry = window.__CAREERPILOT_PORTAL_REGISTRY__;
      const adapter = registry ? registry.getAdapterForUrl(window.location.href) : null;
      const isSubmitted = adapter?.detectSubmissionConfirmation
        ? adapter.detectSubmissionConfirmation(document)
        : false;

      if (isSubmitted) {
        chrome.runtime.sendMessage({
          type: "CAPTURE_JOB_REQUEST",
          payload: {
            company: ctx.company,
            role: ctx.role,
            jobUrl: ctx.url || window.location.href,
            targetStatus: "applied",
            source: "extension_submission_detected",
            evidence: "Submission confirmation detected in DOM"
          }
        });
      }
    });
  }

  observeGmailEvents();
  setupApplyButtonClickListener();

  // Initial activation after DOM is ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => {
      runActivationPipeline();
      checkSubmissionEvidence();
    }, 400);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        runActivationPipeline();
        checkSubmissionEvidence();
      }, 400);
    });
  }

  // ─── Runtime Message Listener ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

          const evaluation = await engine.evaluateActivation(
            document,
            window.location.href,
            { isManualInspect: request.type === "ON_DEMAND_INSPECT" }
          );

          const isJob =
            evaluation.decision === "ACTIVATE" ||
            evaluation.decision === "RETRY_PENDING" ||
            evaluation.confidenceScore >= 40;

          sendResponse({
            ok: true,
            status: isJob ? "JOB_DETECTED" : "JOB_NOT_DETECTED",
            isJobPage: isJob,
            data: evaluation.extracted || null,
            confidence: evaluation.confidenceScore >= 75 ? "HIGH" : evaluation.confidenceScore >= 50 ? "MEDIUM" : "LOW",
            confidenceScore: evaluation.confidenceScore,
            signals: evaluation.signals,
          });
        } catch (e) {
          sendResponse({ ok: false, code: "INSPECTION_FAILED", isJobPage: false });
        }
      })();
      return true;
    }

    return true;
  });
})();
