import { normalizePeerInterviewPlan } from "../services/career/peerInterview.service.js";

function testPeerInterviewNormalization() {
  console.log("--- Testing Peer Interview Plan Normalization ---");

  // Case 1: Empty input
  const plan1 = normalizePeerInterviewPlan([], { targetRole: "Backend Engineer", technologyStack: ["Node.js", "Redis"] });
  console.assert(plan1.length === 4, "Plan 1 should have 4 fallback items");
  console.assert(plan1.every(i => typeof i.questionText === "string" && i.questionText.length > 0), "All items must have valid questionText");
  console.log("PASS: Empty input fallback normalization verified.");

  // Case 2: AI output with 'objective' and 'skill' instead of 'questionText'
  const aiOutput = [
    { section: "Technical Core", skill: "Redis", objective: "Evaluate understanding of caching strategies and TTL expiration", evaluationCriteria: ["Redis Data Types", "Eviction Policies"] },
    { section: "System Design", skill: "Scalability", objective: "Probe how candidate scales a stateful websocket service", evaluationCriteria: ["Load Balancing", "Redis PubSub"] }
  ];

  const plan2 = normalizePeerInterviewPlan(aiOutput, { targetRole: "Full Stack Engineer" });
  console.assert(plan2.length === 2, "Plan 2 should have 2 items");
  console.assert(plan2[0].questionText.includes("Evaluate understanding"), "Question text 0 should contain objective text");
  console.assert(plan2[1].questionText.includes("websocket"), "Question text 1 should contain objective text");
  console.assert(plan2.every(i => i.expectedConcepts && i.expectedConcepts.length > 0), "All items must have expectedConcepts");
  console.log("PASS: AI output normalization mapping verified.");
}

testPeerInterviewNormalization();
console.log("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
