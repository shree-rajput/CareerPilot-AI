/**
 * CareerPilot AI Extension Service Worker (Manifest V3)
 * Provides event-driven background orchestration, state persistence,
 * offline action outbox retry queue, and secure API client calls.
 */

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
      if (item.type === "UPDATE_APPLICATION_STATUS") {
        await handleStatusUpdate(item.payload);
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
chrome.runtime.onStartup?.addListener(() => processOutboxQueue());

// -----------------------------------------------------------------------------
// Main Runtime Message Listener
// -----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

  if (request.type === "UPDATE_APPLICATION_STATUS") {
    handleStatusUpdate(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => {
        if (err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch")) {
          enqueueOutboxAction("UPDATE_APPLICATION_STATUS", request.payload);
        }
        sendResponse({ success: false, error: err.message });
      });
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

  if (request.type === "CHECK_AUTH") {
    checkAuthStatus()
      .then((authStatus) => sendResponse(authStatus))
      .catch(() => sendResponse({ isAuthenticated: false }));
    return true;
  }

  if (request.type === "SET_AUTH_CODE" || request.type === "EXCHANGE_CODE") {
    exchangeAuthCode(request.code)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === "DISCONNECT") {
    chrome.storage.local.remove(["token", "user", "outbox"], () => {
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
  const { apiUrl, token, user } = await getApiConfig();
  if (!token) {
    return { isAuthenticated: false };
  }

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      await chrome.storage.local.set({ user: data.user });
      return { isAuthenticated: true, user: data.user };
    } else {
      await chrome.storage.local.remove(["token", "user"]);
      return { isAuthenticated: false, error: "SESSION_EXPIRED" };
    }
  } catch (err) {
    return { isAuthenticated: Boolean(token), user, offline: true };
  }
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

  await chrome.storage.local.set({
    token: resData.accessToken,
    user: resData.user,
  });

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
      await chrome.storage.local.remove(["token", "user"]);
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired. Reconnect to proceed.");
    }
    throw new Error(resData.message || `Ingestion failed (${response.status})`);
  }

  return resData;
}

async function handleStatusUpdate(payload) {
  const { apiUrl, token } = await getApiConfig();
  const { applicationId, targetStatus, source = "extension_manual_action", evidence = "", note = "" } = payload || {};

  if (!token) {
    throw new Error("AUTH_REQUIRED: Connect CareerPilot to update application status.");
  }

  if (!applicationId) {
    throw new Error("applicationId is required to update status.");
  }

  const response = await fetch(`${apiUrl}/applications/${applicationId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetStatus,
      source,
      evidence,
      note,
      idempotencyKey: `status-${applicationId}-${targetStatus}-${Date.now()}`,
    }),
  });

  const resData = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      await chrome.storage.local.remove(["token", "user"]);
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired.");
    }
    throw new Error(resData.message || `Status update failed (${response.status})`);
  }

  return resData;
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
      await chrome.storage.local.remove(["token", "user"]);
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
      await chrome.storage.local.remove(["token", "user"]);
      throw new Error("SESSION_EXPIRED: Your CareerPilot session expired.");
    }
    throw new Error(resData.message || `Email processing failed (${response.status})`);
  }

  return resData;
}
