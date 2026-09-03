document.addEventListener("DOMContentLoaded", async () => {
  const result = await chrome.storage.local.get(["apiUrl", "appUrl", "token", "user"]);
  
  const apiUrlInput = document.getElementById("apiUrl");
  const appUrlInput = document.getElementById("appUrl");
  const accountBadge = document.getElementById("accountBadge");
  const accountDetail = document.getElementById("accountDetail");
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const status = document.getElementById("status");

  if (result.apiUrl) apiUrlInput.value = result.apiUrl;
  if (result.appUrl) appUrlInput.value = result.appUrl;

  // Render Auth Status
  if (result.token && result.user) {
    accountBadge.innerText = "Connected";
    accountBadge.className = "status-badge badge-connected";
    accountDetail.innerText = `Connected as ${result.user.name || result.user.email} (${result.user.email})`;
    connectBtn.style.display = "none";
    disconnectBtn.style.display = "inline-block";
  } else {
    accountBadge.innerText = "Disconnected";
    accountBadge.className = "status-badge badge-disconnected";
    accountDetail.innerText = "Not connected to a CareerPilot AI account.";
    connectBtn.style.display = "inline-block";
    disconnectBtn.style.display = "none";
  }

  connectBtn.onclick = () => {
    const appUrl = appUrlInput.value.trim() || "http://localhost:5173";
    chrome.tabs.create({ url: `${appUrl}/extension/connect?extensionId=${chrome.runtime.id}` });
  };

  disconnectBtn.onclick = async () => {
    await chrome.storage.local.remove(["token", "user"]);
    window.location.reload();
  };

  document.getElementById("optionsForm").onsubmit = async (e) => {
    e.preventDefault();
    const apiUrl = apiUrlInput.value.trim();
    const appUrl = appUrlInput.value.trim();

    await chrome.storage.local.set({ apiUrl, appUrl });
    status.innerText = "Server settings saved successfully!";
    setTimeout(() => (status.innerText = ""), 3000);
  };
});
