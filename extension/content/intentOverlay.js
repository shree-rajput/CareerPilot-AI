/**
 * CareerPilot AI — Professional In-Page Shadow DOM Overlay
 * Features official branding, responsive card architecture, state machine, and match intelligence.
 */

(function () {
  if (window.__CAREERPILOT_INTENT_OVERLAY__) {
    return;
  }

  let hostElement = null;
  let shadowRoot = null;
  let currentOverlayState = {
    state: "DETECTED", // DETECTED, EXTRACTING, ANALYZING, READY, COLLAPSED, ERROR, UNAUTHENTICATED
    jobContext: null,
    matchData: null,
    authData: null,
    errorData: null,
    isEditing: false,
    callbacks: {}
  };

  const DEFAULT_APP_URL = "http://localhost:5173";

  function getAssetUrl(path) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {}
    return "";
  }

  function removeOverlay() {
    const hosts = document.querySelectorAll("#careerpilot-root, #careerpilot-intent-toast-host");
    hosts.forEach((h) => {
      if (h.parentNode) h.parentNode.removeChild(h);
    });
    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
    }
    hostElement = null;
    shadowRoot = null;
    currentOverlayState.state = "REMOVED";
  }

  function ensureShadowHost() {
    const existing = document.getElementById("careerpilot-root") || document.getElementById("careerpilot-intent-toast-host");
    if (existing && existing !== hostElement) {
      if (existing.parentNode) existing.parentNode.removeChild(existing);
    }

    if (!hostElement || !document.contains(hostElement)) {
      hostElement = document.createElement("div");
      hostElement.id = "careerpilot-root";
      hostElement.style.cssText = "all: initial; position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;";
      shadowRoot = hostElement.attachShadow({ mode: "closed" });
      document.documentElement.appendChild(hostElement);
    }
  }

  function getStyleSheet() {
    return `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        -webkit-font-smoothing: antialiased;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      .cp-card {
        width: 375px;
        max-width: calc(100vw - 32px);
        background: radial-gradient(circle at top left, rgba(2, 132, 199, 0.12), transparent 70%), #0b0f19;
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
        padding: 18px;
        animation: cpSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        gap: 14px;
        backdrop-filter: blur(16px);
      }
      @keyframes cpSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .cp-pill {
        background: radial-gradient(circle at top left, rgba(2, 132, 199, 0.2), transparent 80%), #0b0f19;
        color: #f8fafc;
        border: 1px solid #0284c7;
        border-radius: 9999px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.5);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .cp-pill:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 16px 32px -4px rgba(2, 132, 199, 0.4);
      }
      .cp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        padding-bottom: 10px;
      }
      .cp-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .cp-logo-icon {
        width: 22px;
        height: 22px;
        object-fit: contain;
        border-radius: 6px;
      }
      .cp-logo-img {
        height: 22px;
        width: auto;
        object-fit: contain;
      }
      .cp-brand-fallback {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 800;
        color: #38bdf8;
        letter-spacing: -0.3px;
      }
      .cp-brand-badge {
        font-size: 9px;
        font-weight: 700;
        background: rgba(2, 132, 199, 0.2);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 2px 6px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cp-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .cp-icon-btn {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s ease;
      }
      .cp-icon-btn:hover {
        background: #1e293b;
        color: #f8fafc;
      }
      .cp-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cp-title {
        font-size: 15px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.35;
        letter-spacing: -0.2px;
      }
      .cp-company {
        font-size: 13px;
        font-weight: 600;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .cp-location {
        font-size: 12px;
        font-weight: 400;
        color: #94a3b8;
      }
      .cp-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .cp-tag {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .cp-tag-match-high { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
      .cp-tag-match-med { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
      .cp-tag-match-low { background: rgba(244, 63, 94, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
      .cp-tag-tracked { background: rgba(2, 132, 199, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
      .cp-tag-info { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }

      .cp-card-section {
        background: #111827;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cp-section-title {
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cp-skills-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .cp-skill-pill {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 4px;
      }
      .cp-skill-matched { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
      .cp-skill-missing { background: rgba(244, 63, 94, 0.2); color: #fda4af; }

      .cp-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }
      .cp-btn {
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        padding: 10px 14px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .cp-btn-primary {
        background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
        color: #ffffff;
        flex: 1;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }
      .cp-btn-primary:hover {
        background: linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.5);
        transform: translateY(-1px);
      }
      .cp-btn-secondary {
        background: #1e293b;
        color: #cbd5e1;
        border: 1px solid #334155;
      }
      .cp-btn-secondary:hover {
        background: #334155;
        color: #f8fafc;
      }
      .cp-input {
        width: 100%;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #f8fafc;
        padding: 8px 12px;
        font-size: 12px;
      }
      .cp-input:focus {
        outline: none;
        border-color: #38bdf8;
      }
      .cp-pulse-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 8px #10b981;
        animation: cpPulse 2s infinite;
      }
      @keyframes cpPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
      .cp-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #38bdf8;
        border-top-color: transparent;
        border-radius: 50%;
        animation: cpSpin 0.8s linear infinite;
        display: inline-block;
      }
      @keyframes cpSpin {
        to { transform: rotate(360deg); }
      }
    `;
  }

  function renderOverlayState(params = {}) {
    const {
      state = currentOverlayState.state || "DETECTED",
      jobContext = currentOverlayState.jobContext,
      matchData = currentOverlayState.matchData,
      authData = currentOverlayState.authData,
      errorData = currentOverlayState.errorData,
      onConfirm = currentOverlayState.callbacks.onConfirm,
      onIgnore = currentOverlayState.callbacks.onIgnore,
      onRetry = currentOverlayState.callbacks.onRetry
    } = params;

    currentOverlayState = {
      state,
      jobContext,
      matchData,
      authData,
      errorData,
      isEditing: currentOverlayState.isEditing && state === "READY",
      callbacks: { onConfirm, onIgnore, onRetry }
    };

    if (state === "REMOVED") {
      removeOverlay();
      return;
    }

    ensureShadowHost();
    shadowRoot.innerHTML = "";

    const styleEl = document.createElement("style");
    styleEl.textContent = getStyleSheet();
    shadowRoot.appendChild(styleEl);

    const logoUrl = getAssetUrl("assets/logo.png");
    const iconUrl = getAssetUrl("assets/icon48.png") || getAssetUrl("assets/icon128.png");

    function renderHeaderMarkup() {
      return `
        <div class="cp-header">
          <div class="cp-brand">
            ${iconUrl ? `<img src="${iconUrl}" width="22" height="22" class="cp-logo-icon" alt="CareerPilot Logo" />` : `<div class="cp-brand-icon">⚡</div>`}
            <span class="cp-brand-fallback">CareerPilot AI</span>
            <span class="cp-brand-badge">AI Assistant</span>
          </div>
          <div class="cp-controls">
            <button class="cp-icon-btn" id="cp-collapse" title="Minimize">—</button>
            <button class="cp-icon-btn" id="cp-close" title="Close">✕</button>
          </div>
        </div>
      `;
    }

    // 1. Collapsed Pill View
    if (state === "COLLAPSED") {
      const score = matchData?.overallScore ? `${matchData.overallScore}% Match` : "Job Detected";
      const pill = document.createElement("div");
      pill.className = "cp-pill";
      pill.innerHTML = `
        ${iconUrl ? `<img src="${iconUrl}" width="18" height="18" class="cp-logo-icon" />` : `<div class="cp-pulse-dot"></div>`}
        ${logoUrl ? `<img src="${logoUrl}" height="18" alt="CareerPilot" />` : `<span style="font-weight:700; font-size:12px; color:#f8fafc;">CareerPilot</span>`}
        <span style="background:rgba(2, 132, 199, 0.3); color:#38bdf8; font-size:10px; padding:3px 8px; border-radius:10px; font-weight:700;">${score}</span>
      `;
      pill.onclick = () => renderOverlayState({ state: "READY" });
      shadowRoot.appendChild(pill);
      return;
    }

    const container = document.createElement("div");
    container.className = "cp-card";

    const title = jobContext?.title || jobContext?.role || "Job Posting";
    const company = jobContext?.company || "Company";
    const location = jobContext?.location || "";
    const salary = jobContext?.salary || "";
    const workplaceType = jobContext?.workplaceType || "";

    // 2. Loading States (DETECTED, EXTRACTING, ANALYZING)
    if (state === "DETECTED" || state === "EXTRACTING" || state === "ANALYZING") {
      const statusMessage =
        state === "DETECTED"
          ? "CareerPilot detected this job"
          : state === "EXTRACTING"
          ? "Extracting job requirements..."
          : "Analyzing match with candidate profile...";

      container.innerHTML = `
        ${renderHeaderMarkup()}
        <div class="cp-body">
          <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:#38bdf8; font-weight:600;">
            <span class="cp-spinner"></span>
            <span>${statusMessage}</span>
          </div>
          ${title !== "Job Posting" ? `<div class="cp-title" style="margin-top:6px;">${title}</div>` : ""}
          ${company !== "Company" ? `<div class="cp-company">${company}${location ? ` <span class="cp-location">· 📍 ${location}</span>` : ""}</div>` : ""}
        </div>
      `;

      shadowRoot.appendChild(container);
      shadowRoot.querySelector("#cp-close")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-collapse")?.addEventListener("click", () => renderOverlayState({ state: "COLLAPSED" }));
      return;
    }

    // 3. Unauthenticated State
    if (state === "UNAUTHENTICATED") {
      container.innerHTML = `
        ${renderHeaderMarkup()}
        <div class="cp-body">
          <div class="cp-title">${title}</div>
          <div class="cp-company">${company}${location ? ` <span class="cp-location">· ${location}</span>` : ""}</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:4px; line-height:1.4;">
            Connect CareerPilot AI to unlock candidate match scores, skill gap analysis, and instant application tracking.
          </div>
        </div>

        <div class="cp-actions">
          <button class="cp-btn cp-btn-primary" id="cp-signin-btn">⚡ Connect CareerPilot</button>
          <button class="cp-btn cp-btn-secondary" id="cp-dismiss-btn">Dismiss</button>
        </div>
      `;

      shadowRoot.appendChild(container);
      shadowRoot.querySelector("#cp-close")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-collapse")?.addEventListener("click", () => renderOverlayState({ state: "COLLAPSED" }));
      shadowRoot.querySelector("#cp-dismiss-btn")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-signin-btn")?.addEventListener("click", () => {
        window.open(DEFAULT_APP_URL, "_blank");
      });
      return;
    }

    // 4. Error State
    if (state === "ERROR") {
      const errMsg = errorData?.userMessage || errorData?.message || "CareerPilot couldn't analyze this job right now.";
      container.innerHTML = `
        ${renderHeaderMarkup()}
        <div class="cp-body">
          <div class="cp-title">${title}</div>
          <div class="cp-company">${company}</div>
          <div style="font-size:12px; color:#f87171; margin-top:4px;">${errMsg}</div>
        </div>

        <div class="cp-actions">
          <button class="cp-btn cp-btn-primary" id="cp-retry-btn">Retry Analysis</button>
          <button class="cp-btn cp-btn-secondary" id="cp-dismiss-btn">Dismiss</button>
        </div>
      `;

      shadowRoot.appendChild(container);
      shadowRoot.querySelector("#cp-close")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-collapse")?.addEventListener("click", () => renderOverlayState({ state: "COLLAPSED" }));
      shadowRoot.querySelector("#cp-dismiss-btn")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-retry-btn")?.addEventListener("click", () => {
        if (typeof onRetry === "function") onRetry();
      });
      return;
    }

    // 5. Ready State (With Full Branding, Match Analysis & Action Buttons)
    if (state === "READY") {
      const score = matchData?.overallScore;
      const isTracked = Boolean(matchData?.existing || matchData?.application);
      const appStatus = (matchData?.application?.status || "applied").toUpperCase();
      const appId = matchData?.application?._id;

      let matchBadgeClass = "cp-tag-info";
      let matchLabel = "Job Analyzed";
      if (typeof score === "number" && score > 0) {
        if (score >= 80) { matchBadgeClass = "cp-tag-match-high"; matchLabel = `⚡ ${score}% Match — Strong Fit`; }
        else if (score >= 50) { matchBadgeClass = "cp-tag-match-med"; matchLabel = `🎯 ${score}% Match — Good Fit`; }
        else { matchBadgeClass = "cp-tag-match-low"; matchLabel = `⚠️ ${score}% Match — Low Fit`; }
      }

      const matchedSkills = matchData?.matchedSkills || [];
      const missingSkills = matchData?.missingSkills || [];

      const justSaved = Boolean(matchData?.justSaved);
      const trackedText = justSaved ? "✓ Saved to Job Inbox" : "✓ Already in Job Inbox";

      container.innerHTML = `
        ${renderHeaderMarkup()}

        <div class="cp-body">
          <div class="cp-title">${title}</div>
          <div class="cp-company">
            <span>${company}</span>
            ${location ? `<span class="cp-location">· 📍 ${location}</span>` : ""}
          </div>

          <div class="cp-badges">
            ${isTracked ? `<span class="cp-tag cp-tag-tracked">${trackedText}</span> <span class="cp-tag cp-tag-info">Status: ${appStatus}</span>` : `<span class="cp-tag ${matchBadgeClass}">${matchLabel}</span>`}
            ${workplaceType ? `<span class="cp-tag cp-tag-info">🏢 ${workplaceType}</span>` : ""}
            ${salary ? `<span class="cp-tag cp-tag-info">💰 ${salary}</span>` : ""}
          </div>

          ${
            matchedSkills.length > 0 || missingSkills.length > 0
              ? `
            <div class="cp-card-section">
              <div class="cp-section-title">Skills & Requirements Match</div>
              <div class="cp-skills-list">
                ${matchedSkills.slice(0, 4).map(s => `<span class="cp-skill-pill cp-skill-matched">✓ ${typeof s === 'object' ? s.skillName || s.name : s}</span>`).join("")}
                ${missingSkills.slice(0, 3).map(s => `<span class="cp-skill-pill cp-skill-missing">! ${typeof s === 'object' ? s.skillName || s.name : s}</span>`).join("")}
              </div>
            </div>
            `
              : ""
          }
        </div>

        <div class="cp-actions" style="flex-direction: column; gap: 8px;">
          ${!isTracked ? `<div style="font-size:13px; font-weight:600; color:#f8fafc; text-align:center; margin-bottom:4px;">Save this job to Job Inbox?</div>` : ""}
          <div style="display:flex; gap:10px; width:100%;">
            ${
              isTracked
                ? `<button class="cp-btn cp-btn-primary" id="cp-open-app-btn" style="flex:1;">View in Job Inbox</button>`
                : `<button class="cp-btn cp-btn-primary" id="cp-track-btn" style="flex:1;">Save to Job Inbox</button>`
            }
            ${!isTracked ? `<button class="cp-btn cp-btn-secondary" id="cp-ignore-btn" style="flex:1;">Dismiss</button>` : ""}
          </div>
        </div>
      `;

      shadowRoot.appendChild(container);
      shadowRoot.querySelector("#cp-close")?.addEventListener("click", removeOverlay);
      shadowRoot.querySelector("#cp-collapse")?.addEventListener("click", () => renderOverlayState({ state: "COLLAPSED" }));
      shadowRoot.querySelector("#cp-ignore-btn")?.addEventListener("click", () => {
        removeOverlay();
        if (typeof onIgnore === "function") onIgnore(jobContext);
      });

      if (shadowRoot.querySelector("#cp-open-app-btn")) {
        shadowRoot.querySelector("#cp-open-app-btn").addEventListener("click", () => {
          const targetUrl = appId ? `${DEFAULT_APP_URL}/applications/${appId}` : `${DEFAULT_APP_URL}/jobs/inbox`;
          window.open(targetUrl, "_blank");
        });
      }

      if (shadowRoot.querySelector("#cp-track-btn")) {
        shadowRoot.querySelector("#cp-track-btn").addEventListener("click", () => {
          if (typeof onConfirm === "function") {
            renderOverlayState({ state: "EXTRACTING", jobContext });
            onConfirm(jobContext)
              .then((res) => {
                const updatedApp = res?.application || res;
                renderOverlayState({
                  state: "READY",
                  jobContext,
                  matchData: { ...matchData, existing: true, application: updatedApp, justSaved: true }
                });
              })
              .catch((err) => {
                if (err.type === "AUTH_REQUIRED") {
                  renderOverlayState({
                    state: "UNAUTHENTICATED",
                    jobContext,
                    errorData: err
                  });
                } else {
                  renderOverlayState({
                    state: "ERROR",
                    jobContext,
                    errorData: err,
                    onRetry: () => onConfirm(jobContext)
                  });
                }
              });
          }
        });
      }
    }
  }

  function renderIntentOverlay(options = {}) {
    const jobContext = options.jobContext || options;
    renderOverlayState({
      state: "READY",
      jobContext,
      onConfirm: options.onConfirm,
      onIgnore: options.onIgnore,
      onRetry: options.onRetry
    });
  }

  window.__CAREERPILOT_INTENT_OVERLAY__ = {
    renderOverlayState,
    renderIntentOverlay,
    removeOverlay
  };
})();
