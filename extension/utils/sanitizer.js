/**
 * Sanitizer utility for CareerPilot AI Extension.
 */

export function cleanText(str) {
  if (!str || typeof str !== "string") return "";
  // Remove non-printable characters & extra whitespaces
  return str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(htmlStr) {
  if (!htmlStr || typeof htmlStr !== "string") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlStr;
  return cleanText(tmp.textContent || tmp.innerText || "");
}

export function sanitizeJobUrl(rawUrl = "") {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const url = new URL(rawUrl);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "refId",
      "trackingId",
      "trk",
      "currentJobId",
    ];
    trackingParams.forEach((p) => url.searchParams.delete(p));
    return url.toString();
  } catch (e) {
    return rawUrl.trim();
  }
}
