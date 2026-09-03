import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import CodingQuestion from "../../models/CodingQuestions.js";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import { getCareerIntelligence } from "./careerIntelligenceService.js";
import { getPreparationDashboard } from "./preparationService.js";

/**
 * Curated Fallback Scenarios tagged by Experience Level & Category.
 */
const CURATED_CATEGORY_SCENARIOS = {
  architecture: [
    {
      scenarioId: "arch-fresher-basics",
      title: "Client-Server Architecture & HTTP Fundamentals",
      category: "architecture",
      subtopic: "System Design Basics",
      difficulty: "easy",
      experienceLevel: "fresher",
      targetRoles: ["Software Engineer", "Frontend Engineer", "Backend Engineer"],
      openingPrompt: "Explain how a web browser communicates with a backend server when a user visits a web application. Discuss HTTP request methods (GET vs POST), status codes, and basic API design.",
      guidedFollowUps: [
        "What is the difference between HTTP and HTTPS?",
        "How does a server handle multiple simultaneous incoming client connections conceptually?",
        "What is the role of a basic Relational Database behind an API server?"
      ],
      tradeOffsToExplore: [
        "JSON REST API vs HTML Server Side Rendering",
        "Stateless sessions vs Stateful cookies"
      ],
      expectedConcepts: ["Client-Server", "HTTP/REST", "APIs", "Statelessness"],
      starterCanvasElements: [
        { type: "stencil", stencilType: "client", x: 100, y: 150, text: "Web Browser" },
        { type: "stencil", stencilType: "microservice", x: 400, y: 150, text: "Node.js Express Server" },
        { type: "stencil", stencilType: "database", x: 700, y: 150, text: "SQL Database" }
      ],
      sourceReference: "CareerPilot Curated"
    },
    {
      scenarioId: "arch-url-shortener",
      title: "Design a Scalable URL Shortener (e.g. Bitly)",
      category: "architecture",
      subtopic: "System Design & Scalability",
      difficulty: "medium",
      experienceLevel: "junior",
      targetRoles: ["Backend Engineer", "Software Engineer", "Full Stack Developer"],
      openingPrompt: "Design a high-throughput URL shortening service (like Bit.ly) capable of handling 100M daily active users, 10,000 write QPS, and 100,000 read QPS.",
      guidedFollowUps: [
        "How will you generate unique 7-character short keys without collisions?",
        "What caching strategy will you use to handle high read QPS?",
        "How will database sharding or partitioning work as storage scales to billions of records?"
      ],
      tradeOffsToExplore: [
        "Base62 encoding vs MD5 hash truncation",
        "Redis LRU cache vs Local memory cache",
        "SQL Relational DB vs NoSQL Key-Value Store"
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
      difficulty: "medium_hard",
      experienceLevel: "intermediate",
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
      scenarioId: "dev-express-middleware",
      title: "Design & Debug Custom Express Middleware",
      category: "development",
      subtopic: "Backend Development",
      difficulty: "easy",
      experienceLevel: "fresher",
      targetRoles: ["Backend Engineer", "Full Stack Developer"],
      openingPrompt: "Discuss how middleware works in Node.js / Express. Implement a custom authentication and logging middleware.",
      guidedFollowUps: [
        "How does calling next() transfer execution in Express?",
        "How do you handle errors thrown inside async middleware functions?"
      ],
      tradeOffsToExplore: ["JWT token verification in middleware vs Session DB query"],
      expectedConcepts: ["Middleware", "Express", "Node.js", "Error Handling"],
      sourceReference: "CareerPilot Curated"
    },
    {
      scenarioId: "dev-api-rate-limiter",
      title: "Implement a Redis Sliding Window Rate Limiter",
      category: "development",
      subtopic: "Backend & API Security",
      difficulty: "medium",
      experienceLevel: "junior",
      targetRoles: ["Backend Engineer", "Full Stack Developer", "Software Engineer"],
      openingPrompt: "Implement an HTTP API Rate Limiter middleware in Node.js / Express that limits clients to 100 requests per minute using Redis.",
      guidedFollowUps: [
        "What are the trade-offs of Fixed Window vs Sliding Window Log algorithms?",
        "How do you prevent race conditions when concurrent requests read and update counts?",
        "How should the middleware respond when Redis drops offline?"
      ],
      tradeOffsToExplore: [
        "Fixed Window vs Sliding Window algorithm",
        "Redis Lua script atomic execution vs Multi/Exec transactions"
      ],
      expectedConcepts: ["Redis", "Rate Limiting", "Middleware", "Race Conditions", "Atomicity"],
      sourceReference: "CareerPilot Curated"
    }
  ],
  cs_fundamentals: [
    {
      scenarioId: "cs-threads-vs-processes",
      title: "Process vs Thread & Memory Management",
      category: "cs_fundamentals",
      subtopic: "OS Fundamentals",
      difficulty: "easy",
      experienceLevel: "fresher",
      targetRoles: ["Software Engineer", "Backend Engineer"],
      openingPrompt: "Explain the core differences between a Process and a Thread in Operating Systems. Discuss how Stack memory differs from Heap memory.",
      guidedFollowUps: [
        "Why is context switching between threads cheaper than between processes?",
        "How does Garbage Collection automatically free Heap memory in managed runtimes?"
      ],
      tradeOffsToExplore: ["Stack allocation (fast, bounded) vs Heap allocation (dynamic, GC cost)"],
      expectedConcepts: ["Process", "Thread", "Stack vs Heap", "Garbage Collection"],
      sourceReference: "OS Concepts"
    },
    {
      scenarioId: "cs-concurrency-deadlocks",
      title: "Concurrency, Multithreading & Race Conditions",
      category: "cs_fundamentals",
      subtopic: "OS & Threads",
      difficulty: "medium",
      experienceLevel: "junior",
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
      experienceLevel: "junior",
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
      difficulty: "medium_hard",
      experienceLevel: "intermediate",
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
 * Deterministic Pipeline: Filters scenarios using candidate maturity and anti-repetition rules.
 */
export async function getDeterministicScenarioRecommendation(userId, { 
  category = "architecture", 
  difficulty = null,
  experienceLevel = null,
  excludeIds = []
} = {}) {
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

  // Determine candidate experience level if not explicitly provided
  const effectiveExperienceLevel = (experienceLevel || "junior").toLowerCase();

  // Determine effective difficulty if not provided
  let effectiveDifficulty = difficulty;
  if (!effectiveDifficulty) {
    if (effectiveExperienceLevel === "fresher") {
      effectiveDifficulty = readinessScore > 75 ? "medium" : "easy";
    } else if (effectiveExperienceLevel === "junior") {
      effectiveDifficulty = "medium";
    } else if (effectiveExperienceLevel === "intermediate") {
      effectiveDifficulty = "medium_hard";
    } else {
      effectiveDifficulty = "hard";
    }
  }

  // 1. Anti-Repetition: Fetch recent rooms completed or created by candidate
  let practicedScenarioIds = new Set(excludeIds || []);
  let practicedTitles = new Set();

  try {
    const recentRooms = await PeerInterviewRoom.find({
      "participants.userId": userId
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("problem")
      .lean();

    recentRooms.forEach(room => {
      if (room.problem?.id) practicedScenarioIds.add(String(room.problem.id));
      if (room.problem?.title) {
        practicedTitles.add(room.problem.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
      }
    });
  } catch (err) {
    console.warn("[DeterministicSelection] Failed fetching recent rooms for anti-repetition:", err.message);
  }

  // 2. Query TechnicalScenarioBank DB
  const query = { isActive: true };
  if (category && category !== "custom") query.category = category;
  if (effectiveDifficulty) query.difficulty = effectiveDifficulty;

  let candidates = await TechnicalScenarioBank.find(query).lean();

  // 3. Fallback to curated set if DB is empty
  if (!candidates || candidates.length === 0) {
    const categoryScenarios = CURATED_CATEGORY_SCENARIOS[category] || CURATED_CATEGORY_SCENARIOS.architecture;
    candidates = categoryScenarios;
  }

  // 4. Apply Anti-Repetition Filter
  let unpracticedCandidates = candidates.filter(c => {
    const sId = String(c.scenarioId || c._id || "");
    const normTitle = (c.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return !practicedScenarioIds.has(sId) && !practicedTitles.has(normTitle);
  });

  // If all options in candidate pool have been practiced, fallback to full candidate pool
  if (unpracticedCandidates.length === 0) {
    unpracticedCandidates = candidates;
  }

  // 5. Match candidate scenarios against user skill gaps deterministically
  const gapNames = skillGaps.map(g => (g.skill || g.canonicalName || "").toLowerCase());
  let bestScenario = null;
  let matchedSkillName = "";

  for (const item of unpracticedCandidates) {
    const concepts = (item.expectedConcepts || []).concat(item.subtopic || []);
    const matched = concepts.find(c => gapNames.some(g => g.includes(String(c).toLowerCase())));
    if (matched) {
      bestScenario = item;
      matchedSkillName = matched;
      break;
    }
  }

  if (!bestScenario) {
    bestScenario = unpracticedCandidates[Math.floor(Math.random() * unpracticedCandidates.length)];
  }

  // 6. Generate transparent explainable rationale card
  let rationale = "";
  const displayLevel = effectiveExperienceLevel.toUpperCase();
  if (matchedSkillName) {
    rationale = `Tailored for ${displayLevel} (${targetRole}). Identifies an active gap in '${matchedSkillName}'. Practicing '${bestScenario.title}' directly addresses this gap.`;
  } else {
    rationale = `Recommended practice scenario for ${displayLevel} candidate targeting ${targetRole} in ${category.toUpperCase().replace("_", " ")}. Focuses on core reasoning and technical decisions.`;
  }

  return {
    scenario: bestScenario,
    rationale,
    targetRole,
    experienceLevel: effectiveExperienceLevel,
    difficulty: effectiveDifficulty,
    readinessScore,
    matchedSkill: matchedSkillName || null
  };
}
