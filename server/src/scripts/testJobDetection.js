import { JSDOM } from "jsdom";

/**
 * Duplicate of detectJobContext from content_script.js for testing.
 * Uses exact same positive evidence engine.
 */
function detectJobContext(doc, url) {
  if (url.includes("mail.google.com") || url.includes("outlook.live.com")) {
    return {
      isJobContext: false,
      confidence: "LOW",
      score: 0,
      contextType: "APPLICATION_EMAIL",
      detectedPlatform: "gmail",
      reason: "Gmail tab active - Email detection pipeline active",
      evidence: [],
    };
  }

  const urlObj = new URL(url);
  const host = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname.toLowerCase();

  let score = 0;
  const evidence = [];
  const reasons = [];

  if (doc.querySelector('textarea[placeholder*="message" i]') || doc.querySelector('textarea[placeholder*="chat" i]')) {
    score -= 30;
    reasons.push("Presence of conversational chat interface");
  }

  if (doc.querySelector("article") && doc.querySelector('meta[property="article:published_time"]')) {
    score -= 40;
    reasons.push("Page structure matches a published article/blog");
  }

  if (doc.querySelectorAll(".search-result, .g, .yuRUbf").length > 5) {
    score -= 40;
    reasons.push("Layout resembles a generic search engine result page");
  }

  if (doc.querySelector(".question-page") || doc.querySelector(".answercell")) {
    score -= 50;
    reasons.push("Forum / Q&A layout detected");
  }

  let hasJsonLd = false;
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      if (!script.textContent) continue;
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      for (const item of items) {
        if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting")) {
          hasJsonLd = true;
          break;
        }
      }
      if (hasJsonLd) break;
    }
  } catch (e) {}

  if (hasJsonLd) {
    score += 50;
    evidence.push("Valid JSON-LD JobPosting schema found");
  }

  const applyButtons = Array.from(doc.querySelectorAll("button, a, input[type='submit']")).filter(el => {
    const text = (el.value || el.textContent || "").trim().toLowerCase();
    return /^(apply|apply now|easy apply|submit application|apply for this job|apply for this position|submit)$/i.test(text);
  });

  if (applyButtons.length > 0) {
    score += 20;
    evidence.push("Prominent Application button found");
  }

  if (/\/jobs?\//.test(path) || /\/careers?\//.test(path) || /\/vacanc(y|ies)\//.test(path) || /\/requisition\//.test(path) || /jk=|gh_jid=/.test(url)) {
    score += 15;
    evidence.push("URL structure contains career/job posting identifiers");
  }

  const headers = Array.from(doc.querySelectorAll("h1, h2, h3, h4, strong, b")).map(el => (el.textContent || "").toLowerCase());
  const hasReqs = headers.some(t => t.includes("requirements") || t.includes("qualifications") || t.includes("what you'll do") || t.includes("responsibilities"));
  if (hasReqs) {
    score += 15;
    evidence.push("Job requirements/responsibilities section detected");
  }

  if (doc.body && doc.body.textContent && /(\$|€|£)\s*\d{2,3},?\d{3}\s*(-\s*(\$|€|£)?\s*\d{2,3},?\d{3})?/.test(doc.body.textContent)) {
    if (headers.some(t => t.includes("salary") || t.includes("compensation") || t.includes("pay"))) {
      score += 10;
      evidence.push("Compensation/Salary metadata detected");
    }
  }

  let platform = "unknown";
  if (host.includes("linkedin.com")) platform = "linkedin";
  else if (host.includes("indeed.com")) platform = "indeed";
  else if (host.includes("greenhouse.io") || url.includes("gh_jid")) platform = "greenhouse";
  else if (host.includes("lever.co")) platform = "lever";
  else if (host.includes("workday.com") || host.includes("myworkdayjobs.com")) platform = "workday";
  else if (host.includes("ashbyhq.com")) platform = "ashby";
  else if (host.includes("smartrecruiters.com")) platform = "smartrecruiters";
  else if (host.includes("naukri.com")) platform = "naukri";
  else if (host.includes("wellfound.com")) platform = "wellfound";
  else platform = "generic";

  let contextType = "UNKNOWN";
  if (score >= 40) {
    contextType = "JOB_POSTING";
    if (path === "/careers" || path === "/jobs" || path === "/careers/") {
      if (!hasJsonLd && applyButtons.length === 0) {
        contextType = "CAREER_PAGE";
        score -= 20;
        reasons.push("Appears to be a general career landing page, not a specific job");
      }
    }
  } else {
    contextType = "NON_JOB_PAGE";
    reasons.push("Insufficient job evidence");
  }

  let confidence = "LOW";
  if (score >= 70) confidence = "HIGH";
  else if (score >= 40) confidence = "MEDIUM";

  return {
    isJobContext: confidence === "HIGH" || confidence === "MEDIUM",
    isJobPage: confidence === "HIGH" || confidence === "MEDIUM",
    confidence,
    score: Math.max(0, Math.min(100, score)),
    contextType,
    detectedPlatform: platform,
    evidence,
    reason: reasons.join(", ")
  };
}

