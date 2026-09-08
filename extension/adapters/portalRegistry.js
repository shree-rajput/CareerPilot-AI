/**
 * CareerPilot AI - Central Portal & ATS Adapter Registry
 * Resolves active page URL to specific Job Portal or ATS adapter.
 * If no adapter matches, returns null to enforce Fail-Closed activation.
 */

(function () {
  const registry = [];

  function registerAdapter(adapter) {
    if (adapter && typeof adapter.matches === "function") {
      registry.push(adapter);
    }
  }

  function getAdapterForUrl(urlStr = window.location.href) {
    for (const adapter of registry) {
      try {
        if (adapter.matches(urlStr)) {
          return adapter;
        }
      } catch (e) {
        console.warn(`[CareerPilot Registry] Adapter match error for ${adapter.sourceName}:`, e);
      }
    }
    return null;
  }

  function getAllAdapters() {
    return registry;
  }

  window.__CAREERPILOT_PORTAL_REGISTRY__ = {
    registerAdapter,
    getAdapterForUrl,
    getAllAdapters,
  };
})();
