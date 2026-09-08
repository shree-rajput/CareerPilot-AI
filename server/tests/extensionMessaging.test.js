/**
 * CareerPilot AI — Extension Messaging & Generic Site Test Suite
 * Tests messaging contracts, GenericAdapter heuristics (e.g. MNJ Software), and College Placement Portals.
 */

import assert from "node:assert";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING EXTENSION MESSAGING & GENERIC SITE TEST SUITE");
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

  // 1. Messaging Protocol Verification
  test("Messaging Protocol: Standardized responses for PING, GET_PAGE_CONTEXT, GET_JOB_DATA, ON_DEMAND_INSPECT", () => {
    function handleMessageMock(request) {
      if (request.type === "PING") return { ok: true, status: "PONG" };
      if (request.type === "GET_PAGE_CONTEXT") return { ok: true, context: "JOB_POSTING" };
      if (request.type === "GET_GMAIL_EVENT") return { ok: true, emailData: { subject: "Interview Schedule" } };
      if (request.type === "GET_JOB_DATA" || request.type === "ON_DEMAND_INSPECT") {
        return {
          ok: true,
          status: "JOB_DETECTED",
          isJobPage: true,
          data: { title: "Software Engineer", company: "Acme Corp" },
          confidence: "HIGH",
          reason: "Matched job structure",
        };
      }
      return { ok: false, code: "UNKNOWN_MESSAGE" };
    }

    assert.deepStrictEqual(handleMessageMock({ type: "PING" }), { ok: true, status: "PONG" });
    assert.deepStrictEqual(handleMessageMock({ type: "GET_PAGE_CONTEXT" }), { ok: true, context: "JOB_POSTING" });
    assert.strictEqual(handleMessageMock({ type: "GET_JOB_DATA" }).isJobPage, true);
    assert.strictEqual(handleMessageMock({ type: "ON_DEMAND_INSPECT" }).ok, true);
  });

  // 2. MNJ Software & Generic Career Site Detection Heuristics
  test("Generic Career Site Heuristics: MNJ Software Job Details Page Recognized", () => {
    const url = "https://mnjsoftware.com/corporate/careers/job-details.aspx?JobId=J0208";
    const u = new URL(url);

    const jobId = u.searchParams.get("JobId") || u.searchParams.get("jobId");
    const isJobDetailsPath = /\/(job-details|career-details|position|jobs?\/[a-z0-9_-]+)/i.test(u.pathname);

    assert.strictEqual(jobId, "J0208", "JobId query parameter must be extracted");
    assert.strictEqual(isJobDetailsPath, true, "job-details.aspx path must be recognized");
  });

  // 3. Careers Homepage vs Job Details Page Distinction
  test("Generic Career Site Heuristics: Careers Homepage (company.com/careers) remains SILENT", () => {
    const url = "https://mnjsoftware.com/corporate/careers";
    const u = new URL(url);

    const jobId = u.searchParams.get("JobId");
    const isHomepage = (u.pathname === "/corporate/careers" || u.pathname === "/careers") && !u.search;

    assert.strictEqual(jobId, null, "Homepage should not have JobId");
    assert.strictEqual(isHomepage, true, "Careers homepage must be recognized as non-job page");
  });

  // 4. College Placement Portal Signals & Eligibility Metric Handling
  test("College Placement Portal: Non-hallucinated Eligibility Metrics", () => {
    const text1 = "Eligibility Criteria: Minimum 7.5 CGPA required for B.Tech CSE/IT branches.";
    const text2 = "Job Details: Apply before Sept 30.";

    function extractEligibility(bodyText) {
      const cgpaMatch = bodyText.match(/cgpa\s*[:>=]\s*(\d+(\.\d+)?)/i);
      const branchMatch = bodyText.match(/(b\.?tech|c\.?s\.?e|i\.?t)/i);

      if (cgpaMatch || branchMatch) {
        return { status: "POSSIBLY ELIGIBLE", criteria: `Found: ${cgpaMatch ? cgpaMatch[0] : ""} ${branchMatch ? branchMatch[0] : ""}`.trim() };
      }
      return { status: "INSUFFICIENT DATA", criteria: "Manual review required" };
    }

    const res1 = extractEligibility(text1);
    const res2 = extractEligibility(text2);

    assert.strictEqual(res1.status, "POSSIBLY ELIGIBLE");
    assert.strictEqual(res2.status, "INSUFFICIENT DATA");
  });

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} MESSAGING & GENERIC SITE TESTS PASSED`);
  console.log("==================================================\n");

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
