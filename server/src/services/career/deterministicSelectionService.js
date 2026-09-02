import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import CodingQuestion from "../../models/CodingQuestions.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { getPreparationDashboard } from "./preparationService.js";

/**
 * Curated Fallback Scenarios for each category when DB is empty or unpopulated.
 */
const CURATED_CATEGORY_SCENARIOS = {
  architecture: [
    {
      scenarioId: "arch-url-shortener",
      title: "Design a Scalable URL Shortener (e.g. Bitly)",
      category: "architecture",
      subtopic: "System Design & Scalability",
      difficulty: "medium",
      targetRoles: ["Backend Engineer", "Software Engineer", "Full Stack Developer", "System Architect"],
      openingPrompt: "Design a high-throughput URL shortening service (like Bit.ly) capable of handling 100M daily active users, 10,000 write QPS, and 100,000 read QPS.",
      guidedFollowUps: [
        "How will you generate unique 7-character short keys without collisions?",
        "What caching strategy will you use to handle the 100,000 read QPS?",
        "How will database sharding or partitioning work as storage scales to billions of records?"
      ],
      tradeOffsToExplore: [
        "Base62 encoding vs MD5 hash truncation",
        "Redis LRU cache vs Local Node.js memory cache",
        "SQL Relational DB vs NoSQL Key-Value Store (Cassandra/DynamoDB)"
      ],
      expectedConcepts: ["Hashing", "Caching", "Database Sharding", "Load Balancing", "API Design"],
      starterCanvasElements: [
        { type: "stencil", stencilType: "client", x: 100, y: 150, text: "Client Browser" },
        { type: "stencil", stencilType: "load_balancer", x: 300, y: 150, text: "Nginx LB" },
        { type: "stencil", stencilType: "microservice", x: 500, y: 150, text: "URL Shortener API" },
        { type: "stencil", stencilType: "redis", x: 500, y: 320, text: "Redis LRU Cache" },
        { type: "stencil", stencilType: "database", x: 720, y: 150, text: "Primary DB" }
      ],
      sourceReference: "System Design Primer"
    },
    {
      scenarioId: "arch-notification-system",
      title: "Design a Real-Time Notification Platform",
      category: "architecture",
      subtopic: "Messaging & Event Architecture",
      difficulty: "hard",
      targetRoles: ["Backend Engineer", "Software Engineer", "Full Stack Developer"],
      openingPrompt: "Design an enterprise notification system that sends Push Notifications, SMS, and Email to millions of users with rate limiting and retry queues.",
      guidedFollowUps: [
        "How do you decouple notification producers from third-party delivery providers (Twilio, SendGrid)?",
        "What queue mechanism ensures at-least-once delivery during provider downtime?",
        "How do you handle user notification frequency caps and rate limiting?"
      ],
      tradeOffsToExplore: [
        "Kafka distributed log vs RabbitMQ message broker",
        "Polling vs WebSockets vs Server-Sent Events (SSE)",
        "Synchronous API calls vs Asynchronous Event-Driven Architecture"
      ],
      expectedConcepts: ["Message Queues", "Event-Driven Architecture", "Rate Limiting", "WebSockets"],
      sourceReference: "CareerPilot Curated"
    }
  ],
  development: [
    {
      scenarioId: "dev-api-rate-limiter",
      title: "Implement a Redis Sliding Window Rate Limiter",
      category: "development",
      subtopic: "Backend & API Security",
      difficulty: "medium",
      targetRoles: ["Backend Engineer", "Full Stack Developer", "Software Engineer"],
      openingPrompt: "Implement an HTTP API Rate Limiter middleware in Node.js / Express that limits clients to 100 requests per minute using Redis.",
      guidedFollowUps: [
        "What are the trade-offs of Fixed Window vs Sliding Window Log vs Token Bucket algorithms?",
        "How do you prevent race conditions when two concurrent requests read and update the request count?",
        "How should the middleware respond when Redis itself drops offline?"
      ],
      tradeOffsToExplore: [
        "Fixed Window (simple, leaky boundary) vs Sliding Window (precise, higher memory)",
        "Redis Lua script atomic execution vs Multi/Exec transactions"
      ],
      expectedConcepts: ["Redis", "Rate Limiting", "Middleware", "Race Conditions", "Atomicity"],
      starterCode: {
        javascript: "const redis = require('redis');\n\n/**\n * Rate Limiter Middleware\n * Limits IP to maxRequests per windowSeconds\n */\nfunction rateLimiter(maxRequests = 100, windowSeconds = 60) {\n  return async (req, res, next) => {\n    // Implement rate limiting logic here\n    next();\n  };\n}",
        python: "import time\nimport redis\n\ndef rate_limiter(client_ip: str, max_requests: int = 100, window_sec: int = 60) -> bool:\n    # Implement rate limiting\n    return True"
      },
      sourceReference: "CareerPilot Curated"
    }
  ],
  cs_fundamentals: [
    {
      scenarioId: "cs-concurrency-deadlocks",
      title: "Concurrency, Multithreading & Race Conditions",
      category: "cs_fundamentals",
      subtopic: "OS & Threads",
      difficulty: "medium",
      targetRoles: ["Backend Engineer", "Software Engineer"],
      openingPrompt: "Explain the Coffman conditions required for a deadlock to occur in a concurrent application, and discuss strategies to prevent deadlocks in multithreaded systems.",
      guidedFollowUps: [
        "What is the difference between a Mutex, a Semaphore, and a Read-Write Lock?",
        "How does the Event Loop in JavaScript avoid OS-level thread deadlocks while executing async operations?",
        "Explain optimistic locking vs pessimistic locking in database transactions."
      ],
      tradeOffsToExplore: [
        "Optimistic Concurrency Control vs Pessimistic Concurrency Control",
        "Single-threaded Event Loop (Node.js) vs Multi-threaded Worker Pool (Java/Go)"
      ],
      expectedConcepts: ["Deadlocks", "Mutex/Locks", "Concurrency", "Event Loop", "Transactions"],
      sourceReference: "OS Concepts"
    }
  ],
  project_discussion: [
    {
      scenarioId: "proj-architecture-defense",
      title: "Project Architecture & Technology Trade-Off Defense",
      category: "project_discussion",
      subtopic: "System Defense & Decisions",
      difficulty: "medium",
      targetRoles: ["Software Engineer", "Backend Engineer", "Full Stack Developer", "Frontend Engineer"],
      openingPrompt: "Walk your peer through the architecture of a major project you built. Explain your technical choices, database selection, data flow, and how you handled unexpected production bugs.",
      guidedFollowUps: [
        "Why did you choose your specific database (SQL vs NoSQL)? What limitations did you hit?",
        "If your application traffic increased 50x tomorrow, what component would break first?",
        "Describe a difficult bug you encountered during development and how you isolated the root cause."
      ],
      tradeOffsToExplore: [
        "Monolith vs Microservices architecture for early-stage projects",
        "Client-side rendering vs Server-side rendering (SSR)"
      ],
      expectedConcepts: ["Architecture Defense", "Database Choices", "Debugging Strategy", "Scalability Thinking"],
      sourceReference: "CareerPilot Curated"
    }
  ],
  interview_prep: [
    {
      scenarioId: "prep-company-technical",
      title: "Top-Company Technical Reasoning & Trade-Offs",
      category: "interview_prep",
      subtopic: "Technical Interview Practice",
      difficulty: "medium",
      targetRoles: ["Software Engineer", "Backend Engineer"],
      openingPrompt: "Practice answering deep technical interview questions with your peer: Discuss how to design a resilient distributed key-value store with strong consistency guarantees.",
      guidedFollowUps: [
        "Explain the CAP Theorem and where your key-value store falls (CP vs AP).",
        "How does the Raft consensus algorithm handle leader election and log replication?",
        "How do you handle network partitions without corrupting state?"
      ],
      tradeOffsToExplore: ["Strong Consistency vs Eventual Consistency", "Raft vs Paxos consensus"],
      expectedConcepts: ["CAP Theorem", "Consensus Algorithms", "Distributed Systems", "Consistency Models"],
      sourceReference: "CareerPilot Curated"
    }
  ]
};