// ----------------------------------------------------
// TEST SUITE
// ----------------------------------------------------
const testCases = [
  {
    name: "False Positive: ChatGPT Conversation",
    url: "https://chatgpt.com/c/1234-abcd",
    html: `
      <html>
        <body>
          <textarea placeholder="Message ChatGPT"></textarea>
          <div>Hello! I am a developer. I need help.</div>
        </body>
      </html>
    `,
    expectedConfidence: "LOW",
    expectedContext: "NON_JOB_PAGE"
  },
  {
    name: "False Positive: Generic Search Results (Google)",
    url: "https://www.google.com/search?q=frontend+developer+jobs",
    html: `
      <html>
        <body>
          <div class="g">Result 1</div>
          <div class="g">Result 2</div>
          <div class="g">Result 3</div>
          <div class="g">Result 4</div>
          <div class="g">Result 5</div>
          <div class="g">Result 6</div>
        </body>
      </html>
    `,
    expectedConfidence: "LOW",
    expectedContext: "NON_JOB_PAGE"
  },
  {
    name: "False Positive: StackOverflow (Q&A)",
    url: "https://stackoverflow.com/questions/123/how-to-center-div",
    html: `
      <html>
        <body>
          <div class="question-page">
            <div class="answercell">Answer here</div>
          </div>
        </body>
      </html>
    `,
    expectedConfidence: "LOW",
    expectedContext: "NON_JOB_PAGE"
  },
  {
    name: "False Positive: Blog Article",
    url: "https://medium.com/@user/how-to-get-a-software-engineering-job-12345",
    html: `
      <html>
        <head>
          <meta property="article:published_time" content="2024-01-01" />
        </head>
        <body>
          <article>
            <h1>How to get a Software Engineering Job</h1>
            <p>You need good qualifications and requirements...</p>
          </article>
        </body>
      </html>
    `,
    expectedConfidence: "LOW",
    expectedContext: "NON_JOB_PAGE"
  },
  {
    name: "False Negative (Generic Capture): Unknown Custom ATS",
    url: "https://unknown-company.com/jobs/frontend-engineer-4092",
    html: `
      <html>
        <body>
          <h1>Frontend Engineer</h1>
          <h2>Requirements</h2>
          <ul><li>React</li></ul>
          <h2>Compensation</h2>
          <p>$100,000 - $120,000</p>
          <button>Apply Now</button>
        </body>
      </html>
    `,
    expectedConfidence: "MEDIUM",
    expectedContext: "JOB_POSTING" // Path /jobs/, Requirements, Compensation, Apply Now = 15+15+10+20 = 60 (MEDIUM)
  },
  {
    name: "High Confidence Generic: Unknown ATS with JSON-LD",
    url: "https://random.co/careers/123",
    html: `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Software Engineer"
            }
          </script>
        </head>
        <body>
          <button>Apply for this job</button>
        </body>
      </html>
    `,
    expectedConfidence: "HIGH",
    expectedContext: "JOB_POSTING" // JSON-LD (50) + Apply Button (20) + Path (15) = 85 (HIGH)
  }
];

async function runTests() {
  console.log("==========================================");
  console.log("GENERIC JOB CONTEXT DETECTION TESTS");
  console.log("==========================================\n");

  let passed = 0;
  for (const t of testCases) {
    const dom = new JSDOM(t.html, { url: t.url });
    const result = detectJobContext(dom.window.document, t.url);

    const matchConfidence = result.confidence === t.expectedConfidence;
    const matchContext = result.contextType === t.expectedContext;

    if (matchConfidence && matchContext) {
      console.log(`✅ PASS: ${t.name}`);
      console.log(`   Confidence: ${result.confidence} (${result.score}) | Context: ${result.contextType}`);
    } else {
      console.log(`❌ FAIL: ${t.name}`);
      console.log(`   Expected: Confidence=${t.expectedConfidence}, Context=${t.expectedContext}`);
      console.log(`   Actual  : Confidence=${result.confidence} (${result.score}), Context=${result.contextType}`);
      console.log(`   Reason  : ${result.reason}`);
    }
    console.log("------------------------------------------");
    if (matchConfidence && matchContext) passed++;
  }

  console.log(`\nResults: ${passed} PASS, ${testCases.length - passed} FAIL`);
}

runTests();
