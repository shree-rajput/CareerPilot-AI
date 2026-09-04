/**
 * Canonical Technology Discussion Taxonomy & Practice Mode Specification
 * Platform-wide Source of Truth for Practice Modes, Categories, and Topics.
 */

export const PRACTICE_MODES = {
  CODING: {
    id: "coding",
    canonicalName: "CODING",
    label: "Coding",
    questionType: "CODING",
    description: "DSA, algorithms, debugging & optimization",
    allowedTopics: [
      "arrays",
      "strings",
      "linked_lists",
      "stack",
      "queue",
      "binary_search",
      "recursion",
      "hashing",
      "sorting",
      "trees",
      "graphs",
      "dynamic_programming"
    ]
  },
  DEVELOPMENT: {
    id: "development",
    canonicalName: "DEVELOPMENT",
    label: "Development",
    questionType: "DEVELOPMENT",
    description: "JavaScript, React, Node.js, APIs, SQL, Git",
    allowedTopics: [
      "javascript",
      "react",
      "nodejs",
      "express",
      "rest_apis",
      "sql",
      "databases",
      "git",
      "debugging"
    ]
  },
  SYSTEM_DESIGN: {
    id: "system_design",
    canonicalName: "SYSTEM_DESIGN",
    label: "System Design",
    questionType: "SYSTEM_DESIGN",
    description: "Architecture and real-world engineering",
    allowedTopics: [
      "api_design",
      "caching",
      "database_design",
      "load_balancing",
      "scalability",
      "message_queues",
      "microservices",
      "architecture"
    ]
  },
  INTERVIEW: {
    id: "interview",
    canonicalName: "INTERVIEW",
    label: "Interview",
    questionType: "INTERVIEW",
    description: "Mixed technical interview practice",
    allowedTopics: [
      "fullstack_problem_solving",
      "technical_tradeoffs",
      "project_architecture_defense",
      "cs_core_reasoning",
      "mixed"
    ]
  }
};

/**
 * Normalizes any incoming category string to a canonical Practice Mode key.
 */
export function normalizeCategory(input) {
  if (!input || typeof input !== "string") return PRACTICE_MODES.CODING.id;

  const clean = input.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

  if (clean === "coding" || clean === "dsa" || clean === "algorithms" || clean === "problem_solving") {
    return PRACTICE_MODES.CODING.id;
  }
  if (clean === "development" || clean === "dev" || clean === "web" || clean === "software_engineering") {
    return PRACTICE_MODES.DEVELOPMENT.id;
  }
  if (clean === "system_design" || clean === "architecture" || clean === "sys_design") {
    return PRACTICE_MODES.SYSTEM_DESIGN.id;
  }
  if (clean === "interview" || clean === "mixed" || clean === "project_defense" || clean === "cs_fundamentals") {
    return PRACTICE_MODES.INTERVIEW.id;
  }

  return PRACTICE_MODES.CODING.id;
}

/**
 * Validates if a question category strictly matches the selected practice mode category.
 */
export function validateCategoryIntegrity(selectedCategory, questionCategory) {
  const normSelected = normalizeCategory(selectedCategory);
  const normQuestion = normalizeCategory(questionCategory);

  // INTERVIEW mode allows mixed practice, but specific modes (CODING, DEVELOPMENT, SYSTEM_DESIGN) require exact match
  if (normSelected === PRACTICE_MODES.INTERVIEW.id) {
    return true;
  }

  return normSelected === normQuestion;
}
