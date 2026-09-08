/**
 * CareerPilot AI Extension Popup Script
 * Universal Job Capture & Gmail Application Lifecycle Detection
 */

let extractedPayload = null;
const DEFAULT_APP_URL = "http://localhost:5173";

document.addEventListener("DOMContentLoaded", async () => {
  initUI();
});

async function initUI() {
  const stateLoading = document.getElementById("stateLoading");
  const stateNotJob = document.getElementById("stateNotJob");
  const stateRestricted = document.getElementById("stateRestricted");
  const stateInjectionFailed = document.getElementById("stateInjectionFailed");
  const statePreview = document.getElementById("statePreview");
  const stateGmailEmail = document.getElementById("stateGmailEmail");
  const stateAuth = document.getElementById("stateAuth");
  const connectionBadge = document.getElementById("connectionBadge");
  const disconnectBtn = document.getElementById("disconnectBtn");

  // 1. Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    showState(stateNotJob);
    return;
  }

  // Check for restricted Chrome internal URLs
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:") ||
    tab.url.includes("chromewebstore.google.com")
  ) {
    connectionBadge.innerText = "● Restricted";
    connectionBadge.className = "badge badge-neutral";
    showState(stateRestricted);
    return;
  }

  // 2. Check authentication status
  const authRes = await chrome.runtime.sendMessage({ type: "CHECK_AUTH" }).catch(() => ({ isAuthenticated: false }));

  window.isAuthenticated = authRes.isAuthenticated;

  if (!authRes.isAuthenticated) {
    connectionBadge.innerText = "● Disconnected";
    connectionBadge.className = "badge badge-neutral";
    disconnectBtn.classList.add("hidden");

    // Do NOT halt page inspection. We still want to extract the job.
    // The user will be prompted to sign in when they try to Save.
  } else {
    connectionBadge.innerText = "● Connected";
    connectionBadge.className = "badge badge-success";
    disconnectBtn.classList.remove("hidden");
    disconnectBtn.onclick = async () => {
      await chrome.runtime.sendMessage({ type: "DISCONNECT" });
      initUI();
    };
  }



async function getJobDataFromTab(tab) {
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DATA" });
    if (!res) {
      return { status: "CONTENT_SCRIPT_UNAVAILABLE", isJobPage: false, reason: "Content script unavailable." };
    }
    return res;
  } catch (err) {
    return { status: "INJECTION_FAILED", isJobPage: false, error: err.message || "Could not communicate with tab." };
  }
}

  // 3. Page Context & Extraction Inspection
  try {
    const isGmailTab = tab.url.includes("mail.google.com");

    // Fetch tab context state machine status
    const tabContextRes = await chrome.runtime.sendMessage({ type: "GET_TAB_JOB_CONTEXT", tabId: tab.id }).catch(() => null);
    const tabContext = tabContextRes?.jobContext;

    const jobResult = await getJobDataFromTab(tab);

    if (jobResult.status === "INJECTION_FAILED") {
      document.getElementById("injectionErrorMsg").innerText = "CareerPilot couldn't access this page tab.";
      document.getElementById("injectionErrorDetail").innerText = `Error: ${jobResult.error || "Script injection failed"}`;
      document.getElementById("retryInjectionBtn").onclick = () => initUI();
      showState(stateInjectionFailed);
      return;
    }

    if (!jobResult || !jobResult.isJobPage) {
      document.getElementById("notJobMsg").innerText =
        jobResult?.reason || "This page doesn't appear to contain an active job posting.";
      showState(stateNotJob);
      
      const forceBtn = document.getElementById("forceManualCaptureBtn");
      if (forceBtn) {
        forceBtn.onclick = () => {
          extractedPayload = jobResult?.data || {
            source: "manual_override",
            title: "", company: "", location: "", description: "", extractionConfidence: "LOW"
          };
          renderPreview(extractedPayload, tabContext);
        };
      }
      return;
    }

    extractedPayload = jobResult.data;
    if (tabContext) {
      extractedPayload.state = tabContext.state;
    }
    renderPreview(extractedPayload, tabContext);
  } catch (err) {
    console.error("[CareerPilot] Unexpected tab extraction failure:", err);
    document.getElementById("injectionErrorMsg").innerText = "Unexpected error inspecting page.";
    document.getElementById("injectionErrorDetail").innerText = `Error: ${err.message}`;
    showState(stateInjectionFailed);
  }
}

