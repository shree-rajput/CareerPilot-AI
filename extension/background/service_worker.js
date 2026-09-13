/**
 * CareerPilot AI Extension Service Worker (Manifest V3)
 * Provides event-driven background orchestration, state persistence,
 * offline action outbox retry queue, and secure API client calls.
 */
import { apiRequest } from "./apiClient.js";
import { ExtensionAuthManager } from "./ExtensionAuthManager.js";
const DEFAULT_API_URL = "http://localhost:5000/api";
const DEFAULT_APP_URL = "http://localhost:5173";

async function getApiConfig() {
  const result = await chrome.storage.local.get(["apiUrl", "appUrl", "token", "user"]);
  return {
    apiUrl: result.apiUrl || DEFAULT_API_URL,
    appUrl: result.appUrl || DEFAULT_APP_URL,
    token: result.token || "",
    user: result.user || null,
  };
}

// -----------------------------------------------------------------------------
// Offline Outbox Queue & Retry Engine
// -----------------------------------------------------------------------------
async function enqueueOutboxAction(actionType, payload) {
  const { outbox = [] } = await chrome.storage.local.get("outbox");
  const item = {
    id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: actionType,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  outbox.push(item);
  await chrome.storage.local.set({ outbox });
  return item;
}

async function processOutboxQueue() {
  const { outbox = [] } = await chrome.storage.local.get("outbox");
  if (!outbox || outbox.length === 0) return;

  const remaining = [];
  for (const item of outbox) {
    if (item.attempts >= 3) {
      console.warn("[CareerPilot Outbox] Dropping item after 3 failed attempts:", item);
      continue;
    }

    try {
      if (item.type === "CAPTURE_JOB_REQUEST" || item.type === "UPDATE_APPLICATION_STATUS") {
        await handleJobCapture(item.payload);
      } else if (item.type === "INGEST_JOB") {
        await handleJobIngestion(item.payload);
      } else if (item.type === "CREATE_APPLICATION_FROM_EMAIL") {
        await handleCreateFromEmail(item.payload);
      }
    } catch (err) {
      if (err.message?.includes("AUTH_REQUIRED") || err.message?.includes("SESSION_EXPIRED")) {
        // Stop processing on auth failures until re-authenticated
        remaining.push(item);
        break;
      }
      item.attempts += 1;
      remaining.push(item);
    }
  }

  await chrome.storage.local.set({ outbox: remaining });
}

// Check outbox periodically or on startup
chrome.runtime.onStartup?.addListener(() => {
  ExtensionAuthManager.initialize();
  processOutboxQueue();
});

// Also initialize on first load
ExtensionAuthManager.initialize();

const storageArea = chrome.storage?.session || chrome.storage?.local;

const TAB_CONTEXT_TTL_MS = 30 * 60 * 1000;

async function setTabJobContext(tabId, jobContext) {
  if (!tabId || !jobContext) return;
  const key = `tab_job_context_${tabId}`;
  const contextData = {
    ...jobContext,
    originatingTabId: tabId,
    startedAt: jobContext.startedAt || Date.now(),
    expiresAt: Date.now() + TAB_CONTEXT_TTL_MS
  };
  await storageArea.set({ [key]: contextData });
}

async function getTabJobContext(tabId) {
  if (!tabId) return null;
  const key = `tab_job_context_${tabId}`;
  const res = await storageArea.get(key);
  const context = res[key] || null;
  if (context && context.expiresAt && context.expiresAt < Date.now()) {
    await removeTabJobContext(tabId);
    return null;
  }
  return context;
}

async function removeTabJobContext(tabId) {
  if (!tabId) return;
  const key = `tab_job_context_${tabId}`;
  await storageArea.remove(key);
}

chrome.tabs?.onRemoved?.addListener((tabId) => {
  removeTabJobContext(tabId);
});

// -----------------------------------------------------------------------------
// Request Locks (Phase 22)
// -----------------------------------------------------------------------------
const activeLocks = {
  analyze: new Set(),
  capture: new Set()
};

// -----------------------------------------------------------------------------
// Main Runtime Message Listener
// -----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const targetTabId = request.tabId || sender?.tab?.id;

  if (request.type === "SET_TAB_JOB_CONTEXT") {
    setTabJobContext(targetTabId, request.payload?.jobContext)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "GET_TAB_JOB_CONTEXT") {
    getTabJobContext(targetTabId)
      .then((jobContext) => sendResponse({ success: true, jobContext }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "DISMISS_APPLICATION_INTENT") {
    getTabJobContext(targetTabId).then((current) => {
      if (current) {
        setTabJobContext(targetTabId, { ...current, state: "USER_IGNORED" });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === "ANALYZE_JOB") {
    const lockKey = `${request.payload.company}-${request.payload.title}-${targetTabId}`;
    if (activeLocks.analyze.has(lockKey)) {
      sendResponse({ success: false, error: "Analysis already in progress." });
      return true;
    }
    
    activeLocks.analyze.add(lockKey);
    handleJobAnalysis(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
      .finally(() => activeLocks.analyze.delete(lockKey));
    return true;
  }

  if (request.type === "INGEST_JOB") {
    handleJobIngestion(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => {
        if (err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch")) {
          enqueueOutboxAction("INGEST_JOB", request.payload);
        }
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.type === "CAPTURE_JOB_REQUEST" || request.type === "UPDATE_APPLICATION_STATUS") {
    const lockKey = `${request.payload.company}-${request.payload.role}-${targetTabId}`;
    if (activeLocks.capture.has(lockKey)) {
      sendResponse({ success: false, error: "Save operation already in progress." });
      return true;
    }

    activeLocks.capture.add(lockKey);
    handleJobCapture(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => {
        // err is now the normalized error object from apiClient.js
        if (err.retryable && (err.category === "NETWORK" || err.category === "TIMEOUT")) {
          enqueueOutboxAction("CAPTURE_JOB_REQUEST", request.payload);
        }
        
        sendResponse({
          success: false, 
          error: err.code || "UNKNOWN_ERROR",
          category: err.category || "UNKNOWN",
          userMessage: err.userMessage || err.message || "Capture failed."
        });
      })
      .finally(() => activeLocks.capture.delete(lockKey));
    return true;
  }

  if (request.type === "CREATE_APPLICATION_FROM_EMAIL") {
    handleCreateFromEmail(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "PROCESS_EMAIL_EVENT") {
    handleEmailEventProcessing(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "CHECK_AUTH" || request.type === "AUTH_GET_STATE") {
    ExtensionAuthManager.getAuthState()
      .then((authStatus) => sendResponse(authStatus))
      .catch(() => sendResponse({ isAuthenticated: false }));
    return true;
  }

  if (request.type === "SYNC_WEB_TOKEN") {
    ExtensionAuthManager.syncToken(request.token)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "SYNC_WEB_LOGOUT") {
    ExtensionAuthManager.logout()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "SET_AUTH_CODE" || request.type === "EXCHANGE_CODE") {
    exchangeAuthCode(request.code)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "DISCONNECT") {
    ExtensionAuthManager.logout().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// External messages from web app
chrome.runtime.onMessageExternal?.addListener((request, sender, sendResponse) => {
  if (request.type === "SET_AUTH_CODE") {
    exchangeAuthCode(request.code)
      .then((res) => {
        processOutboxQueue();
        sendResponse({ success: true, data: res });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// -----------------------------------------------------------------------------
// API Worker Callers
// -----------------------------------------------------------------------------
async function checkAuthStatus() {
  return await ExtensionAuthManager.getAuthState();
}

async function exchangeAuthCode(code) {
  const { apiUrl } = await getApiConfig();
  const response = await fetch(`${apiUrl}/auth/extension-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const resData = await response.json();

  if (!response.ok) {
    throw new Error(resData.message || "Failed to exchange authorization code.");
  }

  await ExtensionAuthManager.syncToken(resData.accessToken);
  return resData;
}

async function handleJobIngestion(jobPayload) {
  const { apiUrl, token } = await getApiConfig();

  if (!token) {
    throw new Error("AUTH_REQUIRED: Connect CareerPilot to save jobs.");
  }

  const response = await fetch(`${apiUrl}/jobs/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobPayload),
  });

  const resData = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      await ExtensionAuthManager.handleAuthFailure();
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired. Reconnect to proceed.");
    }
    throw new Error(resData.message || `Ingestion failed (${response.status})`);
  }

  return resData;
}

async function handleJobCapture(payload) {
  const { targetStatus, source = "extension_manual_action", evidence = "", note = "", company, role, jobUrl, confidence, detectionConfidence, jobDescription, contextType, detectionScore } = payload || {};

  const response = await apiRequest("/applications/external", {
    method: "POST",
    body: {
      company,
      role,
      jobUrl,
      jobDescription,
      status: targetStatus,
      confidence: detectionConfidence || confidence || "high",
      contextType: contextType || "UNKNOWN",
      detectionScore: detectionScore || 0,
      evidence: evidence || note,
      source: source || "chrome_extension",
    }
  });

  if (!response.success) {
    throw response.error;
  }

  return response.data;
}

async function handleCreateFromEmail(payload) {
  const { apiUrl, token } = await getApiConfig();

  if (!token) {
    throw new Error("AUTH_REQUIRED: Connect CareerPilot to add applications.");
  }

  const response = await fetch(`${apiUrl}/applications/create-from-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      await ExtensionAuthManager.handleAuthFailure();
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired.");
    }
    throw new Error(resData.message || `Failed to create application (${response.status})`);
  }

  return resData;
}

async function handleEmailEventProcessing(emailPayload) {
  const { apiUrl, token } = await getApiConfig();

  if (!token) {
    throw new Error("AUTH_REQUIRED: Connect CareerPilot to process email events.");
  }

  const response = await fetch(`${apiUrl}/applications/email-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(emailPayload),
  });

  const resData = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      await ExtensionAuthManager.handleAuthFailure();
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired.");
    }
    throw new Error(resData.message || `Email processing failed (${response.status})`);
  }

  // ─── Chrome Notification Delivery ───────────────────────────────────────
  // Deduplicate using messageId so same email never creates two Chrome notifications
  const messageId = emailPayload.messageId || "";
  const notifDedupeKey = `chrome-notif-email-${messageId}`;

  if (messageId) {
    const stored = await chrome.storage.local.get(notifDedupeKey);
    if (stored[notifDedupeKey]) {
      // Already delivered a Chrome notification for this message
      return resData;
    }
  }

  const { appUrl } = await getApiConfig();
  const classified = resData.classified || {};
  const app = resData.application || {};
  const company = app.company || classified.detectedCompany || "";
  const role = app.role || classified.detectedRole || "";

  let notifConfig = null;

  if (resData.status === "AUTOMATIC_UPDATE") {
    const eventType = classified.eventType || "";
    const emojiMap = {
      OA_INVITATION:          "🧪",
      INTERVIEW_INVITATION:   "🎯",
      INTERVIEW_SCHEDULED:    "🗓️",
      OFFER_RECEIVED:         "🎉",
      APPLICATION_REJECTED:   "📋",
      APPLICATION_RECEIVED:   "✅",
      APPLICATION_ADVANCED:   "📈",
    };
    const emoji = emojiMap[eventType] || "🔔";
    const titleMap = {
      OA_INVITATION:        `Assessment invitation — ${company}`,
      INTERVIEW_INVITATION: `Interview invitation — ${company}`,
      INTERVIEW_SCHEDULED:  `Interview confirmed — ${company}`,
      OFFER_RECEIVED:       `Offer received — ${company}`,
      APPLICATION_REJECTED: `Application update — ${company}`,
      APPLICATION_RECEIVED: `Application confirmed — ${company}`,
      APPLICATION_ADVANCED: `Application advancing — ${company}`,
    };
    const msgMap = {
      OA_INVITATION:        `${company} invited you to complete an assessment${role ? " for " + role : ""}.`,
      INTERVIEW_INVITATION: `${company} invited you for an interview${role ? " for " + role : ""}.`,
      INTERVIEW_SCHEDULED:  `Your interview${role ? " for " + role : ""} at ${company} is confirmed.`,
      OFFER_RECEIVED:       `You received an offer from ${company}${role ? " for " + role : ""}.`,
      APPLICATION_REJECTED: `${company} has updated your application status.`,
      APPLICATION_RECEIVED: `${company} confirmed your application${role ? " for " + role : ""}.`,
      APPLICATION_ADVANCED: `Your application at ${company} has moved forward.`,
    };
    notifConfig = {
      id: `email-auto-${messageId || Date.now()}`,
      title: (titleMap[eventType] || `CareerPilot — Application Update`),
      message: msgMap[eventType] || `Your application at ${company} has been updated.`,
      deepLink: `${appUrl}/applications/${app._id || ""}`,
      priority: ["OA_INVITATION", "INTERVIEW_INVITATION", "OFFER_RECEIVED"].includes(eventType) ? 2 : 1,
    };
  } else if (resData.status === "APPLICATION_RECOVERY" && resData.isRecoverable) {
    const c = classified.detectedCompany || "a company";
    const r = classified.detectedRole || "";
    notifConfig = {
      id: `email-recovery-${messageId || Date.now()}`,
      title: `🔔 Application found — ${c}`,
      message: `We found a confirmation that you applied to ${r ? r + " at " : ""}${c}. Add it to your Job Inbox.`,
      deepLink: `${appUrl}/applications?recover=1&company=${encodeURIComponent(c)}&role=${encodeURIComponent(r)}&messageId=${encodeURIComponent(messageId)}`,
      priority: 2,
    };
  } else if (resData.status === "AMBIGUOUS_MATCH") {
    const c = classified.detectedCompany || "a company";
    notifConfig = {
      id: `email-ambiguous-${messageId || Date.now()}`,
      title: `📬 Review needed — ${c}`,
      message: `We found a ${c} recruitment email but couldn't match it. Open CareerPilot to select the correct application.`,
      deepLink: `${appUrl}/applications`,
      priority: 1,
    };
  }

  if (notifConfig) {
    await triggerRecruitmentNotification(notifConfig);
    if (messageId) {
      await chrome.storage.local.set({ [notifDedupeKey]: true });
    }
  }

  return resData;
}

/**
 * Delivers a Chrome notification for recruitment events with deduplication guard.
 * Stores notificationId → deepLink in storage for click handling.
 */
async function triggerRecruitmentNotification({ id, title, message, deepLink, priority = 1 }) {
  if (typeof chrome === "undefined" || !chrome.notifications?.create) return;

  try {
    const iconUrl = chrome.runtime?.getURL
      ? chrome.runtime.getURL("assets/icon48.png")
      : "assets/icon48.png";

    await new Promise((resolve) => {
      chrome.notifications.create(
        id,
        {
          type: "basic",
          iconUrl,
          title,
          message,
          priority: Math.min(2, Math.max(0, priority)),
        },
        (createdId) => {
          if (chrome.runtime.lastError) {
            console.warn("[CareerPilot] Chrome notification suppressed:", chrome.runtime.lastError.message);
          }
          resolve(createdId);
        }
      );
    });

    // Persist deepLink so onClicked can navigate correctly
    if (id && deepLink) {
      const linkKey = `notif-link-${id}`;
      await chrome.storage.local.set({ [linkKey]: deepLink });
    }
  } catch (e) {
    console.warn("[CareerPilot] Notification creation error:", e);
  }
}

// Handle notification clicks to open deep-link navigation in tab
chrome.notifications?.onClicked?.addListener(async (notificationId) => {
  try {
    const linkKey = `notif-link-${notificationId}`;
    const stored = await chrome.storage.local.get(linkKey);
    const targetUrl = stored[linkKey];
    const { appUrl } = await getApiConfig();
    const finalUrl = targetUrl || appUrl || DEFAULT_APP_URL;

    chrome.tabs.create({ url: finalUrl });
    chrome.notifications.clear(notificationId);
  } catch (err) {
    console.warn("[CareerPilot] Notification click handler error:", err);
  }
});

// -----------------------------------------------------------------------------
// Job Analysis & API Request Deduplication
// -----------------------------------------------------------------------------
const inFlightAnalysisMap = new Map();

async function triggerJobNotification({ title, message, priority = 0 }) {
  // Only create desktop notifications for HIGH priority events (priority >= 2)
  if (priority < 2) return;

  if (typeof chrome !== "undefined" && chrome.notifications && typeof chrome.notifications.create === "function") {
    try {
      const iconUrl = chrome.runtime?.getURL ? chrome.runtime.getURL("assets/icon48.png") : "assets/icon48.png";
      chrome.notifications.create(
        `notif_${Date.now()}`,
        {
          type: "basic",
          iconUrl: iconUrl,
          title: title || "CareerPilot AI",
          message: message || "Job update",
          priority: 1,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn("[CareerPilot Service Worker] Notification suppressed:", chrome.runtime.lastError.message);
          }
        }
      );
    } catch (e) {
      console.warn("[CareerPilot Service Worker] Notification error:", e);
    }
  }
}

async function handleJobAnalysis(jobPayload) {
  const authStatus = await checkAuthStatus();
  if (!authStatus.isAuthenticated) {
    return { isAuthenticated: false };
  }

  const { company, title, role, url, externalJobId } = jobPayload || {};
  const companyName = company || "";
  const roleName = title || role || "";
  const cleanUrl = url || "";
  const lockKey = `${companyName.toLowerCase()}_${roleName.toLowerCase()}_${externalJobId || cleanUrl}`;

  if (inFlightAnalysisMap.has(lockKey)) {
    return inFlightAnalysisMap.get(lockKey);
  }

  const analysisPromise = (async () => {
    try {
      let existingApp = null;
      if (companyName || roleName) {
        const searchRes = await apiRequest(`/applications?search=${encodeURIComponent(companyName || roleName)}`);
        if (searchRes.success && Array.isArray(searchRes.data?.applications)) {
          const apps = searchRes.data.applications;
          function extractJobIdentityKey(u = "") {
            try {
              const parsed = new URL(u);
              return (
                parsed.searchParams.get("jk") ||
                parsed.searchParams.get("vjk") ||
                parsed.searchParams.get("vjs") ||
                parsed.searchParams.get("currentJobId") ||
                parsed.searchParams.get("gh_jid") ||
                ""
              );
            } catch {
              return "";
            }
          }

          const currentJk = extractJobIdentityKey(cleanUrl);
          const isSpecificName = (s) => s && s.trim().length >= 2 && !/^(company|unknown company|job|position|untitled role)$/i.test(s.trim());

          existingApp = apps.find((app) => {
            if (currentJk && app.jobUrl && app.jobUrl.includes(currentJk)) return true;
            if (cleanUrl && app.jobUrl && app.jobUrl === cleanUrl) return true;
            if (
              isSpecificName(companyName) &&
              isSpecificName(roleName) &&
              app.company?.toLowerCase() === companyName.toLowerCase() &&
              app.role?.toLowerCase() === roleName.toLowerCase()
            ) {
              return true;
            }
            return false;
          });
        }
      }

      if (existingApp) {
        return {
          isAuthenticated: true,
          existing: true,
          application: existingApp,
          overallScore: existingApp.matchResultId?.overallScore || null,
        };
      }

      return {
        isAuthenticated: true,
        existing: false,
        overallScore: null,
        matchedSkills: [],
        missingSkills: [],
      };
    } finally {
      inFlightAnalysisMap.delete(lockKey);
    }
  })();

  inFlightAnalysisMap.set(lockKey, analysisPromise);
  return analysisPromise;
}

// -----------------------------------------------------------------------------
// Periodic Reminder Check via chrome.alarms (every 30 minutes)
// -----------------------------------------------------------------------------
async function checkDueReminders() {
  try {
    const auth = await checkAuthStatus();
    if (!auth.isAuthenticated) return;

    const res = await apiRequest("/reminders/due");
    if (!res.success || !Array.isArray(res.reminders)) return;

    const { notifiedReminderIds = [] } = await chrome.storage.local.get("notifiedReminderIds");
    const newNotified = [...notifiedReminderIds];

    for (const rem of res.reminders) {
      if (newNotified.includes(rem.reminderId)) continue;
      if (["HIGH", "URGENT"].includes(rem.priority)) {
        const company = rem.applicationId?.company || rem.metadata?.company || "Company";
        const role = rem.applicationId?.role || rem.metadata?.role || "Role";

        chrome.notifications?.create(rem.reminderId, {
          type: "basic",
          iconUrl: "../icons/icon128.png",
          title: rem.metadata?.title || `CareerPilot Reminder: ${role} at ${company}`,
          message: rem.reason || `Action required for ${role} at ${company}`,
          priority: rem.priority === "URGENT" ? 2 : 1,
        });

        newNotified.push(rem.reminderId);
      }
    }

    const trimmedNotified = newNotified.slice(-100);
    await chrome.storage.local.set({ notifiedReminderIds: trimmedNotified });
  } catch (e) {
    console.warn("[CareerPilot Service Worker] Reminder polling check failed:", e);
  }
}

chrome.alarms?.create("CHECK_DUE_REMINDERS", { periodInMinutes: 30 });
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === "CHECK_DUE_REMINDERS") {
    checkDueReminders();
  }
});

chrome.notifications?.onClicked?.addListener(async (notificationId) => {
  try {
    const linkKey = `notif-link-${notificationId}`;
    const stored = await chrome.storage.local.get(linkKey);
    const deepLink = stored[linkKey];
    if (deepLink) {
      chrome.tabs.create({ url: deepLink });
      chrome.notifications.clear(notificationId);
      await chrome.storage.local.remove(linkKey);
    }
  } catch (err) {
    console.warn("[CareerPilot Service Worker] Notification click handler error:", err);
  }
});


