import { Skill } from "../../models/Skill.js";

// A robust initial seed/dictionary for normalizing common technologies.
// In a full production system, this would be synced with DB or an external API.
const TAXONOMY_DICTIONARY = [
  {
    name: "JavaScript",
    canonicalName: "JavaScript",
    category: "programming_language",
    aliases: ["js", "javascript", "ecmascript"],
    technologyType: "frontend/backend",
  },
  {
    name: "TypeScript",
    canonicalName: "TypeScript",
    category: "programming_language",
    aliases: ["ts", "typescript"],
    technologyType: "frontend/backend",
  },
  {
    name: "Java",
    canonicalName: "Java",
    category: "programming_language",
    aliases: ["java", "core java", "j2ee"],
    technologyType: "backend",
  },
  {
    name: "Python",
    canonicalName: "Python",
    category: "programming_language",
    aliases: ["python", "py"],
    technologyType: "backend/data",
  },
  {
    name: "React.js",
    canonicalName: "React",
    category: "framework",
    aliases: ["react", "react.js", "reactjs", "react js"],
    technologyType: "frontend",
    parentSkill: "JavaScript"
  },
  {
    name: "Next.js",
    canonicalName: "Next.js",
    category: "framework",
    aliases: ["next", "nextjs", "next.js"],
    technologyType: "frontend",
    parentSkill: "React"
  },
  {
    name: "Express.js",
    canonicalName: "Express.js",
    category: "framework",
    aliases: ["express", "expressjs", "express.js", "express js"],
    technologyType: "backend",
    parentSkill: "Node.js"
  },
  {
    name: "Node.js",
    canonicalName: "Node.js",
    category: "framework",
    aliases: ["node", "nodejs", "node.js", "node js"],
    technologyType: "backend",
    parentSkill: "JavaScript"
  },
  {
    name: "MongoDB",
    canonicalName: "MongoDB",
    category: "database",
    aliases: ["mongo", "mongodb", "mongo db"],
    technologyType: "database"
  },
  {
    name: "PostgreSQL",
    canonicalName: "PostgreSQL",
    category: "database",
    aliases: ["postgres", "postgresql", "postgre"],
    technologyType: "database"
  },
  {
    name: "MySQL",
    canonicalName: "MySQL",
    category: "database",
    aliases: ["mysql", "my sql"],
    technologyType: "database"
  },
  {
    name: "HTML",
    canonicalName: "HTML",
    category: "programming_language",
    aliases: ["html", "html5"],
    technologyType: "frontend"
  },
  {
    name: "CSS",
    canonicalName: "CSS",
    category: "programming_language",
    aliases: ["css", "css3"],
    technologyType: "frontend"
  },
  {
    name: "AWS",
    canonicalName: "AWS",
    category: "cloud",
    aliases: ["aws", "amazon web services"],
    technologyType: "cloud"
  },
  {
    name: "Docker",
    canonicalName: "Docker",
    category: "devops",
    aliases: ["docker", "dockerize"],
    technologyType: "devops"
  },
  {
    name: "Git",
    canonicalName: "Git",
    category: "tool",
    aliases: ["git", "version control", "github", "gitlab"],
    technologyType: "tool"
  },
  {
    name: "GitHub Actions",
    canonicalName: "GitHub Actions",
    category: "devops",
    aliases: ["github actions", "gh actions", "actions", "ci/cd"],
    technologyType: "devops"
  },
  {
    name: "Vue.js",
    canonicalName: "Vue.js",
    category: "framework",
    aliases: ["vue", "vuejs", "vue.js", "vue 3"],
    technologyType: "frontend"
  },
  {
    name: "Angular",
    canonicalName: "Angular",
    category: "framework",
    aliases: ["angular", "angularjs", "angular.js", "angular 2+"],
    technologyType: "frontend"
  },
  {
    name: "Tailwind CSS",
    canonicalName: "Tailwind CSS",
    category: "framework",
    aliases: ["tailwind", "tailwindcss", "tailwind css"],
    technologyType: "frontend"
  },
  {
    name: "Bootstrap",
    canonicalName: "Bootstrap",
    category: "framework",
    aliases: ["bootstrap", "bootstrap 5"],
    technologyType: "frontend"
  },
  {
    name: "C++",
    canonicalName: "C++",
    category: "programming_language",
    aliases: ["c++", "cpp", "c plus plus"],
    technologyType: "backend/systems"
  },
  {
    name: "C#",
    canonicalName: "C#",
    category: "programming_language",
    aliases: ["c#", "csharp", "c sharp", ".net"],
    technologyType: "backend"
  },
  {
    name: "Go",
    canonicalName: "Go",
    category: "programming_language",
    aliases: ["golang", "go"],
    technologyType: "backend"
  },
  {
    name: "Rust",
    canonicalName: "Rust",
    category: "programming_language",
    aliases: ["rust", "rustlang"],
    technologyType: "backend/systems"
  },
  {
    name: "Ruby",
    canonicalName: "Ruby",
    category: "programming_language",
    aliases: ["ruby", "ror", "ruby on rails"],
    technologyType: "backend"
  },
  {
    name: "PHP",
    canonicalName: "PHP",
    category: "programming_language",
    aliases: ["php", "laravel"],
    technologyType: "backend"
  },
  {
    name: "Django",
    canonicalName: "Django",
    category: "framework",
    aliases: ["django"],
    technologyType: "backend",
    parentSkill: "Python"
  },
  {
    name: "Flask",
    canonicalName: "Flask",
    category: "framework",
    aliases: ["flask"],
    technologyType: "backend",
    parentSkill: "Python"
  },
  {
    name: "FastAPI",
    canonicalName: "FastAPI",
    category: "framework",
    aliases: ["fastapi", "fast api"],
    technologyType: "backend",
    parentSkill: "Python"
  },
  {
    name: "Spring Boot",
    canonicalName: "Spring Boot",
    category: "framework",
    aliases: ["spring", "spring boot", "springboot"],
    technologyType: "backend",
    parentSkill: "Java"
  },
  {
    name: "GraphQL",
    canonicalName: "GraphQL",
    category: "tool",
    aliases: ["graphql", "gql"],
    technologyType: "backend/frontend"
  },
  {
    name: "REST API",
    canonicalName: "REST API",
    category: "tool",
    aliases: ["rest", "restful", "rest api", "restful api"],
    technologyType: "backend"
  },
  {
    name: "Redis",
    canonicalName: "Redis",
    category: "database",
    aliases: ["redis", "in-memory db"],
    technologyType: "database"
  },
  {
    name: "SQL",
    canonicalName: "SQL",
    category: "programming_language",
    aliases: ["sql", "relational database"],
    technologyType: "database"
  }
];