async function renderGmailState(tab, initialResult = null) {
  const stateGmailEmail = document.getElementById("stateGmailEmail");
  showState(stateGmailEmail);

  // Request extracted Gmail message from tab
  let emailData = initialResult?.emailData;
  if (!emailData) {
    try {
      emailData = await chrome.tabs.sendMessage(tab.id, { type: "GET_GMAIL_EVENT" });
    } catch (e) {
      // Silently ignore connection errors here as they are expected before injection
    }
  }

  if (!emailData || (!emailData.subject && !emailData.bodyText)) {
    document.getElementById("gmailExtractedCompany").innerText = "No Email Message Opened";
    document.getElementById("gmailExtractedRole").innerText = "Open a job application email in Gmail to inspect.";
    document.getElementById("gmailEventType").innerText = "N/A";
    document.getElementById("gmailTargetStatus").innerText = "NONE";
    document.getElementById("gmailSenderText").innerText = "N/A";
    document.getElementById("gmailMatchText").innerText = "Open an application email in your inbox.";
    document.getElementById("gmailProcessBtn").disabled = true;
    return;
  }

  // Populate extracted fields
  document.getElementById("gmailSenderText").innerText = emailData.senderEmail || emailData.senderName || "Unknown Sender";

  // Send to backend via background worker
  try {
    const backendRes = await chrome.runtime.sendMessage({
      type: "PROCESS_EMAIL_EVENT",
      payload: emailData,
    });

    const data = backendRes?.data || {};
    const classified = data.classified || {};
    const matchResult = data.matchResult || {};

    const company = classified.detectedCompany || emailData.extractedCompanyHints || "Unknown Company";
    const role = classified.detectedRole || emailData.extractedRoleHints || "Unknown Role";
    const eventType = (classified.eventType || "APPLICATION_RECEIVED").replace(/_/g, " ");
    const targetStatus = (classified.detectedStatus || "applied").toUpperCase();
    const eventConfidence = classified.eventConfidence || "HIGH";

    document.getElementById("gmailExtractedCompany").innerText = company;
    document.getElementById("gmailExtractedRole").innerText = role;
    document.getElementById("gmailEventType").innerText = eventType;
    document.getElementById("gmailTargetStatus").innerText = targetStatus;

    const confBadge = document.getElementById("gmailConfidenceBadge");
    confBadge.innerText = `${eventConfidence} Confidence`;
    confBadge.className = eventConfidence === "HIGH" ? "badge badge-success" : "badge badge-info";

    // Setup diagnostics panel
    const debugPanel = document.getElementById("gmailDebugPanel");
    debugPanel.innerText = JSON.stringify(
      {
        context: "GMAIL_EMAIL",
        extractedSubject: emailData.subject,
        extractedSender: emailData.senderEmail,
        extractedCompany: company,
        extractedRole: role,
        detectedEvent: classified.eventType,
        detectedStatus: classified.detectedStatus,
        eventConfidence: classified.eventConfidence,
        matchResultStatus: data.status,
        matchConfidence: matchResult.confidence,
        matchSignals: matchResult.matchSignals,
      },
      null,
      2
    );

    document.getElementById("toggleDebugBtn").onclick = () => {
      debugPanel.classList.toggle("hidden");
    };

    // Handle Match Outcomes
    const matchText = document.getElementById("gmailMatchText");
    const ambSelector = document.getElementById("gmailAmbiguousSelector");
    const processBtn = document.getElementById("gmailProcessBtn");

    if (data.status === "ALREADY_PROCESSED") {
      matchText.innerHTML = `✓ <strong>Already Processed</strong>: Email event recorded in timeline.`;
      ambSelector.classList.add("hidden");
      processBtn.disabled = true;
      processBtn.innerText = "✓ Application Updated";
    } else if (data.status === "AUTOMATIC_UPDATE") {
      matchText.innerHTML = `✓ Matched application: <strong>${data.application?.company} — ${data.application?.role}</strong>`;
      ambSelector.classList.add("hidden");
      processBtn.disabled = true;
      processBtn.innerText = "✓ Status Updated to " + targetStatus;
    } else if (data.status === "AMBIGUOUS_MATCH") {
      matchText.innerHTML = `⚠️ <strong>Ambiguous Match</strong>: Multiple candidate applications found.`;
      ambSelector.classList.remove("hidden");
      const select = document.getElementById("gmailAppSelect");
      select.innerHTML = (data.matchingCandidates || [])
        .map((c) => `<option value="${c._id}">${c.company} — ${c.role} (${c.status.toUpperCase()})</option>`)
        .join("");
      processBtn.disabled = false;
      processBtn.innerText = "Confirm Update for Selected App";
      processBtn.onclick = async () => {
        const selectedAppId = select.value;
        if (!selectedAppId) return;
        processBtn.disabled = true;
        processBtn.innerText = "Updating...";
        const res = await chrome.runtime.sendMessage({
          type: "UPDATE_APPLICATION_STATUS",
          payload: {
            applicationId: selectedAppId,
            targetStatus: classified.detectedStatus || "applied",
            source: "user_confirmation",
            evidence: classified.evidenceSnippet || "",
          },
        });
        if (res?.success) {
          matchText.innerHTML = `✓ <strong>Status Updated</strong> to ${targetStatus}`;
          processBtn.innerText = "✓ Updated";
        } else {
          alert(`Update failed: ${res?.error}`);
          processBtn.disabled = false;
          processBtn.innerText = "Confirm Update for Selected App";
        }
      };
    } else if (data.status === "NO_MATCHING_APPLICATION" || data.status === "UNTRACKED_APPLICATION") {
      matchText.innerHTML = `ℹ️ No existing workspace application matched. Click below to add this application to CareerPilot.`;
      ambSelector.classList.add("hidden");
      processBtn.disabled = false;
      processBtn.innerText = "Create New Application from Email";
      processBtn.onclick = async () => {
        processBtn.disabled = true;
        processBtn.innerText = "Creating Application...";
        const createRes = await chrome.runtime.sendMessage({
          type: "CREATE_APPLICATION_FROM_EMAIL",
          payload: {
            messageId: emailData.messageId,
            company,
            role,
            detectedStatus: classified.detectedStatus || "applied",
            eventType: classified.eventType || "APPLICATION_RECEIVED",
            evidence: classified.evidenceSnippet || "",
            source: "email_auto_discovered",
          },
        });
        if (createRes?.success) {
          matchText.innerHTML = `✓ <strong>Application Created</strong> for ${company} — ${role} (${targetStatus})`;
          processBtn.innerText = "✓ Application Added";
        } else {
          alert(`Creation failed: ${createRes?.error}`);
          processBtn.disabled = false;
          processBtn.innerText = "Create New Application from Email";
        }
      };
    } else {
      matchText.innerHTML = `Event detected: <strong>${eventType}</strong>`;
      ambSelector.classList.add("hidden");
      processBtn.disabled = false;
      processBtn.innerText = "Update Application Status";
    }
  } catch (err) {
    console.error("[CareerPilot] Gmail backend event processing error:", err);
  }
}

