/**
 * CareerPilot AI — Application Intent Detector
 * Monitors active job pages for genuine user application intent signals
 * without creating database records or interfering with site navigation.
 */

(function () {
  if (window.__CAREERPILOT_INTENT_DETECTOR__) {
    return;
  }

  let intentCallback = null;
  let isListening = false;
  let hasDetectedForCurrentJob = false;
  let lastDetectedTime = 0;

  // Regex patterns for Apply buttons and Intent signals
  const APPLY_BUTTON_REGEX = /^(apply|apply now|easy apply|apply for this job|apply for this position|submit application|start application|continue application)$/i;
  const CONFIRMATION_URL_REGEX = /\/(applied|apply\/success|thank-you|thanks|submitted|application-submitted|confirmation)\b/i;
  const CONFIRMATION_TEXT_REGEX = /(application (submitted|received)|thank you for applying|your application has been submitted|application successful)/i;

  function resetJobSession() {
    hasDetectedForCurrentJob = false;
    lastDetectedTime = 0;
  }

  function triggerIntent(signalType, element = null) {
    const now = Date.now();
    // Debounce detections within 3 seconds
    if (now - lastDetectedTime < 3000) return;
    lastDetectedTime = now;

    if (hasDetectedForCurrentJob) return;
    hasDetectedForCurrentJob = true;

    console.log(`[CareerPilot IntentDetector] Triggered signal: ${signalType}`, element);

    if (typeof intentCallback === "function") {
      intentCallback({
        signalType,
        timestamp: new Date().toISOString(),
        targetText: element ? (element.innerText || element.value || "").trim() : ""
      });
    }
  }

  // 1. Button Click Monitor
  function handleGlobalClick(e) {
    if (!isListening || hasDetectedForCurrentJob) return;

    let target = e.target;
    // Traverse up to 4 parent elements to catch button wrappers / icons
    let depth = 0;
    while (target && depth < 4) {
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button' || target.tagName === 'INPUT') {
        const text = (target.value || target.innerText || target.textContent || '').trim();
        const ariaLabel = target.getAttribute('aria-label') || '';
        const idOrClass = `${target.id || ''} ${target.className || ''}`;

        if (APPLY_BUTTON_REGEX.test(text) || APPLY_BUTTON_REGEX.test(ariaLabel) || /apply-button|jobs-apply-button/i.test(idOrClass)) {
          triggerIntent('APPLY_BUTTON_CLICKED', target);
          return;
        }
      }
      target = target.parentElement;
      depth++;
    }
  }

  // 2. Form Submit Monitor
  function handleFormSubmit(e) {
    if (!isListening || hasDetectedForCurrentJob) return;

    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    const formIdClass = `${form.id || ''} ${form.className || ''} ${form.action || ''}`;
    if (/apply|job|application|greenhouse|lever|workday|ashby/i.test(formIdClass)) {
      triggerIntent('APPLICATION_FORM_SUBMITTED', form);
    }
  }

  // 3. DOM & ATS Modal Observer
  function setupDomObserver() {
    const observer = new MutationObserver(() => {
      if (!isListening || hasDetectedForCurrentJob) return;

      // Check for confirmation text
      const bodyText = document.body ? document.body.innerText || '' : '';
      if (CONFIRMATION_TEXT_REGEX.test(bodyText.slice(0, 3000))) {
        triggerIntent('CONFIRMATION_TEXT_DETECTED');
        return;
      }

      // Check for open ATS modals (e.g. LinkedIn Easy Apply modal, Greenhouse iframe modal)
      const activeModal = document.querySelector('.jobs-easy-apply-modal, [id*="application-modal"], [class*="application-form"], form[action*="apply"]');
      if (activeModal && activeModal.offsetWidth > 0 && activeModal.offsetHeight > 0) {
        triggerIntent('ATS_MODAL_OPENED', activeModal);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 4. URL Navigation Observer
  function checkUrlForConfirmation() {
    if (!isListening || hasDetectedForCurrentJob) return;
    if (CONFIRMATION_URL_REGEX.test(window.location.href)) {
      triggerIntent('CONFIRMATION_URL_NAVIGATED');
    }
  }

  function initIntentDetection(options = {}) {
    intentCallback = options.onIntentDetected || null;
    isListening = true;

    // Attach listeners passively (does NOT interfere with website functionality)
    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    window.addEventListener('submit', handleFormSubmit, { capture: true, passive: true });
    window.addEventListener('popstate', checkUrlForConfirmation);

    setupDomObserver();
    checkUrlForConfirmation();
  }

  function stopIntentDetection() {
    isListening = false;
    window.removeEventListener('click', handleGlobalClick, { capture: true });
    window.removeEventListener('submit', handleFormSubmit, { capture: true });
    window.removeEventListener('popstate', checkUrlForConfirmation);
  }

  window.__CAREERPILOT_INTENT_DETECTOR__ = {
    initIntentDetection,
    stopIntentDetection,
    resetJobSession
  };
})();
