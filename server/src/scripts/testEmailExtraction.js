import { classifyEmailEvent } from "../services/career/emailClassificationService.js";
import { matchEmailToApplication } from "../services/career/applicationMatchingService.js";

// Mock User & existing DB state
const MOCK_USER_ID = "5f9d7a3b4f6b1e0017e8b8c1";
const MOCK_APPLICATIONS = [
  { _id: "app1", company: "Optimspace", role: "Front-End Developer Intern", status: "saved" },
  { _id: "app2", company: "Google", role: "Software Engineer", status: "applied" },
  { _id: "app3", company: "Microsoft", role: "Data Scientist", status: "interview" },
  { _id: "app4", company: "Stripe", role: "Backend Engineer", status: "offer" },
  { _id: "app5", company: "Stripe", role: "Frontend Engineer", status: "applied" },
];

const testCases = [
  {
    id: 1,
    name: "1. Indeed: Front-End Developer Intern @ Optimspace",
    emailData: {
      messageId: "msg1",
      senderName: "Indeed",
      senderEmail: "donotreply@match.indeed.com",
      subject: "Front-End Developer Intern @ Optimspace",
      bodyText: "Your application for the Front-End Developer Intern position at Optimspace has been received.",
    },
    expected: {
      company: "Optimspace",
      role: "Front-End Developer Intern",
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
  {
    id: 2,
    name: "2. Role at Company",
    emailData: {
      messageId: "msg2",
      senderName: "Acme HR",
      senderEmail: "careers@acmecorp.com",
      subject: "Update: Software Engineer at Acme Corp",
      bodyText: "Thank you for applying for the Software Engineer position at Acme Corp.",
    },
    expected: {
      company: "Acme Corp",
      role: "Software Engineer",
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
  {
    id: 3,
    name: "3. Company - Role",
    emailData: {
      messageId: "msg3",
      senderName: "Greenhouse",
      senderEmail: "no-reply@greenhouse.io",
      subject: "Global Tech - Product Manager",
      bodyText: "We have received your resume.",
    },
    expected: {
      company: "Global Tech",
      role: "Product Manager",
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
  {
    id: 4,
    name: "4. Application received (Explicit)",
    emailData: {
      messageId: "msg4",
      senderName: "Startup Inc",
      senderEmail: "jobs@startup.io",
      subject: "Application received",
      bodyText: "We successfully submitted your application for Marketing Intern at Startup Inc.",
    },
    expected: {
      company: "Startup Inc",
      role: "Marketing Intern",
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
  {
    id: 5,
    name: "5. Online assessment",
    emailData: {
      messageId: "msg5",
      senderName: "HackerRank",
      senderEmail: "invites@hackerrank.com",
      subject: "Coding assessment invitation - Backend Developer",
      bodyText: "Please complete the online assessment for the Backend Developer position at Stripe.",
    },
    expected: {
      company: "Stripe",
      role: "Backend Developer",
      eventType: "OA_INVITATION",
      detectedStatus: "oa",
    }
  },
  {
    id: 6,
    name: "6. Interview invitation",
    emailData: {
      messageId: "msg6",
      senderName: "Jane Recruiter",
      senderEmail: "jane@google.com",
      subject: "Interview scheduling for Software Engineer",
      bodyText: "We would like to invite you to interview for the Software Engineer role.",
    },
    expected: {
      company: "Google",
      role: "Software Engineer",
      eventType: "INTERVIEW_INVITATION",
      detectedStatus: "interview",
    }
  },
  {
    id: 7,
    name: "7. Offer",
    emailData: {
      messageId: "msg7",
      senderName: "Microsoft HR",
      senderEmail: "offers@microsoft.com",
      subject: "Congratulations! Offer from Microsoft",
      bodyText: "We are pleased to offer you the Data Scientist position.",
    },
    expected: {
      company: "Microsoft",
      role: "Data Scientist",
      eventType: "OFFER_RECEIVED",
      detectedStatus: "offer",
    }
  },
  {
    id: 8,
    name: "8. Rejection",
    emailData: {
      messageId: "msg8",
      senderName: "Apple Talent",
      senderEmail: "no-reply@apple.com",
      subject: "Update on your application",
      bodyText: "Unfortunately, we have decided not to proceed with your application for the iOS Engineer role.",
    },
    expected: {
      company: "Apple",
      role: "iOS Engineer",
      eventType: "APPLICATION_REJECTED",
      detectedStatus: "rejected",
    }
  },
  {
    id: 9,
    name: "9. Withdrawal",
    emailData: {
      messageId: "msg9",
      senderName: "Workday",
      senderEmail: "system@workday.com",
      subject: "Application Withdrawn",
      bodyText: "Confirming you have withdrawn your application for Financial Analyst at Amazon.",
    },
    expected: {
      company: "Amazon",
      role: "Financial Analyst",
      eventType: "APPLICATION_WITHDRAWN",
      detectedStatus: "withdrawn",
    }
  },
  {
    id: 10,
    name: "10. Missing company (Infer from Sender)",
    emailData: {
      messageId: "msg10",
      senderName: "Meta Careers",
      senderEmail: "recruit@meta.com",
      subject: "Application received - Data Engineer",
      bodyText: "Thank you for applying.",
    },
    expected: {
      company: "Meta",
      role: "Data Engineer",
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
  {
    id: 11,
    name: "11. Ambiguous company (Duplicate Match Test)",
    emailData: {
      messageId: "msg11",
      senderName: "Stripe",
      senderEmail: "no-reply@stripe.com",
      subject: "Application Received",
      bodyText: "Thank you for applying to Stripe.",
    },
    expected: {
      company: "Stripe",
      role: "Unknown", // Can't confidently extract role
      eventType: "APPLICATION_RECEIVED",
      detectedStatus: "applied",
    }
  },
];

async function runTests() {
  console.log("==========================================");
  console.log("EMAIL EXTRACTION & MATCHING TESTS");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  for (const t of testCases) {
    console.log(`Testing: ${t.name}`);
    const classified = classifyEmailEvent(t.emailData);
    
    const companyMatch = classified.detectedCompany.toLowerCase() === t.expected.company.toLowerCase();
    const roleMatch = classified.detectedRole.toLowerCase() === t.expected.role.toLowerCase() || (t.expected.role === "Unknown" && !classified.detectedRole);
    const eventMatch = classified.eventType === t.expected.eventType;
    
    const isPass = companyMatch && roleMatch && eventMatch;
    
    if (isPass) {
      console.log(`✅ PASS: Extracted [${classified.detectedCompany}] | [${classified.detectedRole}] | [${classified.eventType}]`);
      passed++;
    } else {
      console.log(`❌ FAIL`);
      console.log(`   Expected: [${t.expected.company}] | [${t.expected.role}] | [${t.expected.eventType}]`);
      console.log(`   Actual  : [${classified.detectedCompany}] | [${classified.detectedRole}] | [${classified.eventType}]`);
      failed++;
    }
    console.log("------------------------------------------");
  }

  console.log(`\nResults: ${passed} PASS, ${failed} FAIL`);
}

runTests().catch(console.error);
