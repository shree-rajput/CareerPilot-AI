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

  function getAssetUrl(path) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {}
    return "";
  }

  function renderGmailOverlay({ response, onConfirm, onUndo, onIgnore, onAddUntracked }) {
    removeExistingOverlay();

    if (!response || response.status === "NOT_APPLICATION_RELEVANT" || response.status === "FORBIDDEN_TRANSITION") {
      return;
    }

    const container = document.createElement("div");
    container.id = "careerpilot-gmail-overlay";
    container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 99999;
      width: 340px;
      background: radial-gradient(circle at top left, rgba(2, 132, 199, 0.15), transparent 70%), #0b0f19;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      padding: 16px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(16px);
    `;

    const logoUrl = getAssetUrl("assets/logo.png");

    const statusColors = {
      interview: { bg: "rgba(37, 99, 235, 0.2)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.4)" },
      oa: { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.4)" },
      offer: { bg: "rgba(16, 185, 129, 0.2)", text: "#34d399", border: "rgba(16, 185, 129, 0.4)" },
      rejected: { bg: "rgba(244, 63, 94, 0.2)", text: "#f87171", border: "rgba(244, 63, 94, 0.4)" },
      applied: { bg: "rgba(2, 132, 199, 0.2)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" },
    };

    const status = response.classified?.detectedStatus || "applied";
    const style = statusColors[status] || statusColors.applied;
    const app = response.application;
    const classified = response.classified;

    const iconUrl = getAssetUrl("assets/icon48.png") || getAssetUrl("assets/icon128.png");

    const headerMarkup = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${iconUrl ? `<img src="${iconUrl}" width="22" height="22" alt="CareerPilot Logo" style="object-fit: contain; border-radius: 6px;" />` : `<div style="color: #38bdf8;">⚡</div>`}
          <span style="font-weight: 800; color: #38bdf8; font-size: 13px;">CareerPilot AI</span>
          <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #38bdf8; background: rgba(2, 132, 199, 0.2); padding: 2px 6px; border-radius: 4px;">Gmail Sync</span>
        </div>
        <button id="cp-close-overlay" style="background: none; border: none; cursor: pointer; color: #64748b; font-size: 14px; padding: 2px 6px;">✕</button>
      </div>
    `;

    let contentHtml = "";

    if (response.status === "AUTOMATIC_UPDATE") {
      contentHtml = `
        ${headerMarkup}
        <h4 style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #f8fafc;">${app?.company || classified?.detectedCompany || "Job Application"}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">${app?.role || classified?.detectedRole || "Software Position"}</p>
        
        <div style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 6px 10px; border-radius: 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 10px;">
          Detected Stage: ${status.toUpperCase()}
        </div>

        <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 12px 0; font-style: italic; line-clamp: 2;">"${classified?.evidenceSnippet || "Email event detected"}"</p>

        <div style="display: flex; gap: 8px;">
          <button id="cp-undo-btn" style="flex: 1; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 11px;">Undo Update</button>
        </div>
      `;
    } else if (response.status === "UNTRACKED_APPLICATION" || response.status === "NO_MATCHING_APPLICATION") {
      contentHtml = `
        ${headerMarkup}
        <h4 style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #f8fafc;">${classified?.detectedCompany || "Job Application"}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">${classified?.detectedRole || "Position"}</p>
        
        <div style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 6px 10px; border-radius: 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 10px;">
          Discovered Stage: ${status.toUpperCase()}
        </div>

        <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 12px 0; font-style: italic;">"${classified?.evidenceSnippet || "Email event detected"}"</p>

        <div style="display: flex; gap: 8px;">
          <button id="cp-add-untracked-btn" style="flex: 1; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 11px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">Add to Workspace</button>
          <button id="cp-ignore-untracked-btn" style="flex: 1; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 11px;">Ignore</button>
        </div>
      `;
    } else if (response.status === "SUGGESTION_CREATED") {
      contentHtml = `
        ${headerMarkup}
        <h4 style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #f8fafc;">${app?.company || "Job Application"}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">${app?.role || "Software Position"}</p>
        
        <div style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}; padding: 6px 10px; border-radius: 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 10px;">
          Suggested Stage: ${status.toUpperCase()}
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button id="cp-confirm-btn" style="flex: 1; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 11px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">Confirm Update</button>
          <button id="cp-ignore-btn" style="flex: 1; background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 11px;">Ignore</button>
        </div>
      `;
    } else if (response.status === "ALREADY_PROCESSED") {
      contentHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-weight: 600; color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(52, 211, 153, 0.3);">✓ Recorded in CareerPilot Timeline</span>
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
    document.getElementById("cp-add-untracked-btn")?.addEventListener("click", () => {
      const payload = {
        messageId: response.record?.messageId || response.classified?.messageId || "",
        company: classified?.detectedCompany || "Job Application",
        role: classified?.detectedRole || "Position",
        detectedStatus: classified?.detectedStatus || "applied",
        eventType: classified?.eventType || "APPLICATION_RECEIVED",
        evidence: classified?.evidenceSnippet || "",
        source: "email_auto_discovered",
      };
      chrome.runtime.sendMessage({ type: "CREATE_APPLICATION_FROM_EMAIL", payload }, (res) => {
        if (res?.success) {
          onAddUntracked?.(res.data);
        }
      });
      removeExistingOverlay();
    });
    document.getElementById("cp-ignore-untracked-btn")?.addEventListener("click", removeExistingOverlay);

    // Auto dismiss after 20 seconds
    setTimeout(() => {
      removeExistingOverlay();
    }, 20000);
  }

  window.__CAREERPILOT_GMAIL_OVERLAY__ = {
    renderGmailOverlay,
    removeExistingOverlay,
  };
})();
