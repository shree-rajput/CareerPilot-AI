/**
 * Safe DOM Utilities for CareerPilot Extension
 * Prevents invalid native CSS selector evaluation errors (e.g. :contains())
 */
(function () {
  /**
   * Safely query the DOM with a selector string, filtering out pseudo-selectors like :contains()
   * that are not standard in querySelector/querySelectorAll.
   */
  function safeQuerySelector(doc = window.document, selectorStr = "") {
    if (!doc || !selectorStr || typeof selectorStr !== "string") return null;

    const parts = selectorStr.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes(":contains")) continue;
      try {
        const el = doc.querySelector(part);
        if (el) return el;
      } catch (e) {
        // Skip invalid CSS syntax cleanly without crashing caller
      }
    }
    return null;
  }

  function safeFindApplyButton(doc = window.document, additionalSelectors = []) {
    if (!doc) return null;

    const selectorList = Array.isArray(additionalSelectors)
      ? additionalSelectors
      : typeof additionalSelectors === "string"
      ? [additionalSelectors]
      : [];

    // 1. Try specific valid selectors first
    for (const selectorStr of selectorList) {
      const match = safeQuerySelector(doc, selectorStr);
      if (match) return match;
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
    window.safeQuerySelector = safeQuerySelector;
    window.safeFindApplyButton = safeFindApplyButton;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { safeQuerySelector, safeFindApplyButton };
  }
})();
