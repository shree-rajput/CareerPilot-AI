import { Skill } from "../../models/Skill.js";

/**
 * Built-in static taxonomy database containing common tech stack canonical names,
 * aliases, categories, parent skills, and related skills.
 */
const DEFAULT_SKILL_TAXONOMY = [
  // Programming Languages
  {
    name: "JavaScript",
    canonicalName: "JavaScript",
    aliases: ["javascript", "js", "ecmascript", "es6", "es2015", "vanilla js"],
    category: "programming_language",
    technologyType: "fullstack",
    relatedSkills: ["TypeScript", "Node.js", "React"]
  },
  {
    name: "TypeScript",
    canonicalName: "TypeScript",
    aliases: ["typescript", "ts"],
    category: "programming_language",
    technologyType: "fullstack",
    parentSkill: "JavaScript",
    relatedSkills: ["JavaScript", "React", "Node.js"]
  },
  {
    name: "Python",
    canonicalName: "Python",
    aliases: ["python", "py", "python3", "py3"],
    category: "programming_language",
    technologyType: "backend",
    relatedSkills: ["Django", "FastAPI", "Flask", "Pandas", "PyTorch"]
  },
  {
    name: "Java",
    canonicalName: "Java",
    aliases: ["java", "jdk", "j2ee"],
    category: "programming_language",
    technologyType: "backend",
    relatedSkills: ["Spring Boot", "Kotlin", "Maven"]
  },
  {
    name: "C++",
    canonicalName: "C++",
    aliases: ["c++", "cpp", "cplusplus"],
    category: "programming_language",
    technologyType: "systems",
    relatedSkills: ["C", "C#", "Data Structures", "Algorithms"]
  },
  {
    name: "Go",
    canonicalName: "Go",
    aliases: ["go", "golang"],
    category: "programming_language",
    technologyType: "backend",
    relatedSkills: ["Docker", "Kubernetes", "Microservices"]
  },

  // Frontend Frameworks & Libraries
  {
    name: "React",
    canonicalName: "React",
    aliases: ["react", "reactjs", "react.js", "react-js"],
    category: "framework",
    technologyType: "frontend",
    parentSkill: "JavaScript",
    relatedSkills: ["Redux", "Next.js", "TypeScript", "HTML5", "CSS3"]
  },
  {
    name: "Next.js",
    canonicalName: "Next.js",
    aliases: ["next.js", "nextjs", "next"],
    category: "framework",
    technologyType: "frontend",
    parentSkill: "React",
    relatedSkills: ["React", "TypeScript", "Node.js"]
  },
  {
    name: "Vue.js",
    canonicalName: "Vue.js",
    aliases: ["vue", "vuejs", "vue.js", "nuxt"],
    category: "framework",
    technologyType: "frontend",
    parentSkill: "JavaScript",
    relatedSkills: ["JavaScript", "HTML5", "CSS3"]
  },

  // Backend Frameworks & Runtimes
  {
    name: "Node.js",
    canonicalName: "Node.js",
    aliases: ["node.js", "nodejs", "node", "node-js"],
    category: "framework",
    technologyType: "backend",
    parentSkill: "JavaScript",
    relatedSkills: ["Express.js", "JavaScript", "TypeScript", "MongoDB", "REST API"]
  },
  {
    name: "Express.js",
    canonicalName: "Express.js",
    aliases: ["express", "expressjs", "express.js"],
    category: "framework",
    technologyType: "backend",
    parentSkill: "Node.js",
    relatedSkills: ["Node.js", "REST API", "MongoDB"]
  },
  {
    name: "Django",
    canonicalName: "Django",
    aliases: ["django", "django rest framework", "drf"],
    category: "framework",
    technologyType: "backend",
    parentSkill: "Python",
    relatedSkills: ["Python", "PostgreSQL", "REST API"]
  },
  {
    name: "Spring Boot",
    canonicalName: "Spring Boot",
    aliases: ["spring boot", "springboot", "spring framework", "spring"],
    category: "framework",
    technologyType: "backend",
    parentSkill: "Java",
    relatedSkills: ["Java", "Microservices", "Hibernate"]
  },

  // Databases & Storage
  {
    name: "PostgreSQL",
    canonicalName: "PostgreSQL",
    aliases: ["postgresql", "postgres", "pg", "psql"],
    category: "database",
    technologyType: "backend",
    relatedSkills: ["SQL", "Database Design", "Prisma", "Sequelize"]
  },
  {
    name: "MongoDB",
    canonicalName: "MongoDB",
    aliases: ["mongodb", "mongo", "mongoose"],
    category: "database",
    technologyType: "backend",
    relatedSkills: ["NoSQL", "Node.js", "Express.js"]
  },
  {
    name: "Redis",
    canonicalName: "Redis",
    aliases: ["redis", "in-memory cache", "cache"],
    category: "database",
    technologyType: "backend",
    relatedSkills: ["Caching", "System Design", "Node.js"]
  },

  // Cloud & DevOps
  {
    name: "AWS",
    canonicalName: "AWS",
    aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"],
    category: "cloud",
    technologyType: "devops",
    relatedSkills: ["Docker", "Kubernetes", "Cloud Computing"]
  },
  {
    name: "Docker",
    canonicalName: "Docker",
    aliases: ["docker", "containerization", "containers"],
    category: "devops",
    technologyType: "devops",
    relatedSkills: ["Kubernetes", "DevOps", "CI/CD"]
  },
  {
    name: "Kubernetes",
    canonicalName: "Kubernetes",
    aliases: ["kubernetes", "k8s", "k8"],
    category: "devops",
    technologyType: "devops",
    relatedSkills: ["Docker", "AWS", "DevOps"]
  },

  // System Design & CS Core Concepts
  {
    name: "System Design",
    canonicalName: "System Design",
    aliases: ["system design", "distributed systems", "software architecture", "scalability"],
    category: "concept",
    technologyType: "fullstack",
    relatedSkills: ["Microservices", "Load Balancing", "Caching", "Database Sharding"]
  },
  {
    name: "Data Structures & Algorithms",
    canonicalName: "Data Structures & Algorithms",
    aliases: ["dsa", "data structures", "algorithms", "problem solving", "leetcode"],
    category: "concept",
    technologyType: "fullstack",
    relatedSkills: ["C++", "Java", "Python", "Problem Solving"]
  }
];

