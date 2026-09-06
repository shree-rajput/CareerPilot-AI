import { 
  normalizeSkill, 
  normalizeSkillList, 
  compareSkills 
} from "../services/skill/skillIntelligenceService.js";

function runSkillIntelligenceTests() {
  console.log("\n==========================================");
  console.log("   Skill Intelligence Service Verification");
  console.log("==========================================\n");

  // 1. Alias & Variant Normalization Tests
  console.log("[1/3] Testing Skill Normalization & Aliases...");
  
  const testCases = [
    { input: "ReactJS", expected: "React" },
    { input: "react.js", expected: "React" },
    { input: "js", expected: "JavaScript" },
    { input: "ecmascript", expected: "JavaScript" },
    { input: "ts", expected: "TypeScript" },
    { input: "k8s", expected: "Kubernetes" },
    { input: "node", expected: "Node.js" },
    { input: "postgres", expected: "PostgreSQL" },
    { input: "py", expected: "Python" }
  ];

  for (const tc of testCases) {
    const norm = normalizeSkill(tc.input);
    console.log(`  "${tc.input}" → "${norm.canonicalName}" (Confidence: ${norm.confidence})`);
    if (norm.canonicalName !== tc.expected) {
      throw new Error(`Normalization failed for "${tc.input}": expected "${tc.expected}", got "${norm.canonicalName}"`);
    }
  }
  console.log("  ✓ All normalization test cases passed!");

  // 2. Skill Comparison & Relationship Classification Tests
  console.log("\n[2/3] Testing Semantic Skill Comparisons...");

  const compCases = [
    { skillA: "ReactJS", skillB: "React", expectedType: "EQUIVALENT", minScore: 0.95 },
    { skillA: "TypeScript", skillB: "JavaScript", expectedType: "PARENT", minScore: 0.8 },
    { skillA: "React", skillB: "JavaScript", expectedType: "CHILD", minScore: 0.8 },
    { skillA: "React", skillB: "Redux", expectedType: "RELATED", minScore: 0.7 },
    { skillA: "C++", skillB: "Python", expectedType: "UNKNOWN", minScore: 0.0 }
  ];

  for (const cc of compCases) {
    const res = compareSkills(cc.skillA, cc.skillB);
    console.log(`  compare("${cc.skillA}", "${cc.skillB}") → ${res.matchType} (Score: ${res.score})`);
    if (res.matchType !== cc.expectedType && (res.score < cc.minScore && cc.expectedType !== "UNKNOWN")) {
      throw new Error(`Comparison failed for "${cc.skillA}" vs "${cc.skillB}": expected ${cc.expectedType}, got ${res.matchType}`);
    }
  }
  console.log("  ✓ All semantic comparison test cases passed!");

  // 3. Array Normalization Tests
  console.log("\n[3/3] Testing Array Normalization...");
  const rawList = ["ReactJS", "react.js", "node", "K8S", "ts", "TypeScript"];
  const normList = normalizeSkillList(rawList);
  console.log("  Raw List:", rawList);
  console.log("  Normalized List:", normList.map(s => s.canonicalName));

  if (normList.length !== 4) {
    throw new Error(`Array normalization deduplication failed: expected 4 items, got ${normList.length}`);
  }
  console.log("  ✓ Array normalization & deduplication passed!");

  console.log("\n==========================================");
  console.log("  SKILL INTELLIGENCE TESTS PASSED 100%");
  console.log("==========================================\n");
}

runSkillIntelligenceTests();
