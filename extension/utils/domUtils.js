/**
 * Safe DOM Utilities for CareerPilot Extension
 * Prevents invalid native CSS selector evaluation errors (e.g. :contains())
 */
(function () {
  function safeFindApplyButton(doc = window.document, additionalSelectors = []) {
    if (!doc) return null;

    // 1. Try specific valid selectors first
    for (const selector of additionalSelectors) {
      if (!selector || typeof selector !== "string" || selector.includes(":contains")) continue;
      try {
        const el = doc.querySelector(selector);
        if (el) return el;
      } catch (e) {
        // ignore invalid selector gracefully
      }
    }

    // 2. Query candidates safely using standard native selectors
    const candidates = doc.querySelectorAll(
      "button, a, input[type='button'], input[type='submit'], [role='button'], [data-action*='apply']"
    );

    const POSITIVE_TEXTS = [
      "apply now",
      "apply for this job",
      "apply for position",
      "submit application",
      "easy apply",
      "apply on company site",
      "apply online",
      "apply",
      "register for placement",
      "register for drive",
      "register",
      "start application"
    ];

    const EXCLUDED_TEXTS = [
      "apply filter",
      "apply filters",
      "apply coupon",
      "apply code",
      "apply changes",
      "apply settings",
      "apply search",
      "apply sort",
      "apply prompt",
      "apply formatting",
      "apply style",
      "apply theme"
    ];

    for (const el of candidates) {
      const text = (
        el.textContent ||
        el.value ||
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        ""
      ).trim().toLowerCase();

      if (!text) continue;

      // Exclude false positive actions
      if (EXCLUDED_TEXTS.some((ex) => text.includes(ex))) {
        continue;
      }

      // Match positive apply actions
      if (POSITIVE_TEXTS.some((pos) => text === pos || text.includes(pos))) {
        return el;
      }
    }

    return null;
  }

  if (typeof window !== "undefined") {
    window.safeFindApplyButton = safeFindApplyButton;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { safeFindApplyButton };
  }
})();
