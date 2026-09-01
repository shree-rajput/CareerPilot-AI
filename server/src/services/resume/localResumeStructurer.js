import { processExtractedSkills } from "../career/taxonomyService.js";

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()))];
}

function extractSection(text, headingNames) {
  const headingPattern = headingNames.join("|");
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:${headingPattern})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:summary|objective|skills|technical skills|education|experience|work experience|projects|certifications|achievements|links)\\s*:?\\s*\\n|$)`,
    "i"
  );
  return text.match(regex)?.[1]?.trim() || "";
}

function splitBullets(sectionText) {
  return sectionText
    .split(/\n|•|- /)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 2);
}

function extractSkills(text) {
  const skillsSection = extractSection(text, ["skills", "technical skills", "technologies"]);
  
  // Try to find skills from the skills section specifically
  let rawSkills = [];
  if (skillsSection) {
    // Split by commas, bullets, newlines
    rawSkills = skillsSection.split(/[,|•\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length <= 40);
  } else {
    // If no explicit skills section, we could attempt to parse the whole text,
    // but without AI it's risky and leads to false positives. We will do a basic word tokenization
    // and let the taxonomy filter handle it.
    rawSkills = text.split(/[\s,./|()[\]{}"':;]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length <= 40);
  }

  const processed = processExtractedSkills(rawSkills);
  return processed.map(p => ({
    canonicalName: p.canonicalName,
    originalMention: p.originalMention || p.canonicalName,
    category: p.category || "other",
    source: "skills_section",
    proficiency: "emerging",
    confidence: 50,
    evidence: "Found via local keyword extraction"
  }));
}

function extractLinks(text) {
  const urls = text.match(/https?:\/\/[^\s)]+/gi) || [];
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  return unique([...urls, email ? `mailto:${email}` : ""]);
}

function extractProjects(text) {
  const projectsSection = extractSection(text, ["projects"]);
  return splitBullets(projectsSection).slice(0, 8).map((line) => ({
    name: line.split(/[:|-]/)[0]?.trim().slice(0, 80) || "Project",
    description: line,
    technologies: extractSkills(line).map(s => s.canonicalName),
    problemSolved: "",
    technicalComplexity: "",
    userImpact: "",
    role: "",
    confidence: 50,
    link: line.match(/https?:\/\/[^\s)]+/i)?.[0] || ""
  }));
}

function extractEducation(text) {
  const educationSection = extractSection(text, ["education"]);
  return splitBullets(educationSection).slice(0, 5).map((line) => ({
    institution: line,
    degree: "",
    branch: "",
    startYear: "",
    endYear: "",
    gpa: line.match(/\b(?:CGPA|GPA)\s*[:\-]?\s*([0-9.]+)/i)?.[1] || ""
  }));
}

function extractExperience(text) {
  const experienceSection = extractSection(text, ["experience", "work experience"]);
  return splitBullets(experienceSection).slice(0, 8).map((line) => ({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    description: line
  }));
}

export function structureResumeLocally(rawText) {
  const text = String(rawText || "");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || "";
  const summary = extractSection(text, ["summary", "objective"]);
  const certifications = splitBullets(extractSection(text, ["certifications"])).map((line) => ({
    name: line,
    issuer: "",
    date: ""
  }));

  return {
    name: lines[0] && lines[0].length <= 80 ? lines[0] : "",
    email,
    phone,
    location: "",
    links: extractLinks(text),
    summary,
    skills: extractSkills(text),
    education: extractEducation(text),
    experience: extractExperience(text),
    projects: extractProjects(text),
    certifications,
    achievements: splitBullets(extractSection(text, ["achievements"])),
    parserSource: "local"
  };
}
