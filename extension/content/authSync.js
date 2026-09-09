/**
 * CareerPilot AI — Web Authentication Synchronizer
 * Injected exclusively into authorized CareerPilot web properties.
 * Silently synchronizes the web application's token with the Chrome Extension's background service worker,
 * completely eliminating the need for manual "Connect CareerPilot" prompts.
 */

(function () {
  // Only run if we are actually in a web page context
  if (typeof window === "undefined" || !window.localStorage) return;

  const TOKEN_KEY = "careerpilot_token";

  function syncTokenToExtension() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      // If we have chrome.runtime available (we are an externally connectable web page or a content script)
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        if (token) {
          chrome.runtime.sendMessage({ type: "SYNC_WEB_TOKEN", token: token });
        } else {
          // Send explicit disconnect if token is empty
          chrome.runtime.sendMessage({ type: "SYNC_WEB_LOGOUT" });
        }
      }
    } catch (e) {
      console.warn("[CareerPilot AuthSync] Error syncing token to extension:", e);
    }
  }

  // 1. Initial sync on page load
  // Delay slightly to ensure localStorage is populated if this runs very early
  setTimeout(syncTokenToExtension, 500);

  // 2. Listen for cross-tab or current-tab storage modifications (Login / Logout)
  window.addEventListener("storage", (event) => {
    if (event.key === TOKEN_KEY) {
      syncTokenToExtension();
    }
  });

  // 3. Optional polling check (every 5 seconds) to catch any SPA state overwrites 
  // that don't trigger standard storage events in the same tab context.
  let lastSeenToken = localStorage.getItem(TOKEN_KEY);
  setInterval(() => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken !== lastSeenToken) {
      lastSeenToken = currentToken;
      syncTokenToExtension();
    }
  }, 5000);

})();
