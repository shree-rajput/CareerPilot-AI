/**
 * Copilot Error Normalizer
 * Ensures no internal technical details (HTTP codes, provider errors, stack traces)
 * are ever exposed directly to the user UI.
 */

export function normalizeCopilotError(error) {
  // Log technical details silently for developer debugging/observability
  console.error("[Copilot Error Internal Log]:", error);

  const status = error?.response?.status;
  const serverCode = error?.response?.data?.code || error?.code;

  let userFriendlyMessage = "CareerPilot couldn't generate a response right now.";
  let errorCode = "GENERAL_ERROR";
  let canRetry = true;

  if (status === 401 || status === 403) {
    userFriendlyMessage = "Your session expired. Please refresh or log in again to continue.";
    errorCode = "AUTH_ERROR";
    canRetry = false;
  } else if (status === 404) {
    userFriendlyMessage = "This conversation was not found or has been removed.";
    errorCode = "NOT_FOUND";
    canRetry = false;
  } else if (status === 429 || serverCode === "RATE_LIMIT_EXCEEDED") {
    userFriendlyMessage = "CareerPilot is receiving high traffic right now. Please wait a moment and try again.";
    errorCode = "RATE_LIMIT";
    canRetry = true;
  } else if (status >= 500) {
    userFriendlyMessage = "Our career intelligence system experienced a brief hiccup. Please click retry.";
    errorCode = "SERVER_ERROR";
    canRetry = true;
  } else if (error?.message === "Network Error" || !navigator.onLine) {
    userFriendlyMessage = "Network connection lost. Please check your internet connection and try again.";
    errorCode = "NETWORK_ERROR";
    canRetry = true;
  }

  return {
    userFriendlyMessage,
    errorCode,
    canRetry,
    originalMessage: error?.message || "Unknown error"
  };
}
