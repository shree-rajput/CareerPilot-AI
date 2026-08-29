import { User } from "../models/User.js";

const demoMentors = [
  {
    name: "Rahul Sharma",
    email: "rahul.google@demo.careerpilot.ai",
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345", // Mock hash
    mentorStatus: "approved",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul",
    mentorProfile: {
      role: "Senior Software Engineer",
      company: "Google",
      experienceYears: 8,
      skills: ["Java", "System Design", "Kubernetes", "Redis", "Distributed Systems", "C++"],
      specialties: ["System Design", "Backend Architecture", "Mock Interviews"],
      availability: ["Monday 4:00 PM - 6:00 PM", "Wednesday 2:00 PM - 5:00 PM"],
      bio: "Senior Backend Engineer at Google. Passionate about helping students crack distributed systems design, databases scale, and high-concurrency architecture loops.",
      topics: ["System Design Mock", "Resume Architectural Audit", "Backend Stack Strategy"],
      rating: 4.9,
      reviewsCount: 14
    }
  },
  {
    name: "Priya Patel",
    email: "priya.stripe@demo.careerpilot.ai",
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    mentorStatus: "approved",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Priya",
    mentorProfile: {
      role: "Tech Lead, Frontend",
      company: "Stripe",
      experienceYears: 6,
      skills: ["React", "JavaScript", "TypeScript", "CSS", "Next.js", "Web Performance"],
      specialties: ["Frontend", "UX & Accessibility", "React Deep Dive"],
      availability: ["Tuesday 3:00 PM - 5:00 PM", "Thursday 4:00 PM - 7:00 PM"],
      bio: "Frontend Lead at Stripe. I help engineers construct beautiful, accessible, and high-performance user interfaces while mastering modern React architectures.",
      topics: ["Frontend Portfolio Review", "React Performance Optimization", "Stripe Tech Screen Prep"],
      rating: 4.8,
      reviewsCount: 9
    }
  },
  {
    name: "Ananya Sen",
    email: "ananya.meta@demo.careerpilot.ai",
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    mentorStatus: "approved",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ananya",
    mentorProfile: {
      role: "Staff Engineer",
      company: "Meta",
      experienceYears: 10,
      skills: ["Python", "Algorithms", "Data Structures", "Dynamic Programming", "Graph Theory"],
      specialties: ["DSA", "LeetCode Prep", "Staff Mock Interview"],
      availability: ["Friday 1:00 PM - 4:00 PM", "Saturday 10:00 AM - 12:00 PM"],
      bio: "Algorithms and Graph Specialist at Meta. Expert at breaking down complex DP, recursion, trees, and greedy programming paradigms for clear whiteboard evaluation.",
      topics: ["DSA Whiteboard Mock", "Dynamic Programming Mastery", "Meta SDE Screen Strategy"],
      rating: 4.9,
      reviewsCount: 22
    }
  },
  {
    name: "Vikram Malhotra",
    email: "vikram.netflix@demo.careerpilot.ai",
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    mentorStatus: "approved",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Vikram",
    mentorProfile: {
      role: "VP of Engineering",
      company: "Netflix",
      experienceYears: 15,
      skills: ["Team Leadership", "Career Strategy", "Salary Negotiation", "System Design", "Java"],
      specialties: ["Career Strategy", "Engineering Leadership", "HR Round Mock"],
      availability: ["Wednesday 6:00 PM - 8:00 PM"],
      bio: "VP of Engineering at Netflix. Helping candidates transition into high-impact engineering leadership and navigate behavioral loops and salary negotiation.",
      topics: ["Behavioral/HR Mock", "Salary Negotiation Blueprint", "Career Trajectory Review"],
      rating: 5.0,
      reviewsCount: 31
    }
  },
  {
    name: "Sam Wilson",
    email: "sam.amazon@demo.careerpilot.ai",
    passwordHash: "$2a$10$DEMOHASHNOTFORPRODUCTIONUSEONLY12345",
    mentorStatus: "approved",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam",
    mentorProfile: {
      role: "SDE 2",
      company: "Amazon",
      experienceYears: 4,
      skills: ["AWS", "Java", "NoSQL", "Microservices", "CI/CD"],
      specialties: ["Cloud Infrastructure", "Backend Development", "Behavioral Prep"],
      availability: ["Monday 10:00 AM - 12:00 PM", "Thursday 10:00 AM - 12:00 PM"],
      bio: "Cloud Systems Developer at Amazon. Happy to evaluate backend microservices designs, AWS architectures, CI/CD automation, and Amazon Leadership Principles prep.",
      topics: ["AWS Design Review", "SDE II Entry Strategy", "Behavioral Interview Prep"],
      rating: 4.7,
      reviewsCount: 8
    }
  }
];

/**
 * Seeds default mentors if SEED_DEMO_DATA environment variable is set to true.
 */
export async function seedDefaultMentors() {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("ℹ️ SEED_DEMO_DATA is not enabled. Skipping mock mentor seeding.");
    return;
  }

  try {
    console.log("🌱 Checking and seeding default demo mentors...");
    for (const mentorData of demoMentors) {
      const exists = await User.findOne({ email: mentorData.email });
      if (!exists) {
        const newMentor = new User(mentorData);
        await newMentor.save();
        console.log(`   + Seeded demo mentor: ${mentorData.name}`);
      }
    }
    console.log("✅ Seed check complete.");
  } catch (error) {
    console.error("❌ Failed to seed default demo mentors:", error);
  }
}
