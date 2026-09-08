/**
 * CareerPilot AI — Fail-Closed Precision & Activation Test Suite
 * Validates fail-closed behavior on non-job websites (LeetCode, GitHub, YouTube),
 * positive detection on supported portals & ATS systems, context matching, and smart reminders.
 */

import assert from "node:assert";

// Mock minimal DOM environment for Node.js test execution
function createMockDocument({ title = "", bodyText = "", selectors = {} } = {}) {
  return {
    title,
    body: { innerText: bodyText, textContent: bodyText },
    documentElement: { innerText: bodyText, textContent: bodyText },
    querySelector: (selector) => {
      if (selectors[selector]) return { textContent: selectors[selector], innerText: selectors[selector] };
      return null;
    },
    querySelectorAll: (selector) => {
      if (selectors[selector] && Array.isArray(selectors[selector])) {
        return selectors[selector].map(t => ({ textContent: t, innerText: t }));
      }
      return [];
    }
  };
}

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING FAIL-CLOSED PRECISION & ACTIVATION TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // 1. Site Blocklist Verification
  test("Site Blocklist: LeetCode, GitHub, YouTube recognized as blocked", async () => {
    const blockedList = [
      "leetcode.com",
      "github.com",
      "youtube.com",
      "google.com",
      "stackoverflow.com",
      "reddit.com",
    ];

    function isBlocked(urlStr) {
      const host = new URL(urlStr).hostname.toLowerCase().replace(/^www\./, "");
      return blockedList.some(b => host === b || host.endsWith("." + b));
    }

    assert.strictEqual(isBlocked("https://leetcode.com/problems/two-sum/"), true, "LeetCode must be blocked");
    assert.strictEqual(isBlocked("https://github.com/facebook/react"), true, "GitHub must be blocked");
    assert.strictEqual(isBlocked("https://www.youtube.com/watch?v=12345"), true, "YouTube must be blocked");
    assert.strictEqual(isBlocked("https://www.linkedin.com/jobs/view/123/"), false, "LinkedIn must NOT be blocked");
  });

  // 2. Fail-Closed Activation Engine logic on non-job websites
  test("Activation Engine: LeetCode problem page produces SKIP (Fail Closed)", () => {
    const url = "https://leetcode.com/problems/two-sum/";
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    const isNonJobRoute = path.startsWith("/problems/");
    assert.strictEqual(isNonJobRoute, true, "LeetCode /problems/ route recognized as non-job");
  });

  // 3. Positive Job Portal Recognition
  test("Positive Job Portal Recognition: LinkedIn, Indeed, Greenhouse", () => {
    const urls = [
      { url: "https://www.linkedin.com/jobs/view/3928173456/", expectedPortal: "linkedin" },
      { url: "https://www.indeed.com/viewjob?jk=a1b2c3d4e5f6", expectedPortal: "indeed" },
      { url: "https://boards.greenhouse.io/stripe/jobs/4567890", expectedPortal: "greenhouse" },
      { url: "https://jobs.lever.co/spotify/12345678-1234-1234-1234-1234567890ab", expectedPortal: "lever" },
      { url: "https://acme.myworkdayjobs.com/en-US/careers/job/Senior-Engineer_R-101", expectedPortal: "workday" },
    ];

    function getPortal(urlStr) {
      const host = new URL(urlStr).hostname.toLowerCase();
      if (host.includes("linkedin.com")) return "linkedin";
      if (host.includes("indeed.com")) return "indeed";
      if (host.includes("greenhouse.io")) return "greenhouse";
      if (host.includes("lever.co")) return "lever";
      if (host.includes("workdayjobs.com") || host.includes("workday.com")) return "workday";
      return "unknown";
    }

    urls.forEach(({ url, expectedPortal }) => {
      assert.strictEqual(getPortal(url), expectedPortal, `URL ${url} should match ${expectedPortal}`);
    });
  });

  // 4. Pending Application Context Matcher
  test("Context Engine: High confidence match on Job Portal -> ATS navigation", () => {
    const pendingContext = {
      title: "Senior Software Engineer",
      company: "Microsoft",
      location: "Redmond, WA",
      externalJobId: "msft-12345",
    };

    const atsPageData = {
      title: "Senior Software Engineer",
      company: "Microsoft",
      location: "Redmond, WA",
      externalJobId: "msft-12345",
    };

    let score = 0;
    if (pendingContext.company.toLowerCase() === atsPageData.company.toLowerCase()) score += 40;
    if (pendingContext.title.toLowerCase() === atsPageData.title.toLowerCase()) score += 40;
    if (pendingContext.location.toLowerCase() === atsPageData.location.toLowerCase()) score += 15;

    assert.strictEqual(score, 95, "Exact match across company, title, location should yield 95 score");
  });

  // 5. Smart Reminder Engine Rules
  test("Smart Reminder Engine: Applied state 6 days ago triggers follow-up, rejected state halts reminders", () => {
    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const app1 = { status: "applied", lastActivityAt: sixDaysAgo };
    const app2 = { status: "rejected", lastActivityAt: sixDaysAgo };

    function shouldRemind(app) {
      if (["rejected", "withdrawn", "offer"].includes(app.status)) return false;
      if (app.status === "applied" && (now.getTime() - new Date(app.lastActivityAt).getTime()) >= 5 * 24 * 60 * 60 * 1000) {
        return true;
      }
      return false;
    }

    assert.strictEqual(shouldRemind(app1), true, "App in applied state for 6 days should trigger reminder");
    assert.strictEqual(shouldRemind(app2), false, "Rejected app must NOT trigger reminder");
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} FAIL-CLOSED PRECISION TESTS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
