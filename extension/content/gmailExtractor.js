/**
 * CareerPilot AI - Layered Gmail Email Detector & Extractor
 * Provides resilient, layered extraction strategy for opened Gmail messages.
 * Does NOT rely on single CSS class names (which Gmail frequently changes).
 */

(function () {
  function cleanText(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isGmail() {
    return window.location.hostname.includes("mail.google.com");
  }

  // 1. Layered Subject Extraction
  function extractSubject() {
    // Strategy A: Standard Gmail Subject DOM selectors
    const subjectSelectors = [
      "h2.hP",
      "div.ha h2",
      "[data-thread-perm-id] h2",
      "[role='main'] h2.hP",
      "h2[data-legacy-thread-id]",
    ];

    for (const sel of subjectSelectors) {
      const el = document.querySelector(sel);
      if (el && cleanText(el.textContent)) {
        return cleanText(el.textContent);
      }
    }

    // Strategy B: Heading inside main view
    const mainHeading = document.querySelector("div[role='main'] h2");
    if (mainHeading && cleanText(mainHeading.textContent)) {
      return cleanText(mainHeading.textContent);
    }

    // Strategy C: Document title fallback (Gmail document titles: "Subject - Email - Gmail")
    if (document.title && document.title.includes(" - ")) {
      const parts = document.title.split(" - ");
      if (parts[0] && !parts[0].toLowerCase().includes("inbox") && !parts[0].toLowerCase().includes("gmail")) {
        return cleanText(parts[0]);
      }
    }

    return "";
  }

  // 2. Layered Sender Extraction
  function extractSender() {
    let name = "";
    let email = "";

    // Strategy A: Gmail Sender SPAN elements (gD, gN, etc.)
    const senderEls = document.querySelectorAll("span.gD, span.gN, [email]");
    for (const el of senderEls) {
      const elEmail = el.getAttribute("email") || el.getAttribute("data-hovercard-id");
      const elName = el.getAttribute("name") || el.textContent;

      if (elEmail && elEmail.includes("@")) {
        email = cleanText(elEmail);
        name = cleanText(elName || elEmail.split("@")[0]);
        break;
      }
    }

    // Strategy B: Search for email attributes in expanded message headers
    if (!email) {
      const headerEl = document.querySelector("tr.acZ") || document.querySelector("div.gE");
      if (headerEl) {
        const text = headerEl.innerText || headerEl.textContent || "";
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          email = emailMatch[1].toLowerCase();
        }
      }
    }

    let domain = "";
    if (email && email.includes("@")) {
      domain = email.split("@")[1].toLowerCase();
    }

    return { name, email, domain };
  }

  // 3. Layered Body Extraction
  function extractBody() {
    const bodySelectors = [
      "div.a3s.aiL",
      "div.a3s",
      "div[role='gridcell'] div.a3s",
      ".ii.gt",
      "div.gE.iv.gt",
    ];

    let bodyText = "";
    let bodyEl = null;

    for (const sel of bodySelectors) {
      const els = document.querySelectorAll(sel);
      if (els && els.length > 0) {
        // Grab the last opened message body element
        bodyEl = els[els.length - 1];
        bodyText = cleanText(bodyEl.innerText || bodyEl.textContent || "");
        if (bodyText.length > 20) break;
      }
    }

    // Extract links inside email body
    const links = [];
    if (bodyEl) {
      const anchorEls = bodyEl.querySelectorAll("a[href]");
      anchorEls.forEach((a) => {
        const href = a.getAttribute("href");
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("mail.google.com") &&
          !href.includes("google.com/url")
        ) {
          links.push(href);
        }
      });
    }

    return { bodyText: bodyText.substring(0, 10000), links: links.slice(0, 15) };
  }

  // 4. Layered Timestamp Extraction
  function extractTimestamp() {
    const dateSelectors = ["span.g3", "span.g2", "td.g3", "[aria-label*='202']"];
    for (const sel of dateSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const dateStr = el.getAttribute("title") || el.getAttribute("aria-label") || el.textContent;
        if (dateStr) {
          const parsed = Date.parse(dateStr);
          if (!isNaN(parsed)) {
            return new Date(parsed).toISOString();
          }
        }
      }
    }
    return new Date().toISOString();
  }

  // 5. Layered Message ID & Thread ID Extraction
  function extractMessageIds(subject, senderEmail, timestamp) {
    let messageId = "";
    let threadId = "";

    // Strategy A: DOM attributes
    const emailView =
      document.querySelector("div.gs") ||
      document.querySelector("div.gE.iv.gt") ||
      document.querySelector("div.a3s.aiL")?.closest("div.gs") ||
      document.querySelector("[data-message-id]");

    if (emailView) {
      messageId =
        emailView.getAttribute("data-legacy-message-id") ||
        emailView.getAttribute("data-message-id") ||
        "";
    }

    // Strategy B: URL hash pattern (#inbox/FMfcgzG... or #search/.../FMfcgzG...)
    const hashMatch = window.location.hash.match(
      /#(?:inbox|all|sent|search\/[^\/]+|category\/[^\/]+|label\/[^\/]+)\/([a-zA-Z0-9]+)/
    );
    if (hashMatch) {
      threadId = hashMatch[1];
      if (!messageId) messageId = threadId;
    }

    // Strategy C: Deterministic Fallback Hash
    if (!messageId) {
      const hashStr = `${subject}-${senderEmail}-${timestamp}`;
      let hash = 0;
      for (let i = 0; i < hashStr.length; i++) {
        hash = (hash << 5) - hash + hashStr.charCodeAt(i);
        hash |= 0;
      }
      messageId = `msg-${Math.abs(hash)}`;
    }

    if (!threadId) threadId = messageId;

    return { messageId, threadId };
  }

  // 6. Extracts Company & Role hints directly from subject and body
  function extractHints(subject, bodyText) {
    let extractedCompanyHints = "";
    let extractedRoleHints = "";

    // Search bodyText for "applying for the <Role> position at <Company>"
    const applyingAtMatch = bodyText.match(
      /(?:applying|applied|application)\s+for\s+(?:the\s+)?(.+?)\s+position\s+at\s+([A-Z0-9\s&.\-]+?)(?:\.|\,|\s+and|\s+if|\s+our|\n|$)/i
    );
    if (applyingAtMatch) {
      extractedRoleHints = cleanText(applyingAtMatch[1]);
      extractedCompanyHints = cleanText(applyingAtMatch[2]);
    }

    // Fallback: Pattern "<Role> at <Company>" in body or subject
    if (!extractedCompanyHints || !extractedRoleHints) {
      const roleAtCompMatch = (subject + " " + bodyText).match(
        /([A-Z][A-Za-z0-9\s\-]+(?:Developer|Engineer|Manager|Intern|Fresher|Analyst|Designer|Lead|Specialist))\s+at\s+([A-Z0-9\s&.\-]+?)(?:\.|\,|\s+and|\n|$)/i
      );
      if (roleAtCompMatch) {
        if (!extractedRoleHints) extractedRoleHints = cleanText(roleAtCompMatch[1]);
        if (!extractedCompanyHints) extractedCompanyHints = cleanText(roleAtCompMatch[2]);
      }
    }

    return { extractedCompanyHints, extractedRoleHints };
  }

  // Primary Extraction Method
  function extractOpenedGmailMessage() {
    if (!isGmail()) return null;

    const subject = extractSubject();
    const { name: senderName, email: senderEmail, domain: senderDomain } = extractSender();
    const { bodyText, links } = extractBody();
    const timestamp = extractTimestamp();

    if (!subject && !bodyText) {
      return null;
    }

    const { messageId, threadId } = extractMessageIds(subject, senderEmail, timestamp);
    const { extractedCompanyHints, extractedRoleHints } = extractHints(subject, bodyText);

    return {
      provider: "gmail",
      messageId,
      threadId,
      senderName,
      senderEmail,
      senderDomain,
      recipients: "",
      subject,
      bodyText,
      receivedAt: timestamp,
      links,
      attachmentsMetadata: [],
      extractedCompanyHints,
      extractedRoleHints,
    };
  }

  window.__CAREERPILOT_GMAIL_EXTRACTOR__ = {
    isGmail,
    extractOpenedGmailMessage,
  };
})();