// In-memory cache map for rapid lookups
const canonicalMap = new Map();
const aliasMap = new Map();

/**
 * Initializes the skill taxonomy database and populates the in-memory lookup cache.
 */
export async function initializeSkillTaxonomy() {
  try {
    for (const item of DEFAULT_SKILL_TAXONOMY) {
      canonicalMap.set(item.canonicalName.toLowerCase(), item);
      for (const alias of item.aliases) {
        aliasMap.set(alias.toLowerCase(), item.canonicalName);
      }
    }

    // Attempt to merge custom DB entries if MongoDB is active
    const dbSkills = await Skill.find().lean().catch(() => []);
    for (const item of dbSkills) {
      if (item.canonicalName) {
        canonicalMap.set(item.canonicalName.toLowerCase(), item);
        for (const alias of item.aliases || []) {
          aliasMap.set(alias.toLowerCase(), item.canonicalName);
        }
      }
    }
  } catch (err) {
    console.warn("Skill taxonomy DB sync warning:", err.message);
  }
}

// Auto-initialize in-memory cache
initializeSkillTaxonomy();

/**
 * Normalizes a raw skill string into its canonical representation.
 * Returns { canonicalName, category, aliasUsed, confidence }
 */
export function normalizeSkill(rawSkill) {
  if (!rawSkill || typeof rawSkill !== "string") {
    return { canonicalName: "Unknown", category: "other", aliasUsed: "", confidence: 0 };
  }

  const cleaned = rawSkill.trim().toLowerCase();
  if (!cleaned) {
    return { canonicalName: "Unknown", category: "other", aliasUsed: "", confidence: 0 };
  }

  // 1. Check exact canonical match
  if (canonicalMap.has(cleaned)) {
    const entry = canonicalMap.get(cleaned);
    return {
      canonicalName: entry.canonicalName,
      category: entry.category || "other",
      technologyType: entry.technologyType || "",
      aliasUsed: "",
      confidence: 1.0
    };
  }

  // 2. Check direct alias match
  if (aliasMap.has(cleaned)) {
    const canonicalName = aliasMap.get(cleaned);
    const entry = canonicalMap.get(canonicalName.toLowerCase());
    return {
      canonicalName,
      category: entry ? entry.category : "other",
      technologyType: entry ? entry.technologyType : "",
      aliasUsed: cleaned,
      confidence: 0.95
    };
  }

  // 3. Fallback normalization: Capitalize words cleanly
  const formatted = rawSkill
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return {
    canonicalName: formatted,
    category: "other",
    technologyType: "",
    aliasUsed: "",
    confidence: 0.7
  };
}

/**
 * Normalizes an array of raw skill strings into unique canonical skill objects.
 */
export function normalizeSkillList(skillsArray) {
  if (!Array.isArray(skillsArray)) return [];
  const seen = new Set();
  const result = [];

  for (const raw of skillsArray) {
    const norm = normalizeSkill(raw);
    const key = norm.canonicalName.toLowerCase();
    if (norm.canonicalName !== "Unknown" && !seen.has(key)) {
      seen.add(key);
      result.push(norm);
    }
  }

  return result;
}

/**
 * Compares two skills semantically using canonical taxonomy.
 * Returns { matchType: 'EQUIVALENT' | 'RELATED' | 'PARENT' | 'CHILD' | 'PARTIAL' | 'UNKNOWN', score: number }
 */
export function compareSkills(skillA, skillB) {
  const normA = normalizeSkill(typeof skillA === "string" ? skillA : skillA?.canonicalName || skillA?.name || "");
  const normB = normalizeSkill(typeof skillB === "string" ? skillB : skillB?.canonicalName || skillB?.name || "");

  if (normA.canonicalName === "Unknown" || normB.canonicalName === "Unknown") {
    return { matchType: "UNKNOWN", score: 0.0 };
  }

  const nameA = normA.canonicalName.toLowerCase();
  const nameB = normB.canonicalName.toLowerCase();

  // 1. Equivalent (Exact canonical or alias match)
  if (nameA === nameB) {
    return { matchType: "EQUIVALENT", score: 1.0 };
  }

  const entryA = canonicalMap.get(nameA);
  const entryB = canonicalMap.get(nameB);

  // 2. Parent / Child Relationship
  if (entryA?.parentSkill?.toLowerCase() === nameB) {
    return { matchType: "CHILD", score: 0.85 }; // Skill A is child of Skill B
  }
  if (entryB?.parentSkill?.toLowerCase() === nameA) {
    return { matchType: "PARENT", score: 0.85 }; // Skill A is parent of Skill B
  }

  // 3. Related Skills Relationship
  if (entryA?.relatedSkills?.some(s => s.toLowerCase() === nameB) ||
      entryB?.relatedSkills?.some(s => s.toLowerCase() === nameA)) {
    return { matchType: "RELATED", score: 0.75 };
  }

  // 4. Token Substring / Partial Overlap Fallback
  if (nameA.includes(nameB) || nameB.includes(nameA)) {
    return { matchType: "PARTIAL", score: 0.6 };
  }

  return { matchType: "UNKNOWN", score: 0.0 };
}
