/**
 * CareerPilot AI Extension Popup Script
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
  
  if (!authRes.isAuthenticated) {
    connectionBadge.innerText = "● Disconnected";
    connectionBadge.className = "badge badge-neutral";
    disconnectBtn.classList.add("hidden");
    showState(stateAuth);
    
    document.getElementById("connectAppBtn").onclick = () => {
      const connectUrl = `${DEFAULT_APP_URL}/extension/connect?extensionId=${chrome.runtime.id}`;
      chrome.tabs.create({ url: connectUrl });
    };
    return;
  }

  // Authenticated state
  connectionBadge.innerText = "● Connected";
  connectionBadge.className = "badge badge-success";
  disconnectBtn.classList.remove("hidden");
  disconnectBtn.onclick = async () => {
    await chrome.runtime.sendMessage({ type: "DISCONNECT" });
    initUI();
  };

  // 3. Content Script Extraction Inspection
  try {
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
      return;
    }

    extractedPayload = jobResult.data;
    renderPreview(extractedPayload);
  } catch (err) {
    console.error("[CareerPilot] Unexpected tab extraction failure:", err);
    document.getElementById("injectionErrorMsg").innerText = "Unexpected error inspecting page.";
    document.getElementById("injectionErrorDetail").innerText = `Error: ${err.message}`;
    showState(stateInjectionFailed);
  }
}

async function getJobDataFromTab(tab) {
  // Attempt 1: Direct message to pre-injected content script
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DATA" });
    if (res && res.status) return res;
  } catch (msgErr) {
    console.warn("[CareerPilot] Content script listener not active on tab:", tab.id, msgErr?.message);
  }

  // Attempt 2: Dynamic Injection via chrome.scripting.executeScript
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/content_script.js"],
    });

    // Brief pause for listener registration
    await new Promise((r) => setTimeout(r, 60));

    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DATA" });
    return res || { status: "JOB_NOT_DETECTED", isJobPage: false, reason: "No response from content script." };
  } catch (injErr) {
    console.error("[CareerPilot] chrome.scripting.executeScript failed:", injErr);
    return {
      status: "INJECTION_FAILED",
      isJobPage: false,
      error: injErr.message || "Failed to execute script on tab.",
    };
  }
}

function showState(targetState) {
  const states = [
    document.getElementById("stateLoading"),
    document.getElementById("stateInjectionFailed"),
    document.getElementById("stateNotJob"),
    document.getElementById("stateRestricted"),
    document.getElementById("statePreview"),
    document.getElementById("stateDuplicate"),
    document.getElementById("stateSuccess"),
    document.getElementById("stateAuth"),
  ];
  states.forEach((el) => el && el.classList.add("hidden"));
  if (targetState) targetState.classList.remove("hidden");
}

function renderPreview(payload) {
  const statePreview = document.getElementById("statePreview");
  document.getElementById("previewSource").innerText = (payload.source || "Generic").toUpperCase();
  document.getElementById("previewTitle").innerText = payload.title || "Untitled Role";
  document.getElementById("previewCompany").innerText = payload.company || "Unknown Company";
  document.getElementById("previewLocation").innerText = payload.location || "Location not specified";

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

  // Pre-fill review form
  document.getElementById("editTitle").value = payload.title || "";
  document.getElementById("editCompany").value = payload.company || "";
  document.getElementById("editLocation").value = payload.location || "";
  document.getElementById("editDescription").value = payload.description || "";

  const confidenceBanner = document.getElementById("confidenceBanner");
  const reviewForm = document.getElementById("reviewForm");
  const toggleEditBtn = document.getElementById("toggleEditBtn");

  if (payload.extractionConfidence === "LOW") {
    confidenceBanner.classList.remove("hidden");
    reviewForm.classList.remove("hidden");
    toggleEditBtn.innerText = "Hide Form";
  } else {
    confidenceBanner.classList.add("hidden");
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

  document.getElementById("saveJobBtn").onclick = handleSaveJob;

  showState(statePreview);
}

async function handleSaveJob() {
  const saveBtn = document.getElementById("saveJobBtn");
  if (saveBtn.disabled) return; // Idempotency guard

  saveBtn.disabled = true;
  saveBtn.innerText = "Saving...";

  // Merge edits if form is visible
  const reviewForm = document.getElementById("reviewForm");
  if (!reviewForm.classList.contains("hidden")) {
    extractedPayload.title = document.getElementById("editTitle").value;
    extractedPayload.company = document.getElementById("editCompany").value;
    extractedPayload.location = document.getElementById("editLocation").value;
    extractedPayload.description = document.getElementById("editDescription").value;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "INGEST_JOB",
      payload: extractedPayload,
    });

    if (!response.success) {
      if (response.error?.includes("SESSION_EXPIRED") || response.error?.includes("AUTH_REQUIRED")) {
        initUI();
        return;
      }
      alert(`Ingestion notice: ${response.error}`);
      saveBtn.disabled = false;
      saveBtn.innerText = "Save to CareerPilot";
      return;
    }

    const data = response.data;
    if (data.isDuplicate) {
      renderDuplicateState(data);
    } else {
      renderSuccessState(data);
    }
  } catch (err) {
    alert(`Connection error: ${err.message}`);
    saveBtn.disabled = false;
    saveBtn.innerText = "Save to CareerPilot";
  }
}

function renderDuplicateState(data) {
  const stateDuplicate = document.getElementById("stateDuplicate");
  document.getElementById("dupTitle").innerText = data.job?.title || extractedPayload.title;
  document.getElementById("dupCompany").innerText = data.job?.company || extractedPayload.company;
  document.getElementById("dupStatus").innerText = (data.application?.status || "saved").toUpperCase();
  
  const score = data.matchResult?.overallScore;
  if (typeof score === "number" && score > 0) {
    document.getElementById("dupMatch").innerText = `${score}%`;
  } else {
    document.getElementById("dupMatchContainer").classList.add("hidden");
  }

  document.getElementById("openAppBtn").onclick = () => {
    const appId = data.application?._id;
    const url = appId ? `${DEFAULT_APP_URL}/applications/${appId}` : `${DEFAULT_APP_URL}/jobs/inbox`;
    chrome.tabs.create({ url });
  };

  showState(stateDuplicate);
}

function renderSuccessState(data) {
  const stateSuccess = document.getElementById("stateSuccess");
  
  const score = data.matchScore || data.matchResult?.overallScore;
  if (typeof score === "number" && score > 0) {
    document.getElementById("resMatchScore").innerText = `${score}%`;
  } else {
    document.getElementById("resMatchScore").innerText = "Ready";
  }

  document.getElementById("resResumeVersion").innerText = data.recommendedResume?.name || "Primary Resume";

  document.getElementById("viewAppWorkspaceBtn").onclick = () => {
    const appId = data.application?._id;
    const targetUrl = appId ? `${DEFAULT_APP_URL}/applications/${appId}` : `${DEFAULT_APP_URL}/jobs/inbox`;
    chrome.tabs.create({ url: targetUrl });
  };

  showState(stateSuccess);
}
