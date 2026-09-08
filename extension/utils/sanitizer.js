/**
 * Sanitizer utility for CareerPilot AI Extension.
 * Excludes cookie banners, consent modals, privacy notices, headers, footers, and non-job UI.
 */

export function cleanText(str) {
  if (!str || typeof str !== "string") return "";
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
      "fbclid",
      "gclid",
      "gh_src",
    ];
    trackingParams.forEach((p) => url.searchParams.delete(p));
    return url.toString();
  } catch (e) {
    return rawUrl.trim();
  }
}

/**
 * Strips cookie notices, consent overlays, privacy disclosures, headers, footers, and navigation bars from job descriptions.
 */
export function cleanJobDescriptionText(elementOrText, doc = typeof window !== "undefined" ? window.document : null) {
  let rawText = "";

  if (typeof elementOrText === "string") {
    rawText = elementOrText;
  } else if (elementOrText && elementOrText.cloneNode) {
    const clone = elementOrText.cloneNode(true);

    const EXCLUDED_SELECTORS = [
      '[id*="cookie" i]',
      '[class*="cookie" i]',
      '[id*="consent" i]',
      '[class*="consent" i]',
      '[id*="privacy" i]',
      '[class*="privacy" i]',
      '[id*="banner" i]',
      '[class*="banner" i]',
      '[id*="modal" i]',
      '[class*="modal" i]',
      '[id*="overlay" i]',
      '[class*="overlay" i]',
      '[id*="footer" i]',
      '[class*="footer" i]',
      '[id*="header" i]',
      '[class*="header" i]',
      '[id*="nav" i]',
      '[class*="nav" i]',
      '[role="dialog"]',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="contentinfo"]',
      "header",
      "footer",
      "nav",
    ];

    EXCLUDED_SELECTORS.forEach((sel) => {
      try {
        const nodes = clone.querySelectorAll(sel);
        nodes.forEach((n) => n.remove());
      } catch (e) {}
    });

    rawText = clone.innerText || clone.textContent || "";
  }

  if (!rawText) return "";

  // Filter out standalone cookie/privacy/terms sentences and paragraphs
  const lines = rawText.split(/\r?\n/);
  const filteredLines = lines.filter((line) => {
    const l = line.trim().toLowerCase();
    if (!l) return false;
    if (l.includes("uses cookies") || l.includes("cookie policy") || l.includes("privacy policy")) return false;
    if (l.includes("accept all cookies") || l.includes("manage cookie preferences")) return false;
    if (l.includes("terms of use") || l.includes("terms of service") || l.includes("all rights reserved")) return false;
    return true;
  });

  return cleanText(filteredLines.join("\n"));
}

/**
 * Priority 1 Extraction: Structured JSON-LD JobPosting
 */
export function extractJsonLdJobPosting(doc = typeof window !== "undefined" ? window.document : null) {
  if (!doc) return null;
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const content = script.textContent || script.innerText;
      if (!content) continue;
      const json = JSON.parse(content);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (!item) continue;
        const type = item["@type"];
        if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
          return {
            title: cleanText(item.title || ""),
            description: cleanJobDescriptionText(item.description || ""),
            company: cleanText(item.hiringOrganization?.name || ""),
            location: cleanText(
              typeof item.jobLocation === "string"
                ? item.jobLocation
                : item.jobLocation?.address?.addressLocality ||
                    item.jobLocation?.address?.addressRegion ||
                    item.jobLocation?.address?.addressCountry ||
                    ""
            ),
            employmentType: cleanText(item.employmentType || ""),
            datePosted: cleanText(item.datePosted || ""),
            validThrough: cleanText(item.validThrough || ""),
            identifier: cleanText(item.identifier?.value || item.identifier || ""),
            url: sanitizeJobUrl(item.url || ""),
          };
        }
      }
    } catch (e) {}
  }
  return null;
}

if (typeof window !== "undefined") {
  window.cleanJobDescriptionText = cleanJobDescriptionText;
  window.extractJsonLdJobPosting = extractJsonLdJobPosting;
}
