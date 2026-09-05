import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratedQuestion } from "../src/services/interview/questionValidationService.js";

test("Passes short, focused 1-sentence question for a fresher candidate", () => {
  const result = validateGeneratedQuestion({
    questionText: "How would you design a login API using Express.js?",
    targetRole: "Full Stack Engineer",
    technologyStack: ["Express.js", "React", "Node.js"],
    difficulty: "medium",
    interviewType: "technical",
    candidateExperience: "fresher"
  });

  assert.equal(result.isValid, true);
  assert.match(result.reason, /Passed all guardrail/);
});

test("Rejects multi-part assignment questions with long lists of requirements", () => {
  const multiPartQuestion = "Design a RESTful API endpoint using Express.js for a product catalog that supports pagination, sorting by any field, filtering by category and price range. Describe query parameters, validation, implementation logic, error handling, React consumption, loading/error/empty states, client-side caching, server-side vs client-side pagination, and caching trade-offs.";
  
  const result = validateGeneratedQuestion({
    questionText: multiPartQuestion,
    targetRole: "Full Stack Engineer",
    technologyStack: ["Express.js", "React"],
    difficulty: "medium",
    interviewType: "technical",
    candidateExperience: "fresher"
  });

  assert.equal(result.isValid, false);
  assert.match(result.reason, /too long|Multi-part|too many/i);
});

test("Rejects questions longer than 45 words", () => {
  const longQuestion = "When building a complex full stack web application using React and Express, how do you manage global state across many different deeply nested components when the application scale grows significantly, especially when dealing with asynchronous API requests, complex loading states, error boundaries, user authentication tokens, persistent storage, client caching, and server state synchronization while maintaining a clean code structure?";
  
  const result = validateGeneratedQuestion({
    questionText: longQuestion,
    targetRole: "Frontend Developer",
    technologyStack: ["React"],
    difficulty: "medium",
    interviewType: "technical",
    candidateExperience: "fresher"
  });

  assert.equal(result.isValid, false);
  assert.match(result.reason, /too long/i);
});

test("Rejects senior-level distributed system questions for fresher/junior candidates", () => {
  const seniorQuestion = "How would you design a horizontally scalable distributed session management system with multi-region failover?";
  
  const result = validateGeneratedQuestion({
    questionText: seniorQuestion,
    targetRole: "Software Engineer",
    technologyStack: ["Node.js"],
    difficulty: "medium",
    interviewType: "technical",
    candidateExperience: "fresher"
  });

  assert.equal(result.isValid, false);
  assert.match(result.reason, /Student-First Difficulty Guardrail/i);
});

test("Allows technical questions for senior candidate experience", () => {
  const seniorQuestion = "How do you manage race conditions in asynchronous JavaScript operations?";
  
  const result = validateGeneratedQuestion({
    questionText: seniorQuestion,
    targetRole: "Senior Software Engineer",
    technologyStack: ["JavaScript"],
    difficulty: "hard",
    interviewType: "technical",
    candidateExperience: "senior"
  });

  assert.equal(result.isValid, true);
});