/**
 * Deterministic Pipeline: Filters scenarios using candidate data before AI selection.
 */
export async function getDeterministicScenarioRecommendation(userId, { category = "architecture", difficulty = "medium" } = {}) {
  let targetRole = "Software Engineer";
  let skillGaps = [];
  let readinessScore = 50;

  try {
    const [intel, prepDashboard] = await Promise.all([
      getCareerIntelligence(userId).catch(() => ({})),
      getPreparationDashboard(userId).catch(() => ({}))
    ]);

    targetRole = intel?.targetRoles?.[0] || prepDashboard?.targetRole || "Software Engineer";
    skillGaps = prepDashboard?.skillGaps || intel?.skillGaps || [];
    readinessScore = intel?.readinessScore || 50;
  } catch (err) {
    console.warn("[DeterministicSelection] Failed fetching intelligence:", err.message);
  }

  // 1. Filter TechnicalScenarioBank DB
  const query = { isActive: true };
  if (category && category !== "custom") query.category = category;
  if (difficulty) query.difficulty = difficulty;

  let candidates = await TechnicalScenarioBank.find(query).lean();

  // 2. If DB candidates empty, try fallbacks for category
  if (!candidates || candidates.length === 0) {
    if (category === "coding") {
      const codingQuestions = await CodingQuestion.find({ isActive: true, difficulty }).lean();
      candidates = codingQuestions.map(q => ({
        scenarioId: q._id.toString(),
        title: q.title,
        category: "coding",
        subtopic: q.topics?.[0] || "DSA",
        difficulty: q.difficulty || difficulty,
        targetRoles: ["Software Engineer"],
        openingPrompt: q.description,
        guidedFollowUps: q.hints || [],
        tradeOffsToExplore: [`Time vs Space complexity for ${q.title}`],
        expectedConcepts: q.topics || [],
        starterCode: q.starterCode || {},
        sourceReference: "LeetCode 150 / Striver A2Z"
      }));
    } else {
      candidates = CURATED_CATEGORY_SCENARIOS[category] || CURATED_CATEGORY_SCENARIOS.architecture;
    }
  }

  // 3. Match candidate scenarios against user skill gaps deterministically
  const gapNames = skillGaps.map(g => (g.skill || g.canonicalName || "").toLowerCase());
  let bestScenario = null;
  let matchedSkillName = "";

  if (candidates && candidates.length > 0) {
    for (const item of candidates) {
      const concepts = (item.expectedConcepts || []).concat(item.subtopic || []);
      const matched = concepts.find(c => gapNames.some(g => g.includes(String(c).toLowerCase())));
      if (matched) {
        bestScenario = item;
        matchedSkillName = matched;
        break;
      }
    }

    if (!bestScenario) {
      bestScenario = candidates[Math.floor(Math.random() * candidates.length)];
    }
  } else {
    // Universal fallback scenario
    bestScenario = CURATED_CATEGORY_SCENARIOS.architecture[0];
  }

  // 4. Generate transparent explainable rationale card
  let rationale = "";
  if (matchedSkillName) {
    rationale = `Recommended for your target role (${targetRole}). Your profile identifies an active skill gap in '${matchedSkillName}'. Practicing '${bestScenario.title}' directly addresses this gap to improve your readiness score (currently ${readinessScore}%).`;
  } else {
    rationale = `Recommended practice for ${targetRole} in ${category.toUpperCase().replace("_", " ")}. Focuses on core technical reasoning and real-world trade-offs.`;
  }

  return {
    scenario: bestScenario,
    rationale,
    targetRole,
    readinessScore,
    matchedSkill: matchedSkillName || null
  };
}