async function getJobDataFromTab(tab, isManualInspect = false) {
  const timeoutMs = 2500;
  
  const sendMessageWithTimeout = (tabId, message) => {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error("CONTENT_SCRIPT_TIMEOUT"));
        }
      }, timeoutMs);
      
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(new Error("CONTENT_SCRIPT_MISSING"));
          } else {
            resolve(response);
          }
        }
      });
    });
  };

  const messageType = isManualInspect ? "ON_DEMAND_INSPECT" : "GET_JOB_DATA";

  try {
    const res = await sendMessageWithTimeout(tab.id, { type: messageType });
    if (res && res.status) return res;
  } catch (err) {
    if (err.message === "CONTENT_SCRIPT_TIMEOUT") {
      return { status: "INSPECTION_FAILED", isJobPage: false, reason: "CareerPilot could not inspect this page in time." };
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "utils/logger.js",
        "utils/siteBlocklist.js",
        "utils/circuitBreaker.js",
        "utils/contextEngine.js",
        "adapters/portalRegistry.js",
        "adapters/linkedinAdapter.js",
        "adapters/indeedAdapter.js",
        "adapters/naukriAdapter.js",
        "adapters/wellfoundAdapter.js",
        "adapters/glassdoorAdapter.js",
        "adapters/greenhouseAdapter.js",
        "adapters/leverAdapter.js",
        "adapters/workdayAdapter.js",
        "adapters/ashbyAdapter.js",
        "adapters/smartrecruitersAdapter.js",
        "adapters/icimsAdapter.js",
        "adapters/taleoAdapter.js",
        "adapters/jobviteAdapter.js",
        "adapters/bamboohrAdapter.js",
        "adapters/genericAdapter.js",
        "adapters/collegePortalAdapter.js",
        "content/contextDetector.js",
        "content/intentDetector.js",
        "content/intentOverlay.js",
        "content/gmailExtractor.js",
        "content/gmailOverlay.js",
        "content/activationEngine.js",
        "content/content_script.js",
      ],
    });

    await new Promise((r) => setTimeout(r, 80));
    const res = await sendMessageWithTimeout(tab.id, { type: messageType });
    return res || { status: "JOB_NOT_DETECTED", isJobPage: false, reason: "No response from content script." };
  } catch (injErr) {
    console.warn("[CareerPilot] chrome.scripting.executeScript fallback:", injErr.message);
    return {
      status: "INJECTION_FAILED",
      isJobPage: false,
      error: injErr.message || "Failed to execute inspection script on tab.",
    };
  }
}

