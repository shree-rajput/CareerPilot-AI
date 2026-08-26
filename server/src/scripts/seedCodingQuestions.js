import dotenv from "dotenv";
import mongoose from "mongoose";
import CodingQuestion from "../models/CodingQuestions.js";
import { env } from "../config/env.js";
dotenv.config();

const MONGO_URI = env.mongodbUri;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not configured.");
}

const questions = [
  {
    title: "Two Sum",

    description:
      "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.",

    difficulty: "easy",

    topics: ["arrays", "hash-map", "problem-solving"],

    supportedLanguages: ["javascript", "python", "java", "cpp"],

    defaultLanguage: "javascript",

    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write your solution here
}
`,

      python: `def two_sum(nums, target):
    # Write your solution here
    pass
`,

      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
    }
}
`,

      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
    }
};
`,
    },

    testCases: [
      {
        input: {
          nums: [2, 7, 11, 15],
          target: 9,
        },

        expectedOutput: [0, 1],

        explanation: "nums[0] + nums[1] = 9",

        hidden: false,

        weight: 1,
      },

      {
        input: {
          nums: [3, 2, 4],
          target: 6,
        },

        expectedOutput: [1, 2],

        explanation: "nums[1] + nums[2] = 6",

        hidden: false,

        weight: 1,
      },

      {
        input: {
          nums: [3, 3],
          target: 6,
        },

        expectedOutput: [0, 1],

        hidden: true,

        weight: 2,
      },
    ],

    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Each input has exactly one solution.",
    ],

    hints: [
      "Think about how you can remember numbers you have already seen.",
      "A hash map can reduce the lookup time.",
    ],

    expectedComplexity: {
      time: "O(n)",
      space: "O(n)",
    },

    evaluationCriteria: {
      correctness: 40,
      codeQuality: 20,
      timeComplexity: 20,
      spaceComplexity: 10,
      explanation: 10,
    },

    tags: ["dsa", "arrays", "hashing", "interview"],

    companyTags: [],

    source: "system",

    isActive: true,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected.");

    await CodingQuestion.deleteMany({
      source: "system",
    });

    await CodingQuestion.insertMany(questions);

    console.log(`Seeded ${questions.length} coding question(s).`);

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("Coding question seed failed:", error);

    await mongoose.disconnect();

    process.exit(1);
  }
};

seed();
