export const DYNAMIC_QUESTION_SYSTEM = `You are a Senior Staff Software Engineer and Principal AI Technical Interviewer at CareerPilot AI.
Your task is to dynamically generate a fresh, production-grade, role-aware, skill-aware, experience-appropriate technical interview question specifically tailored for the candidate.

STRICT INSTRUCTIONS:
1. TARGET ROLE & SKILLS ALIGNMENT: The question MUST directly test the candidate's target role and verified skills.
2. EXPERIENCE CALIBRATION:
   - "fresher" (0-1 yrs): Clear, approachable, foundational scenarios, clean code, no trick edge cases or hyper-complex distributed systems.
   - "junior" / "mid" / "senior": Proportional depth, trade-offs, architecture, edge cases, and performance considerations.
3. EXCLUDED QUESTIONS & CONCEPTS: Strictly avoid repeating or paraphrasing any question in the "avoidQuestions" list or covering concepts in "avoidConcepts".
4. EXECUTABLE CONTRACT & STARTER CODE:
   - Function name MUST be "solution".
   - execution object: { "mode": "FUNCTION", "functionName": "solution", "parameters": [{"name": "input", "type": "AUTO"}], "returnType": "AUTO" }
   - Starter code in javascript: "function solution(input) {\\n  // Write solution here\\n}"
   - Starter code in python: "def solution(input):\\n    pass"
   - testCases MUST be valid JSON objects with "input" and "expectedOutput".
   - referenceSolution MUST include a working javascript and python implementation of function solution(input) that returns expectedOutput for each test case!
5. OUTPUT FORMAT: Return valid JSON matching the schema strictly. Do not include markdown code fences or conversational text outside JSON.`;

export function buildDynamicQuestionPrompt(context = {}) {
  const {
    mode = "coding",
    targetRole = "Software Engineer",
    experienceLevel = "fresher",
    skills = [],
    userSkills = [],
    topic = "coding",
    difficulty = "medium",
    language = "javascript",
    avoidQuestions = [],
    avoidConcepts = []
  } = context;

  const validSkills = Array.isArray(skills) && skills.length > 0 ? skills : (Array.isArray(userSkills) && userSkills.length > 0 ? userSkills : ["General Programming", "Logical Reasoning"]);
  const skillStr = validSkills.join(", ");
  const avoidQStr = Array.isArray(avoidQuestions) && avoidQuestions.length > 0 ? avoidQuestions.map(q => `- ${q}`).join("\n") : "- None";
  const avoidCStr = Array.isArray(avoidConcepts) && avoidConcepts.length > 0 ? avoidConcepts.join(", ") : "None";

  return `Generate a fresh, unique ${difficulty.toUpperCase()} technical challenge for a candidate.

CANDIDATE PROFILE:
- Target Role: "${targetRole}"
- Experience Level: "${experienceLevel.toUpperCase()}"
- Verified Technical Skills: [${skillStr}]

PRACTICE SESSION CONFIGURATION:
- Mode: "${mode}"
- Primary Topic / Technology: "${topic}"
- Requested Difficulty: "${difficulty}"
- Default Language: "${language}"

STRICT NEGATIVE CONTEXT — DO NOT REPEAT OR PARAPHRASE:
Avoid previously asked questions:
${avoidQStr}

Avoid previously covered concepts: [${avoidCStr}]

Generate complete JSON object matching dynamicQuestionSchema. Ensure constraints, guidedFollowUps, evaluationCriteria, concepts, and expectedSkills are arrays of strings. Ensure referenceSolution contains valid code for function solution(input).`;
}
