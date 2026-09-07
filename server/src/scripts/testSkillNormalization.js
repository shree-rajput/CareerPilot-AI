/**
 * CareerPilot AI — Skill Normalization + Missing Keyword Detection Test
 *
 * Tests the reported bug and all property-based invariants.
 *
 * Run with: node --experimental-vm-modules src/scripts/testSkillNormalization.js
 * Or:       node src/scripts/testSkillNormalization.js
 */

import { normalizeSkill, normalizeSkillList, compareSkills } from "../services/skill/skillIntelligenceService.js";

// ============================================================
// Test helpers
// ============================================================

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅  PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${description}`);
    failed++;
    failures.push(description);
  }
}

function assertEqual(actual, expected, description) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅  PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${description}`);
    console.error(`      Expected: ${JSON.stringify(expected)}`);
    console.error(`      Got:      ${JSON.stringify(actual)}`);
    failed++;
    failures.push(`${description} — expected ${expected}, got ${actual}`);
  }
}

function section(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

// ============================================================
// PHASE 1: Canonical Name Normalization
// ============================================================

section("Phase 1: Canonical Name Normalization");

// JavaScript variants
assertEqual(normalizeSkill("JavaScript").canonicalName, "JavaScript", "JavaScript → JavaScript");
assertEqual(normalizeSkill("javascript").canonicalName, "JavaScript", "javascript → JavaScript");
assertEqual(normalizeSkill("JS").canonicalName, "JavaScript", "JS → JavaScript");
assertEqual(normalizeSkill("js").canonicalName, "JavaScript", "js → JavaScript");
assertEqual(normalizeSkill("ecmascript").canonicalName, "JavaScript", "ecmascript → JavaScript");

// React variants
assertEqual(normalizeSkill("React").canonicalName, "React", "React → React");
assertEqual(normalizeSkill("React.js").canonicalName, "React", "React.js → React");
assertEqual(normalizeSkill("ReactJS").canonicalName, "React", "ReactJS → React");
assertEqual(normalizeSkill("react.js").canonicalName, "React", "react.js → React");
assertEqual(normalizeSkill("react js").canonicalName, "React", "react js → React");

// Node.js variants
assertEqual(normalizeSkill("Node.js").canonicalName, "Node.js", "Node.js → Node.js");
assertEqual(normalizeSkill("NodeJS").canonicalName, "Node.js", "NodeJS → Node.js");
assertEqual(normalizeSkill("nodejs").canonicalName, "Node.js", "nodejs → Node.js");
assertEqual(normalizeSkill("node").canonicalName, "Node.js", "node → Node.js");

// Express.js variants
assertEqual(normalizeSkill("Express.js").canonicalName, "Express.js", "Express.js → Express.js");
assertEqual(normalizeSkill("expressjs").canonicalName, "Express.js", "expressjs → Express.js");
assertEqual(normalizeSkill("express").canonicalName, "Express.js", "express → Express.js");

// MongoDB variants
assertEqual(normalizeSkill("MongoDB").canonicalName, "MongoDB", "MongoDB → MongoDB");
assertEqual(normalizeSkill("mongo").canonicalName, "MongoDB", "mongo → MongoDB");

// ============================================================
// Phase 2: Conservative normalization — must NOT false-match
// ============================================================

section("Phase 2: Conservative Normalization — No False Matches");

// Java must NOT match JavaScript
const javaCanonical = normalizeSkill("Java").canonicalName;
const jsCanonical = normalizeSkill("JavaScript").canonicalName;
assert(javaCanonical !== jsCanonical, `Java (${javaCanonical}) must NOT canonicalize to same as JavaScript (${jsCanonical})`);

// React must NOT match React Native (React Native would fall through to "other")
const reactCanonical = normalizeSkill("React").canonicalName;
const reactNativeCanonical = normalizeSkill("React Native").canonicalName;
assert(reactCanonical !== reactNativeCanonical, `React (${reactCanonical}) must NOT match React Native (${reactNativeCanonical})`);

// SQL must NOT match NoSQL
const sqlCanonical = normalizeSkill("SQL").canonicalName;
const noSqlCanonical = normalizeSkill("NoSQL").canonicalName;
assert(sqlCanonical !== noSqlCanonical, `SQL (${sqlCanonical}) must NOT match NoSQL (${noSqlCanonical})`);

// C++ must NOT match C
const cppCanonical = normalizeSkill("C++").canonicalName;
const cCanonical = normalizeSkill("C").canonicalName; // "C" not in taxonomy, stays as "C"
assert(cppCanonical !== cCanonical, `C++ (${cppCanonical}) must NOT match C (${cCanonical})`);

// ============================================================
// Phase 3: compareSkills — Equivalence Matching
// ============================================================

section("Phase 3: compareSkills Equivalence for Alias Pairs");

// React vs React.js
const reactVsReactJs = compareSkills("React", "React.js");
assertEqual(reactVsReactJs.matchType, "EQUIVALENT", "React vs React.js → EQUIVALENT");
assert(reactVsReactJs.score === 1.0, `React vs React.js score = 1.0 (got ${reactVsReactJs.score})`);

// Node.js vs NodeJS
const nodeVsNodeJs = compareSkills("Node.js", "NodeJS");
assertEqual(nodeVsNodeJs.matchType, "EQUIVALENT", "Node.js vs NodeJS → EQUIVALENT");
assert(nodeVsNodeJs.score === 1.0, `Node.js vs NodeJS score = 1.0 (got ${nodeVsNodeJs.score})`);

// JavaScript vs JS
const jsVsJs = compareSkills("JavaScript", "JS");
assertEqual(jsVsJs.matchType, "EQUIVALENT", "JavaScript vs JS → EQUIVALENT");

// Express vs Express.js
const expressVsExpressJs = compareSkills("Express", "Express.js");
assertEqual(expressVsExpressJs.matchType, "EQUIVALENT", "Express vs Express.js → EQUIVALENT");

// Java vs JavaScript — must NOT be EQUIVALENT
const javaVsJs = compareSkills("Java", "JavaScript");
assert(javaVsJs.matchType !== "EQUIVALENT", `Java vs JavaScript must NOT be EQUIVALENT (got ${javaVsJs.matchType})`);
assert(javaVsJs.score < 0.9, `Java vs JavaScript score must be < 0.9 (got ${javaVsJs.score})`);

// React vs Angular — must NOT be EQUIVALENT
const reactVsAngular = compareSkills("React", "Angular");
assert(reactVsAngular.matchType !== "EQUIVALENT", `React vs Angular must NOT be EQUIVALENT`);
assert(reactVsAngular.score < 0.9, `React vs Angular score must be < 0.9 (got ${reactVsAngular.score})`);

// ============================================================
// Phase 4: normalizeSkillList — De-duplication
// ============================================================

section("Phase 4: Skill List De-duplication");

// If resume has React, React.js, ReactJS — should deduplicate to 1 entry
const dupeReact = normalizeSkillList(["React", "React.js", "ReactJS"]);
assertEqual(dupeReact.length, 1, "React + React.js + ReactJS → 1 unique canonical skill");
assertEqual(dupeReact[0].canonicalName, "React", "De-duplicated canonical = React");

// Node.js variants should deduplicate
const dupeNode = normalizeSkillList(["Node.js", "NodeJS", "node"]);
assertEqual(dupeNode.length, 1, "Node.js + NodeJS + node → 1 unique canonical skill");
assertEqual(dupeNode[0].canonicalName, "Node.js", "De-duplicated canonical = Node.js");

// ============================================================
// Phase 5: THE REPORTED BUG — Acceptance Test
// ============================================================

section("Phase 5: THE REPORTED BUG — Acceptance Test");
console.log("\n  Scenario:");
console.log("  Resume:  JavaScript, Node.js, Express.js, React.js");
console.log("  JD:      HTML, CSS, JavaScript, React, Angular, Node.js");
console.log("  Expected Matched:  JavaScript, React, Node.js");
console.log("  Expected Missing:  HTML, CSS, Angular");
console.log("  Expected NOT Missing: JavaScript, React, Node.js\n");

// Simulate the canonical comparison the engine performs:
const resumeSkillsRaw = ["JavaScript", "Node.js", "Express.js", "React.js"];
const jdSkillsRaw = ["HTML", "CSS", "JavaScript", "React", "Angular", "Node.js"];

const canonicalResumeSkills = new Set(
  resumeSkillsRaw.map(s => normalizeSkill(s).canonicalName.toLowerCase())
);

const matchedSkills = [];
const missingSkills = [];

for (const jdSkill of jdSkillsRaw) {
  const canonicalJd = normalizeSkill(jdSkill).canonicalName.toLowerCase();
  if (canonicalResumeSkills.has(canonicalJd)) {
    matchedSkills.push(jdSkill);
  } else {
    // Also check compareSkills
    let equivalentFound = false;
    for (const resumeSkill of resumeSkillsRaw) {
      const comparison = compareSkills(resumeSkill, jdSkill);
      if (comparison.matchType === "EQUIVALENT") {
        equivalentFound = true;
        break;
      }
    }
    if (equivalentFound) {
      matchedSkills.push(jdSkill);
    } else {
      missingSkills.push(jdSkill);
    }
  }
}

console.log(`  Matched: ${matchedSkills.join(", ")}`);
console.log(`  Missing: ${missingSkills.join(", ")}\n`);

// Assertions for the acceptance test
assert(matchedSkills.includes("JavaScript"), "JavaScript is in MATCHED (not missing)");
assert(matchedSkills.includes("React"), "React is in MATCHED (because React.js is an alias)");
assert(matchedSkills.includes("Node.js"), "Node.js is in MATCHED (directly present)");
assert(missingSkills.includes("HTML"), "HTML is in MISSING (not in resume)");
assert(missingSkills.includes("CSS"), "CSS is in MISSING (not in resume)");
assert(missingSkills.includes("Angular"), "Angular is in MISSING (not in resume)");

assert(!missingSkills.includes("JavaScript"), "JavaScript must NOT be in MISSING");
assert(!missingSkills.includes("React"), "React must NOT be in MISSING (React.js is present)");
assert(!missingSkills.includes("Node.js"), "Node.js must NOT be in MISSING");

// ============================================================
// Phase 6: Property-Based Invariants
// ============================================================

section("Phase 6: Property-Based Invariants");

// RULE 1: If canonical(resumeSkill) === canonical(jdSkill), jdSkill must NOT be missing
const testPairs = [
  ["React.js", "React"],
  ["NodeJS", "Node.js"],
  ["javascript", "JavaScript"],
  ["expressjs", "Express.js"],
  ["mongo", "MongoDB"],
];

for (const [resumeSkill, jdSkill] of testPairs) {
  const canonicalResume = normalizeSkill(resumeSkill).canonicalName;
  const canonicalJd = normalizeSkill(jdSkill).canonicalName;
  assertEqual(canonicalResume, canonicalJd, 
    `RULE 1: ${resumeSkill} and ${jdSkill} must have same canonical name → ${canonicalJd}`);
}

// RULE 2: Adding an alias must not create a duplicate skill
const listWithAlias = normalizeSkillList(["React", "React.js"]);
assertEqual(listWithAlias.length, 1, "RULE 2: React + React.js → 1 unique skill, not 2");

// RULE 3: Changing React.js to ReactJS must not change the canonical
const a = normalizeSkill("React.js").canonicalName;
const b = normalizeSkill("ReactJS").canonicalName;
assertEqual(a, b, "RULE 3: React.js and ReactJS must have same canonical name");

// RULE 4: Changing Node.js to NodeJS must not change the canonical
const c = normalizeSkill("Node.js").canonicalName;
const d = normalizeSkill("NodeJS").canonicalName;
assertEqual(c, d, "RULE 4: Node.js and NodeJS must have same canonical name");

// ============================================================
// Summary
// ============================================================

console.log(`\n${"=".repeat(60)}`);
console.log("  TEST SUMMARY");
console.log("=".repeat(60));
console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);

if (failures.length > 0) {
  console.error("\n  FAILED TESTS:");
  failures.forEach((f, i) => console.error(`    ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log("\n  ✅  All tests passed! The normalization system is correct.");
  process.exit(0);
}
