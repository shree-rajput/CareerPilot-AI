import CodingQuestion from "../../models/CodingQuestions.js";
import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import { normalizeCategory } from "../../config/techDiscussionTaxonomy.js";

/**
 * Curated Verified Questions Repository with strict source metadata.
 * Core Practice Modes: CODING, DEVELOPMENT, SYSTEM_DESIGN, INTERVIEW
 * Supported Languages: javascript, python, java, cpp
 */
export const VERIFIED_QUESTION_BANK = [
  // ==========================================
  // 1. CODING (DSA & Algorithms - Language Agnostic)
  // ==========================================
  {
    id: "coding-array-largest",
    title: "Find the Largest Element in an Array",
    category: "coding",
    topic: "Arrays",
    difficulty: "easy",
    prerequisites: ["Loops", "Arrays"],
    expectedSkills: ["Linear Scanning", "Loop Invariant"],
    source: "CURATED",
    sourceUrl: "https://takeuforward.org/data-structure/find-the-largest-element-in-an-array/",
    verified: true,
    fresherAppropriate: true,
    questionType: "coding",
    description: "Given an array of integers `nums`, return the largest element in the array.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function findLargest(nums) {\n  // Write your solution here\n}`,
      python: `def findLargest(nums):\n    # Write your solution here\n    pass`,
      java: `public class Solution {\n    public int findLargest(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nint findLargest(vector<int>& nums) {\n    // Write your solution here\n    return 0;\n}`
    },
    testCases: [
      { input: { nums: [1, 8, 7, 56, 90] }, expectedOutput: 90 },
      { input: { nums: [-2, -5, -1, -10] }, expectedOutput: -1 }
    ]
  },
  {
    id: "dsa-striver-twosum",
    title: "Two Sum (Array Hashmap)",
    category: "coding",
    topic: "Arrays & Hashing",
    difficulty: "easy",
    prerequisites: ["Arrays", "Hash Maps"],
    expectedSkills: ["Time Complexity Optimization", "Space-Time Trade-off"],
    source: "CURATED",
    sourceUrl: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
    verified: true,
    fresherAppropriate: true,
    questionType: "coding",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n  return [];\n}`,
      python: `def twoSum(nums, target):\n    # Write your solution here\n    return []`,
      java: `import java.util.*;\n\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}`,
      cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here\n    return {};\n}`
    },
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2] }
    ]
  },
  {
    id: "dsa-striver-kadanes",
    title: "Maximum Subarray (Kadane's Algorithm)",
    category: "coding",
    topic: "Arrays & Dynamic Programming",
    difficulty: "medium",
    prerequisites: ["Arrays", "Two Sum"],
    expectedSkills: ["Contiguous Subarray Logic", "O(N) Time Complexity"],
    source: "CURATED",
    sourceUrl: "https://takeuforward.org/data-structure/kadanes-algorithm-maximum-subarray-sum-in-an-array/",
    verified: true,
    fresherAppropriate: true,
    questionType: "coding",
    description: "Given an integer array `nums`, find the contiguous subarray with the largest sum and return its sum.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n  // Write your solution here\n  return 0;\n}`,
      python: `def maxSubArray(nums):\n    # Write your solution here\n    return 0`,
      java: `public class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    // Write your solution here\n    return 0;\n}`
    },
    testCases: [
      { input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expectedOutput: 6 },
      { input: { nums: [1] }, expectedOutput: 1 }
    ]
  },
  {
    id: "coding-valid-anagram",
    title: "Valid Anagram Check",
    category: "coding",
    topic: "Strings & Hash Maps",
    difficulty: "easy",
    prerequisites: ["Strings", "Character Frequency"],
    expectedSkills: ["Frequency Counter", "O(N) Complexity"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/valid-anagram",
    verified: true,
    fresherAppropriate: true,
    questionType: "coding",
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function isAnagram(s, t) {\n  // Write your solution here\n  return false;\n}`,
      python: `def isAnagram(s: str, t: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `public class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nbool isAnagram(string s, string t) {\n    // Write your solution here\n    return false;\n}`
    },
    testCases: [
      { input: { s: "anagram", t: "nagaram" }, expectedOutput: true },
      { input: { s: "rat", t: "car" }, expectedOutput: false }
    ]
  },

  // ==========================================
  // ==========================================
  // 2. DEVELOPMENT (Role-Aware Software Engineering)
  // ==========================================
  {
    id: "dev-express-middleware",
    title: "Design & Debug Auth Middleware / Token Verifier",
    category: "development",
    topic: "APIs & Security",
    difficulty: "easy",
    prerequisites: ["Functions", "HTTP Headers"],
    expectedSkills: ["Middleware Flow", "Token Validation", "Error Handling"],
    source: "CURATED",
    sourceUrl: "https://expressjs.com/en/guide/writing-middleware.html",
    verified: true,
    fresherAppropriate: true,
    questionType: "development",
    description: "Write an authorization header token verifier function that validates a Bearer token. Return `true` if valid secret key, otherwise `false`.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function authMiddleware(token) {\n  // Write your solution here\n  return false;\n}`,
      python: `def authMiddleware(token: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `public class Solution {\n    public boolean authMiddleware(String token) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nbool authMiddleware(string token) {\n    // Write your solution here\n    return false;\n}`
    },
    testCases: [
      { input: { token: "Bearer valid_secret_key" }, expectedOutput: true },
      { input: { token: "Bearer wrong_key" }, expectedOutput: false }
    ]
  },
  {
    id: "dev-api-payload-sanitizer",
    title: "API Payload Field Validator & Sanitizer",
    category: "development",
    topic: "API Development & Validation",
    difficulty: "easy",
    prerequisites: ["Objects / Dicts", "String Validation"],
    expectedSkills: ["Input Sanitization", "Field Presence Verification", "API Error Response Format"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/api-payload-sanitizer",
    verified: true,
    fresherAppropriate: true,
    questionType: "development",
    description: "Implement a payload validator `validateRegistrationPayload(data)` that ensures `username` (min 3 chars), valid `email` containing `@`, and `age` >= 18 are present.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function validateRegistrationPayload(data) {\n  // Write your solution here\n  return false;\n}`,
      python: `def validateRegistrationPayload(data: dict) -> bool:\n    # Write your solution here\n    return False`,
      java: `import java.util.*;\n\npublic class Solution {\n    public boolean validateRegistrationPayload(Map<String, Object> data) {\n        // Write your solution here\n        return false;\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nbool validateRegistrationPayload(void* data) {\n    // Write your solution here\n    return false;\n}`
    },
    testCases: [
      { input: { data: { username: "alex", email: "alex@example.com", age: 21 } }, expectedOutput: true },
      { input: { data: { username: "al", email: "invalid-email", age: 16 } }, expectedOutput: false }
    ]
  },
  {
    id: "dev-python-data-processing",
    title: "Data Transformation & Pipeline Cleaning",
    category: "development",
    topic: "Data Processing & Pipelines",
    difficulty: "easy",
    prerequisites: ["Lists", "Dictionaries"],
    expectedSkills: ["Data Cleaning", "Imputation", "Aggregation"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/python-data-cleaning",
    verified: true,
    fresherAppropriate: true,
    questionType: "development",
    description: "Implement a data cleaning function `cleanRecords(records)` that removes null entries, caps values at 100, and returns sorted valid integers.",
    supportedLanguages: ["python", "javascript", "java", "cpp"],
    starterCode: {
      javascript: `function cleanRecords(records) {\n  // Write your solution here\n  return [];\n}`,
      python: `def cleanRecords(records):\n    # Write your solution here\n    return []`,
      java: `import java.util.*;\n\npublic class Solution {\n    public int[] cleanRecords(int[] records) {\n        // Write your solution here\n        return new int[]{};\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nvector<int> cleanRecords(vector<int>& records) {\n    // Write your solution here\n    return {};\n}`
    },
    testCases: [
      { input: { records: [10, null, 150, 45, 0] }, expectedOutput: [0, 10, 45, 100] }
    ]
  },

  // ==========================================
  // 3. SYSTEM DESIGN (Transferable Engineering Concepts)
  // ==========================================
  {
    id: "sd-fresher-http-api",
    title: "HTTP REST API Design & Client-Server Fundamentals",
    category: "system_design",
    topic: "API Design & Protocols",
    difficulty: "easy",
    prerequisites: ["HTTP Basics", "JSON"],
    expectedSkills: ["RESTful Resource Naming", "Stateless API Design"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/http-api-basics",
    verified: true,
    fresherAppropriate: true,
    questionType: "system_design",
    description: "Design a RESTful API contract for an E-commerce Product Catalog and Shopping Cart service. Define resources, endpoints, HTTP methods, headers, status codes, and error payloads.",
    starterCanvasElements: [
      { type: "stencil", stencilType: "client", x: 100, y: 150, text: "Client Application" },
      { type: "stencil", stencilType: "load_balancer", x: 320, y: 150, text: "API Gateway" },
      { type: "stencil", stencilType: "microservice", x: 550, y: 150, text: "Catalog Service" },
      { type: "stencil", stencilType: "database", x: 780, y: 150, text: "Primary Database" }
    ]
  },
  {
    id: "sd-fresher-simple-caching",
    title: "Design an In-Memory Cache Stencil & Expiry Logic",
    category: "system_design",
    topic: "Caching & Performance",
    difficulty: "easy",
    prerequisites: ["Key-Value Storage", "Timestamps"],
    expectedSkills: ["Cache Key Hashing", "TTL Invalidation", "Hit/Miss Ratio"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/simple-cache-stencil",
    verified: true,
    fresherAppropriate: true,
    questionType: "system_design",
    description: "Design a key-value caching helper function `cacheLookup(cacheMap, key, currentTime)` that returns stored value if not expired, or `null` if expired.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function cacheLookup(cacheMap, key, currentTime) {\n  // Write your solution here\n  return null;\n}`,
      python: `def cacheLookup(cacheMap: dict, key: str, currentTime: int):\n    # Write your solution here\n    return None`,
      java: `import java.util.*;\n\npublic class Solution {\n    public Object cacheLookup(Map<String, Object> cacheMap, String key, long currentTime) {\n        return null;\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nvoid* cacheLookup(void* cacheMap, string key, long currentTime) {\n    return nullptr;\n}`
    },
    testCases: [
      { input: { cacheMap: { "user:1": { val: "John", ttl: 100 } }, key: "user:1", currentTime: 50 }, expectedOutput: "John" },
      { input: { cacheMap: { "user:1": { val: "John", ttl: 100 } }, key: "user:1", currentTime: 150 }, expectedOutput: null }
    ],
    starterCanvasElements: [
      { type: "stencil", stencilType: "client", x: 100, y: 150, text: "Web App" },
      { type: "stencil", stencilType: "redis", x: 350, y: 150, text: "In-Memory Cache (Redis)" },
      { type: "stencil", stencilType: "database", x: 650, y: 150, text: "PostgreSQL Database" }
    ]
  },

  // ==========================================
  // 4. INTERVIEW (Role-Driven Mixed Practice)
  // ==========================================
  {
    id: "interview-fresher-debugging",
    title: "Fresher Technical Walkthrough: Isolate & Fix Async Bug",
    category: "interview",
    topic: "Technical Reasoning & Problem Solving",
    difficulty: "easy",
    prerequisites: ["Async Control Flow", "Error Handling"],
    expectedSkills: ["Root Cause Identification", "Safe Async Execution", "Null Checks"],
    source: "CURATED",
    sourceUrl: "https://careerpilot.ai/curated/fresher-async-debugging",
    verified: true,
    fresherAppropriate: true,
    questionType: "interview",
    description: "Analyze a common production bug where an API request fails when user profile data is null. Implement a safe fallback function `safeGetUserCity(user)` that returns city or 'Unknown'.",
    supportedLanguages: ["javascript", "python", "java", "cpp"],
    starterCode: {
      javascript: `function safeGetUserCity(user) {\n  // Write your solution here\n  return "Unknown";\n}`,
      python: `def safeGetUserCity(user: dict) -> str:\n    # Write your solution here\n    return "Unknown"`,
      java: `public class Solution {\n    public String safeGetUserCity(Object user) {\n        return "Unknown";\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nstring safeGetUserCity(void* user) {\n    return "Unknown";\n}`
    },
    testCases: [
      { input: { user: { profile: { address: { city: "Boston" } } } }, expectedOutput: "Boston" },
      { input: { user: null }, expectedOutput: "Unknown" }
    ]
  }
];

/**
 * Returns strictly verified questions for practice mode.
 */
export function getVerifiedQuestions({ category, level, questionType } = {}) {
  let list = VERIFIED_QUESTION_BANK.filter((q) => q.verified === true);

  if (category && category !== "all") {
    const normCategory = normalizeCategory(category);
    if (normCategory !== "interview") {
      list = list.filter((q) => normalizeCategory(q.category) === normCategory);
    }
  }

  if (level) {
    if (level.toUpperCase() === "FRESHER") {
      list = list.filter((q) => q.fresherAppropriate === true);
    }
  }

  if (questionType) {
    const normType = normalizeCategory(questionType);
    if (normType !== "interview") {
      list = list.filter((q) => normalizeCategory(q.questionType) === normType);
    }
  }

  return list;
}
