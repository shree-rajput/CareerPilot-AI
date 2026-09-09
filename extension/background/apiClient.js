/**
 * CareerPilot AI - Extension API Client
 * Centralized API client for the Chrome Extension.
 * Handles configuration fetching, request timeouts, normalized error mapping, and deduplication/idempotency keys.
 */

const DEFAULT_API_URL = "http://localhost:5000/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

/**
 * Normalizes backend fetch responses/exceptions into a strict contract.
 */
function normalizeError(err, responseStatus, responseData) {
  let category = "UNKNOWN";
  let userMessage = "Something went wrong while communicating with CareerPilot.";
  let code = "UNKNOWN_ERROR";
  let retryable = false;

  if (err?.name === "AbortError" || err?.message?.includes("timeout")) {
    category = "TIMEOUT";
    userMessage = "Couldn't save this job";
    code = "NETWORK_TIMEOUT";
    retryable = true;
  } else if (!responseStatus || err?.message?.includes("NetworkError") || err?.message?.includes("Failed to fetch") || err?.message?.includes("offline")) {
    category = "NETWORK";
    userMessage = "Couldn't save this job";
    code = "NETWORK_ERROR";
    retryable = true;
  } else if (responseStatus === 401 || responseStatus === 403) {
    category = "AUTH";
    userMessage = "Sign in to CareerPilot to save this job";
    code = "AUTH_REQUIRED";
    retryable = false;
  } else if (responseStatus === 400 || responseStatus === 422) {
    category = "VALIDATION";
    userMessage = responseData?.error?.message || responseData?.message || "Some job information needs to be reviewed.";
    code = responseData?.error?.code || "VALIDATION_ERROR";
    retryable = false;
  } else if (responseStatus === 409) {
    category = "DUPLICATE";
    userMessage = "Already in Job Inbox";
    code = "DUPLICATE_RESOURCE";
    retryable = false;
  } else if (responseStatus >= 500) {
    category = "SERVER";
    userMessage = "CareerPilot is temporarily unavailable";
    code = "SERVER_ERROR";
    retryable = true;
  } else if (err) {
    // Pass through detailed messages if they exist but are not raw browser errors
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError")) {
      userMessage = err.message || userMessage;
    }
  }

  return {
    category,
    userMessage,
    code,
    retryable,
    rawError: err ? err.message : null
  };
}

/**
 * Core fetch wrapper with timeout and normalization.
 */
export async function apiRequest(endpoint, options = {}) {
  const result = await chrome.storage.local.get(["apiUrl", "token"]);
  const apiUrl = result.apiUrl || DEFAULT_API_URL;
  const token = result.token || "";

  if (!token && !options.skipAuth) {
    return {
      success: false,
      error: normalizeError(new Error("AUTH_REQUIRED"), 401, null)
    };
  }

  const url = `${apiUrl}${endpoint}`;
  const timeoutMs = options.timeout || DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    },
    signal: controller.signal
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(id);

    let resData;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      resData = await response.json();
    } else {
      resData = { message: await response.text() };
    }

    if (!response.ok) {
      if (response.status === 401) {
        await chrome.storage.local.remove(["token", "user"]);
      }
      return {
        success: false,
        error: normalizeError(new Error(`HTTP ${response.status}`), response.status, resData),
        data: resData
      };
    }

    // Success response
    return {
      success: true,
      data: resData,
      isDuplicate: Boolean(resData.isDuplicate || resData.existing)
    };
  } catch (err) {
    clearTimeout(id);
    return {
      success: false,
      error: normalizeError(err, null, null)
    };
  }
}
