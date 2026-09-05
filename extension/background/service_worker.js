/**
 * CareerPilot AI Extension Service Worker (Manifest V3)
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

// Handle messages from Popup, Content Script, or Web Page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "INGEST_JOB") {
    handleJobIngestion(request.payload)
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
    chrome.storage.local.remove(["token", "user"], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// External messages from web app
chrome.runtime.onMessageExternal?.addListener((request, sender, sendResponse) => {
  if (request.type === "SET_AUTH_CODE") {
    exchangeAuthCode(request.code)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

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
      // Token expired or invalid
      await chrome.storage.local.remove(["token", "user"]);
      return { isAuthenticated: false, error: "SESSION_EXPIRED" };
    }
  } catch (err) {
    // Network offline or server unavailable - fallback to cached token check
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