function showState(targetState) {
  const states = [
    document.getElementById("stateLoading"),
    document.getElementById("stateSaving"),
    document.getElementById("stateInjectionFailed"),
    document.getElementById("stateNetworkError"),
    document.getElementById("stateNotJob"),
    document.getElementById("stateRestricted"),
    document.getElementById("statePreview"),
    document.getElementById("stateGmailEmail"),
    document.getElementById("stateDuplicate"),
    document.getElementById("stateSuccess"),
    document.getElementById("stateAuth"),
  ];
  states.forEach((el) => el && el.classList.add("hidden"));
  if (targetState) targetState.classList.remove("hidden");
}

function renderPreview(payload, tabContext = null) {
  const statePreview = document.getElementById("statePreview");
  document.getElementById("previewSource").innerText = (payload.source || "Generic").toUpperCase();
  document.getElementById("previewTitle").innerText = payload.title || "Untitled Role";
  document.getElementById("previewCompany").innerText = payload.company || "Unknown Company";
  document.getElementById("previewLocation").innerText = payload.location || "Location not specified";

  const currentState = tabContext?.state || payload.state || "JOB_VIEWED";
  const confidenceBanner = document.getElementById("confidenceBanner");

  if (currentState === "APPLICATION_CREATED") {
    confidenceBanner.innerText = "✓ Application tracked in database";
    confidenceBanner.className = "banner banner-success mb-3";
    confidenceBanner.classList.remove("hidden");
  } else if (currentState === "PROMPT_PENDING") {
    confidenceBanner.innerText = "⚡ Application intent detected — prompt active on page";
    confidenceBanner.className = "banner banner-info mb-3";
    confidenceBanner.classList.remove("hidden");
  } else if (currentState === "USER_IGNORED") {
    confidenceBanner.innerText = "ℹ️ Prompt dismissed — Local context only";
    confidenceBanner.className = "banner banner-neutral mb-3";
    confidenceBanner.classList.remove("hidden");
  }

  const workplaceBadge = document.getElementById("previewWorkplace");
  if (payload.workplaceType) {
    workplaceBadge.innerText = payload.workplaceType;
    workplaceBadge.classList.remove("hidden");
  } else {
    workplaceBadge.classList.add("hidden");
  }

  const salaryBadge = document.getElementById("previewSalary");
  if (payload.salary) {
    salaryBadge.innerText = payload.salary;
    salaryBadge.classList.remove("hidden");
  } else {
    salaryBadge.classList.add("hidden");
  }

  document.getElementById("editTitle").value = payload.title || "";
  document.getElementById("editCompany").value = payload.company || "";
  document.getElementById("editLocation").value = payload.location || "";
  document.getElementById("editDescription").value = payload.description || "";

  const reviewForm = document.getElementById("reviewForm");
  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const applyBtn = document.getElementById("applyBtn");

  if (payload.extractionConfidence === "LOW" || (!payload.company || !payload.title)) {
    if (currentState === "JOB_VIEWED") {
      confidenceBanner.classList.remove("hidden");
    }
    reviewForm.classList.remove("hidden");
    toggleEditBtn.innerText = "Hide Form";
  } else {
    if (currentState === "JOB_VIEWED") {
      confidenceBanner.classList.add("hidden");
    }
    reviewForm.classList.add("hidden");
    toggleEditBtn.innerText = "Edit Details";
  }

  toggleEditBtn.onclick = () => {
    const isHidden = reviewForm.classList.contains("hidden");
    if (isHidden) {
      reviewForm.classList.remove("hidden");
      toggleEditBtn.innerText = "Hide Form";
    } else {
      reviewForm.classList.add("hidden");
      toggleEditBtn.innerText = "Edit Details";
    }
  };

  if (applyBtn) {
    applyBtn.onclick = () => handleApply();
  }

  showState(statePreview);
}

