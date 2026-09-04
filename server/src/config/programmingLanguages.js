/**
 * Canonical Programming Language Registry for CareerPilot AI
 * Core Supported Languages: JavaScript, Python, Java, C++
 */

export const PROGRAMMING_LANGUAGES = {
  javascript: {
    id: "javascript",
    displayName: "JavaScript",
    fileExtension: "js",
    executionConfig: { runtime: "node", version: "20.x" },
    supportedModes: ["coding", "development", "interview"]
  },
  python: {
    id: "python",
    displayName: "Python",
    fileExtension: "py",
    executionConfig: { runtime: "python3", version: "3.11.x" },
    supportedModes: ["coding", "development", "system_design", "interview"]
  },
  java: {
    id: "java",
    displayName: "Java",
    fileExtension: "java",
    executionConfig: { runtime: "openjdk", version: "17" },
    supportedModes: ["coding", "development", "interview"]
  },
  cpp: {
    id: "cpp",
    displayName: "C++",
    fileExtension: "cpp",
    executionConfig: { runtime: "g++", version: "c++17" },
    supportedModes: ["coding", "development", "interview"]
  }
};

export function getSupportedLanguages() {
  return Object.values(PROGRAMMING_LANGUAGES);
}

export function getLanguageConfig(id) {
  if (!id) return PROGRAMMING_LANGUAGES.javascript;
  const key = String(id).toLowerCase();
  return PROGRAMMING_LANGUAGES[key] || PROGRAMMING_LANGUAGES.javascript;
}

export function isValidLanguage(id) {
  if (!id) return false;
  return Boolean(PROGRAMMING_LANGUAGES[String(id).toLowerCase()]);
}