// Anti-patterns that should never be extracted as skills.
const INVALID_SKILLS = new Set([
  "skills",
  "technical skills",
  "frameworks",
  "libraries",
  "languages",
  "databases",
  "tools",
  "technologies",
  "experience",
  "projects",
  "education",
  "frame",
  "skill",
  "tool",
  "language",
  "database",
  "library"
]);

/**
 * Normalizes a raw skill string to its canonical form and category.
 * If not in the dictionary, returns a generic cleaned version.
 */
export function normalizeSkill(rawSkill) {
  if (!rawSkill || typeof rawSkill !== "string") return null;

  const cleaned = rawSkill.trim();
  const lower = cleaned.toLowerCase();

  if (INVALID_SKILLS.has(lower) || lower.length < 2) {
    return null; // Ignore section headers or too short strings
  }

  // Look up in dictionary
  for (const entry of TAXONOMY_DICTIONARY) {
    if (entry.canonicalName.toLowerCase() === lower || entry.aliases.includes(lower)) {
      return {
        name: entry.name,
        canonicalName: entry.canonicalName,
        category: entry.category,
        technologyType: entry.technologyType,
        isKnown: true
      };
    }
  }

  // Fallback for unknown skills
  return {
    name: cleaned,
    canonicalName: cleaned, // We could title-case it, but original case is safest
    category: "other",
    technologyType: "",
    isKnown: false
  };
}

/**
 * Filters and normalizes an array of skills, removing duplicates.
 */
export function processExtractedSkills(rawSkillsArray) {
  if (!Array.isArray(rawSkillsArray)) return [];

  const uniqueMap = new Map();

  for (const raw of rawSkillsArray) {
    const normalized = normalizeSkill(raw);
    if (normalized) {
      if (!uniqueMap.has(normalized.canonicalName.toLowerCase())) {
        uniqueMap.set(normalized.canonicalName.toLowerCase(), normalized);
      }
    }
  }

  return Array.from(uniqueMap.values());
}