async function handleApply() {
  if (!window.isAuthenticated) {
    showState(document.getElementById("stateAuth"));
    return;
  }

  // Update extracted payload with user edits if present
  const editTitleVal = document.getElementById("editTitle")?.value?.trim() || "";
  const editCompanyVal = document.getElementById("editCompany")?.value?.trim() || "";
  const editLocationVal = document.getElementById("editLocation")?.value?.trim() || "";
  const editDescriptionVal = document.getElementById("editDescription")?.value?.trim() || "";

  if (editTitleVal) extractedPayload.title = editTitleVal;
  if (editCompanyVal) extractedPayload.company = editCompanyVal;
  if (editLocationVal) extractedPayload.location = editLocationVal;
  if (editDescriptionVal) extractedPayload.description = editDescriptionVal;

  // Validate Minimum Evidence Contract
  const hasMinimumEvidence =
    (extractedPayload.company && extractedPayload.title) ||
    (extractedPayload.title && extractedPayload.url);

  if (!hasMinimumEvidence) {
    const reviewForm = document.getElementById("reviewForm");
    const toggleEditBtn = document.getElementById("toggleEditBtn");
    reviewForm.classList.remove("hidden");
    toggleEditBtn.innerText = "Hide Form";
    alert("Please provide both Job Title and Company Name (or a valid Job URL) before applying.");
    return;
  }

  showState(document.getElementById("stateSaving"));

  const payload = {
    ...extractedPayload,
    role: extractedPayload.title,
    company: extractedPayload.company,
    jobUrl: extractedPayload.url,
    location: extractedPayload.location,
    jobDescription: extractedPayload.description,
    targetStatus: "saved",
    source: "extension_manual_action",
    evidence: "User clicked Apply in Chrome Extension",
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CAPTURE_JOB_REQUEST",
      payload,
    });

    if (!response?.success) {
      if (response?.category === "AUTH" || response?.error === "AUTH_REQUIRED") {
        window.isAuthenticated = false;
        showState(document.getElementById("stateAuth"));
        return;
      }

      const errorMsgEl = document.getElementById("networkErrorMsg");
      const retryBtn = document.getElementById("retryNetworkBtn");

      errorMsgEl.innerText = response?.userMessage || "We couldn't track this application right now. Your job details are safe.";
      retryBtn.onclick = () => handleApply();

      showState(document.getElementById("stateNetworkError"));
      return;
    }

    const data = response.data;
    if (!data.application) {
      data.application = data;
    }

    if (data.isDuplicate || data.existing) {
      renderDuplicateState(data);
    } else {
      renderSuccessState(data);
    }
  } catch (err) {
    const errorMsgEl = document.getElementById("networkErrorMsg");
    const retryBtn = document.getElementById("retryNetworkBtn");
    errorMsgEl.innerText = "We couldn't track this application right now. Your job details are safe.";
    retryBtn.onclick = () => handleApply();
    showState(document.getElementById("stateNetworkError"));
  }
}

function renderDuplicateState(data) {
  const stateDuplicate = document.getElementById("stateDuplicate");
  const appId = data.application?._id;
  const currentStatus = (data.application?.status || "applied").toLowerCase();

  document.getElementById("dupTitle").innerText = data.application?.role || data.job?.title || extractedPayload.title;
  document.getElementById("dupCompany").innerText = data.application?.company || data.job?.company || extractedPayload.company;
  const dupStatusEl = document.getElementById("dupStatus");
  dupStatusEl.innerText = currentStatus.toUpperCase();

  const score = data.matchResult?.overallScore;
  if (typeof score === "number" && score > 0) {
    document.getElementById("dupMatch").innerText = `${score}%`;
  } else {
    document.getElementById("dupMatchContainer").classList.add("hidden");
  }

  document.getElementById("openAppBtn").onclick = () => {
    const url = appId ? `${DEFAULT_APP_URL}/applications/${appId}` : `${DEFAULT_APP_URL}/jobs/inbox`;
    chrome.tabs.create({ url });
  };

  showState(stateDuplicate);
}

function renderSuccessState(data) {
  const stateSuccess = document.getElementById("stateSuccess");
  const appId = data.application?._id;
  const currentStatus = (data.application?.status || "applied").toLowerCase();

  document.getElementById("successRole").innerText = data.application?.role || extractedPayload.title || "Job Application";
  document.getElementById("successCompany").innerText = data.application?.company || extractedPayload.company || "Company";
  document.getElementById("successStatus").innerText = currentStatus.toUpperCase();

  document.getElementById("viewAppWorkspaceBtn").onclick = () => {
    const targetUrl = appId ? `${DEFAULT_APP_URL}/applications/${appId}` : `${DEFAULT_APP_URL}/jobs/inbox`;
    chrome.tabs.create({ url: targetUrl });
  };

  showState(stateSuccess);
}

