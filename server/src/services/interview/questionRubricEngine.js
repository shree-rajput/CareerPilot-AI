/**
 * Question-Specific Rubric Engine
 *
 * Enforces requirement #6:
 * Do NOT evaluate every question with the same generic rubric.
 * Classifies questions and builds question-specific evaluation rubrics.
 */

/**
 * Classifies the question type from text, category, and metadata.
 */
export function classifyQuestionType(questionText = "", category = "", questionType = "") {
  const text = `${questionText} ${category} ${questionType}`.toLowerCase();

  if (/coding|algorithm|data structure|write a function|implement|code/i.test(text)) {
    return "CODING";
  }
  if (/tell me about a time|describe a situation|how do you handle|give an example of when|conflict|challenge/i.test(text)) {
    return "BEHAVIORAL";
  }
  if (/project|built|experience|portfolio|architecture you designed|what was your role/i.test(text)) {
    return "PROJECT_EXPERIENCE";
  }
  if (/system design|scalability|load balancer|database schema|microservices|distributed/i.test(text)) {
    return "SYSTEM_DESIGN";
  }
  if (/debug|fix|bug|error|why is this failing|troubleshoot/i.test(text)) {
    return "DEBUGGING";
  }
  if (/how would you implement|build a|scenario|practical|how to configure/i.test(text)) {
    return "PRACTICAL";
  }
  if (/what happens if|suppose|situational/i.test(text)) {
    return "SITUATIONAL";
  }

  return "TECHNICAL_CONCEPT"; // Default core technical concept question
}

/**
 * Generates question-specific rubric expectations for evaluation.
 */
export function buildQuestionRubric(questionText = "", category = "", expectedConcepts = []) {
  const classification = classifyQuestionType(questionText, category);
  const text = questionText.toLowerCase();

  const rubric = {
    classification,
    dimensions: [],
    coreCheckpoints: [...expectedConcepts],
    scoringWeights: {
      technical: 0.60,
      communication: 0.25,
      depth: 0.15
    }
  };

  if (classification === "BEHAVIORAL") {
    rubric.dimensions = [
      "Situation & Context clarity",
      "Task / Problem ownership",
      "Action taken & decision making",
      "Quantifiable Result or learning"
    ];
    rubric.scoringWeights = { technical: 0.30, communication: 0.50, depth: 0.20 };
  } else if (classification === "PROJECT_EXPERIENCE") {
    rubric.dimensions = [
      "Individual ownership & role",
      "Technical challenge complexity",
      "Implementation choices & trade-offs",
      "Outcome & lessons learned"
    ];
    rubric.scoringWeights = { technical: 0.45, communication: 0.35, depth: 0.20 };
  } else if (classification === "SYSTEM_DESIGN") {
    rubric.dimensions = [
      "Requirement clarification",
      "High-level architecture & component choices",
      "Data flow & storage strategy",
      "Scalability, edge cases & trade-offs"
    ];
    rubric.scoringWeights = { technical: 0.50, communication: 0.25, depth: 0.25 };
  } else if (classification === "CODING") {
    rubric.dimensions = [
      "Algorithm correctness & edge cases",
      "Time & space complexity reasoning",
      "Code structure & readability",
      "Test case coverage"
    ];
    rubric.scoringWeights = { technical: 0.70, communication: 0.15, depth: 0.15 };
  } else {
    // TECHNICAL_CONCEPT / PRACTICAL / DEBUGGING
    rubric.dimensions = [
      "Core concept definition & accuracy",
      "Execution timing & underlying mechanics",
      "Practical usage / code example",
      "Edge cases, limitations, or trade-offs"
    ];

    // Specialized concept detection
    if (text.includes("useeffect")) {
      rubric.coreCheckpoints = [
        "What useEffect does (side effects)",
        "Execution timing (after render)",
        "Dependency array semantics",
        "Empty array vs specific dependency",
        "Cleanup function"
      ];
    } else if (text.includes("usestate") || text.includes("state management")) {
      rubric.coreCheckpoints = [
        "State definition & immutability",
        "Re-render trigger mechanic",
        "Asynchronous update behavior / functional updates",
        "State vs props distinction"
      ];
    } else if (text.includes("async") || text.includes("promise") || text.includes("event loop")) {
      rubric.coreCheckpoints = [
        "Asynchronous vs synchronous execution",
        "Promise states (pending, fulfilled, rejected)",
        "Event loop call stack & microtask queue",
        "Error handling (try/catch or .catch())"
      ];
    }
  }

  return rubric;
}
