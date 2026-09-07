/**
 * CareerPilot AI — In-Page Intent Toast Overlay (Shadow DOM)
 * Renders an isolated, non-intrusive prompt toast when application intent is detected.
 * Shadow DOM guarantees zero CSS interference from host site styles.
 */

(function () {
  if (window.__CAREERPILOT_INTENT_OVERLAY__) {
    return;
  }

  let hostElement = null;
  let shadowRoot = null;
  let autoDismissTimer = null;

  function removeOverlay() {
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
    }
    hostElement = null;
    shadowRoot = null;
  }

  function renderIntentOverlay({ jobContext, onConfirm, onEdit, onIgnore, onRetry }) {
    removeOverlay();

    if (!jobContext) return;

    const company = jobContext.company || "Unknown Company";
    const role = jobContext.role || jobContext.title || "Unknown Role";
    const location = jobContext.location || "";

    // 1. Create Shadow Host
    hostElement = document.createElement("div");
    hostElement.id = "careerpilot-intent-toast-host";
    hostElement.style.cssText = "all: initial; position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;";

    shadowRoot = hostElement.attachShadow({ mode: "closed" });

    // 2. Inject Isolated Styles & Markup
    const styleSheet = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      .cp-toast {
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
        padding: 16px;
        animation: cpSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-col;
        gap: 12px;
      }
      @keyframes cpSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .cp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #1e293b;
        padding-bottom: 8px;
      }
      .cp-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #38bdf8;
        letter-spacing: 0.5px;
      }
      .cp-brand-icon {
        width: 18px;
        height: 18px;
        background: #0284c7;
        color: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      .cp-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .cp-close:hover {
        background: #1e293b;
        color: #f8fafc;
      }
      .cp-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cp-question {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cp-role {
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.3;
      }
      .cp-company {
        font-size: 12px;
        font-weight: 500;
        color: #cbd5e1;
      }
      .cp-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }
      .cp-btn {
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .cp-btn-primary {
        background: #0284c7;
        color: #ffffff;
        flex: 1;
      }
      .cp-btn-primary:hover {
        background: #0369a1;
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
      .cp-edit-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cp-input {
        width: 100%;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #f8fafc;
        padding: 6px 10px;
        font-size: 12px;
      }
      .cp-input:focus {
        outline: none;
        border-color: #38bdf8;
      }
      .cp-success {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #4ade80;
        font-size: 13px;
        font-weight: 600;
      }
      .cp-error {
        color: #f87171;
        font-size: 12px;
        font-weight: 500;
      }
    `;

    const container = document.createElement("div");
    container.className = "cp-toast";

    let isEditing = false;

    function updateContent() {
      if (isEditing) {
        container.innerHTML = `
          <div class="cp-header">
            <div class="cp-brand">
              <div class="cp-brand-icon">⚡</div>
              <span>CareerPilot AI — Edit Details</span>
            </div>
            <button class="cp-close" id="cp-cancel-edit">✕</button>
          </div>

          <div class="cp-edit-form">
            <div>
              <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">ROLE</label>
              <input type="text" id="cp-edit-role" class="cp-input" value="${role.replace(/"/g, '&quot;')}" />
            </div>

            <div>
              <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">COMPANY</label>
              <input type="text" id="cp-edit-company" class="cp-input" value="${company.replace(/"/g, '&quot;')}" />
            </div>

            <div>
              <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">LOCATION</label>
              <input type="text" id="cp-edit-location" class="cp-input" value="${location.replace(/"/g, '&quot;')}" />
            </div>

            <div class="cp-actions" style="margin-top: 6px;">
              <button class="cp-btn cp-btn-primary" id="cp-save-edit">Save & Track</button>
              <button class="cp-btn cp-btn-secondary" id="cp-cancel-edit-btn">Cancel</button>
            </div>
          </div>
        `;

        shadowRoot.querySelector("#cp-cancel-edit")?.addEventListener("click", () => { isEditing = false; updateContent(); });
        shadowRoot.querySelector("#cp-cancel-edit-btn")?.addEventListener("click", () => { isEditing = false; updateContent(); });

        shadowRoot.querySelector("#cp-save-edit")?.addEventListener("click", () => {
          const editedRole = shadowRoot.querySelector("#cp-edit-role")?.value || role;
          const editedCompany = shadowRoot.querySelector("#cp-edit-company")?.value || company;
          const editedLocation = shadowRoot.querySelector("#cp-edit-location")?.value || location;

          const updatedContext = {
            ...jobContext,
            role: editedRole,
            title: editedRole,
            company: editedCompany,
            location: editedLocation
          };

          handleTrackingConfirm(updatedContext);
        });
        return;
      }

      // Default Prompt State
      container.innerHTML = `
        <div class="cp-header">
          <div class="cp-brand">
            <div class="cp-brand-icon">⚡</div>
            <span>CareerPilot AI</span>
          </div>
          <button class="cp-close" id="cp-ignore-x">✕</button>
        </div>

        <div class="cp-body">
          <span class="cp-question">Are you applying for this job?</span>
          <div class="cp-role">${role}</div>
          <div class="cp-company">${company}${location ? ` · ${location}` : ''}</div>
        </div>

        <div class="cp-actions">
          <button class="cp-btn cp-btn-primary" id="cp-track-btn">Track Application</button>
          <button class="cp-btn cp-btn-secondary" id="cp-edit-btn">Edit</button>
          <button class="cp-btn cp-btn-secondary" id="cp-ignore-btn">Ignore</button>
        </div>
      `;

      shadowRoot.querySelector("#cp-ignore-x")?.addEventListener("click", handleIgnoreClick);
      shadowRoot.querySelector("#cp-ignore-btn")?.addEventListener("click", handleIgnoreClick);
      shadowRoot.querySelector("#cp-edit-btn")?.addEventListener("click", () => { isEditing = true; updateContent(); });
      shadowRoot.querySelector("#cp-track-btn")?.addEventListener("click", () => handleTrackingConfirm(jobContext));
    }

    function handleIgnoreClick() {
      removeOverlay();
      if (typeof onIgnore === "function") onIgnore(jobContext);
    }

    function handleTrackingConfirm(ctxToSave) {
      container.innerHTML = `
        <div class="cp-header">
          <div class="cp-brand">
            <div class="cp-brand-icon">⚡</div>
            <span>CareerPilot AI</span>
          </div>
        </div>

        <div class="cp-body" style="padding: 12px 0;">
          <div style="font-size: 13px; color: #38bdf8; font-weight: 600;">Tracking application...</div>
        </div>
      `;

      if (typeof onConfirm === "function") {
        onConfirm(ctxToSave)
          .then((res) => {
            container.innerHTML = `
              <div class="cp-header">
                <div class="cp-brand">
                  <div class="cp-brand-icon">⚡</div>
                  <span>CareerPilot AI</span>
                </div>
                <button class="cp-close" id="cp-close-success">✕</button>
              </div>

              <div class="cp-body">
                <div class="cp-success">✓ Application tracked</div>
                <div class="cp-role" style="font-size: 13px; margin-top: 2px;">${ctxToSave.role || ctxToSave.title}</div>
                <div class="cp-company" style="font-size: 11px;">${ctxToSave.company} · Status: Applied</div>
              </div>
            `;

            shadowRoot.querySelector("#cp-close-success")?.addEventListener("click", removeOverlay);
            setTimeout(removeOverlay, 5000);
          })
          .catch((err) => {
            const userMsg = err?.userMessage || err?.message || "We couldn't track this application right now.";
            container.innerHTML = `
              <div class="cp-header">
                <div class="cp-brand">
                  <div class="cp-brand-icon">⚡</div>
                  <span>CareerPilot AI</span>
                </div>
                <button class="cp-close" id="cp-close-error">✕</button>
              </div>

              <div class="cp-body">
                <div class="cp-error">${userMsg}</div>
              </div>

              <div class="cp-actions">
                <button class="cp-btn cp-btn-primary" id="cp-retry-btn">Retry</button>
                <button class="cp-btn cp-btn-secondary" id="cp-cancel-error">Dismiss</button>
              </div>
            `;

            shadowRoot.querySelector("#cp-close-error")?.addEventListener("click", removeOverlay);
            shadowRoot.querySelector("#cp-cancel-error")?.addEventListener("click", removeOverlay);
            shadowRoot.querySelector("#cp-retry-btn")?.addEventListener("click", () => handleTrackingConfirm(ctxToSave));
          });
      }
    }

    const styleEl = document.createElement("style");
    styleEl.textContent = styleSheet;

    shadowRoot.appendChild(styleEl);
    shadowRoot.appendChild(container);
    document.documentElement.appendChild(hostElement);

    updateContent();

    // Auto-dismiss after 25 seconds if left untouched
    autoDismissTimer = setTimeout(() => {
      removeOverlay();
      if (typeof onIgnore === "function") onIgnore(jobContext);
    }, 25000);
  }

  window.__CAREERPILOT_INTENT_OVERLAY__ = {
    renderIntentOverlay,
    removeOverlay
  };
})();
