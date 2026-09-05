/**
 * CareerPilot AI Gmail Notification Overlay
 * Renders non-intrusive floating card in Gmail for detected application lifecycle events.
 */

(function () {
  let existingOverlay = null;

  function removeExistingOverlay() {
    if (existingOverlay) {
      existingOverlay.remove();
      existingOverlay = null;
    }
  }

  function renderGmailOverlay({ response, onConfirm, onUndo, onIgnore }) {
    removeExistingOverlay();

    if (!response || response.status === "NOT_APPLICATION_RELEVANT" || response.status === "FORBIDDEN_TRANSITION") {
      return;
    }

    const container = document.createElement("div");
    container.id = "careerpilot-gmail-overlay";
    container.style.cssText = `
      position: fixed;
      top: 70px;
      right: 24px;
      z-index: 99999;
      width: 320px;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      padding: 14px;
      transition: all 0.2s ease-in-out;
    `;

    const statusColors = {
      interview: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
      oa: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
      offer: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
      rejected: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
      applied: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
    };

    const status = response.classified?.detectedStatus || "applied";
    const style = statusColors[status] || statusColors.applied;
    const app = response.application;
    const classified = response.classified;

    let contentHtml = "";

    if (response.status === "AUTOMATIC_UPDATE") {
      contentHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">CareerPilot Updated Application</span>
          <button id="cp-close-overlay" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px;">✕</button>
        </div>
        <h4 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${app?.company || classified?.detectedCompany || "Job Application"}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${app?.role || classified?.detectedRole || "Software Position"}</p>
        
        <div style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">
          Detected Stage: ${status.toUpperCase()}
        </div>

        <p style="font-size: 11px; color: #475569; margin: 0 0 10px 0; font-style: italic; line-clamp: 2;">"${classified?.evidenceSnippet || "Email event detected"}"</p>

        <div style="display: flex; gap: 8px;">
          <button id="cp-undo-btn" style="flex: 1; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 11px;">Undo Update</button>
        </div>
      `;
    } else if (response.status === "SUGGESTION_CREATED") {
      contentHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #d97706; background: #fffbeb; padding: 2px 6px; border-radius: 4px;">Action Suggested</span>
          <button id="cp-close-overlay" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px;">✕</button>
        </div>
        <h4 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${app?.company || "Job Application"}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">${app?.role || "Software Position"}</p>
        
        <div style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">
          Suggested Stage: ${status.toUpperCase()}
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button id="cp-confirm-btn" style="flex: 1; background: #2563eb; color: #ffffff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 11px;">Confirm Update</button>
          <button id="cp-ignore-btn" style="flex: 1; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 11px;">Ignore</button>
        </div>
      `;
    } else if (response.status === "ALREADY_PROCESSED") {
      contentHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-weight: 600; color: #166534; background: #f0fdf4; padding: 4px 8px; border-radius: 6px; border: 1px solid #bbf7d0;">✓ Recorded in CareerPilot Timeline</span>
          <button id="cp-close-overlay" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px;">✕</button>
        </div>
      `;
    } else {
      return;
    }

    container.innerHTML = contentHtml;
    document.body.appendChild(container);
    existingOverlay = container;

    // Attach Event Listeners
    document.getElementById("cp-close-overlay")?.addEventListener("click", removeExistingOverlay);
    document.getElementById("cp-undo-btn")?.addEventListener("click", () => {
      onUndo?.(response);
      removeExistingOverlay();
    });
    document.getElementById("cp-confirm-btn")?.addEventListener("click", () => {
      onConfirm?.(response);
      removeExistingOverlay();
    });
    document.getElementById("cp-ignore-btn")?.addEventListener("click", () => {
      onIgnore?.(response);
      removeExistingOverlay();
    });

    // Auto dismiss after 15 seconds
    setTimeout(() => {
      removeExistingOverlay();
    }, 15000);
  }

  window.__CAREERPILOT_GMAIL_OVERLAY__ = {
    renderGmailOverlay,
    removeExistingOverlay,
  };
})();
