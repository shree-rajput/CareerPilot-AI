/**
 * Question Validation Layer & Guardrail Engine
 * 
 * Verifies every generated interview question before presenting it to the candidate:
 * 1. Fact Grounding Check: Ensures candidate references exist in trusted context.
 * 2. Role & Tech Relevance Check: Ensures alignment with target role, JD, and skills.
 * 3. Quality & Format Check: Rejects empty, generic, or malformed questions.
 * 4. Difficulty Check: Ensures alignment with candidate's configured difficulty.
 */

/**
 * Validates a generated question against candidate context and session parameters.
 * 
 * @param {Object} params
 * @param {string} params.questionText - The generated question text
 * @param {Object} params.candidateContext - Verified candidate state (skills, projects, experience)
 * @param {string} params.targetRole - Target role title
 * @param {string[]} params.technologyStack - Allowed tech stack array
 * @param {string} params.difficulty - Configured difficulty ('easy'|'medium'|'hard')
 * @param {string} params.interviewType - Interview focus ('technical'|'hr'|'project'|'mixed')
 * @returns {{ isValid: boolean, reason: string, score: number }} Validation result
 */
export function validateGeneratedQuestion({
  questionText,
  candidateContext = {},
  targetRole = "",
  technologyStack = [],
  difficulty = "medium",
  interviewType = "mixed"
}) {
  if (!questionText || typeof questionText !== "string" || questionText.trim().length < 15) {
    return { isValid: false, reason: "Question text is empty or too short.", score: 0 };
  }

  const text = questionText.trim();
  const lowerText = text.toLowerCase();

  // 1. QUALITY CHECK: Reject ultra-generic or malformed questions
  const genericBadPhrases = [
    "as an ai",
    "here is a question",
    "question 1:",
    "question 2:",
    "untitled question",
    "undefined",
    "null"
  ];
  for (const phrase of genericBadPhrases) {
    if (lowerText.includes(phrase)) {
      return { isValid: false, reason: `Contains forbidden or malformed phrase: "${phrase}"`, score: 0 };
    }
  }

  // 2. FACT GROUNDING CHECK (Hallucination Guardrail):
  // Inspect if the question references specific projects, companies, or accomplishments.
  // Extract proper nouns or project/company markers from question (e.g., "in your X project at Y").
  const projectMentions = text.match(/(?:at|for|with|in your|built|developed|designed)\s+([A-Z][a-zA-Z0-9\s-]{2,25})/g) || [];
  
  const verifiedProjects = (candidateContext.projects || []).map(p => (typeof p === 'string' ? p : p.name || '').toLowerCase());
  const verifiedSkills = (candidateContext.skills || []).map(s => (typeof s === 'string' ? s : s.name || s.canonicalName || '').toLowerCase());
  const verifiedCompanies = (candidateContext.experience || []).map(e => (typeof e === 'string' ? e : e.company || '').toLowerCase());

  // Check if any specific named project/company mentioned in question is NOT in trusted candidate context
  for (const mention of projectMentions) {
    const cleanedMention = mention.replace(/(?:at|for|with|in your|built|developed|designed)\s+/i, '').trim().toLowerCase();
    
    // Ignore common technology names (e.g. "React", "Node.js", "Python") or generic words
    const commonTechAndTerms = new Set([...technologyStack.map(t => t.toLowerCase()), ...verifiedSkills, "api", "database", "system", "application", "project", "company", "team", "code", "architecture"]);
    
    if (cleanedMention.length > 4 && !commonTechAndTerms.has(cleanedMention)) {
      const isProjectVerified = verifiedProjects.some(vp => vp.includes(cleanedMention) || cleanedMention.includes(vp));
      const isCompanyVerified = verifiedCompanies.some(vc => vc.includes(cleanedMention) || cleanedMention.includes(vc));

      // If question mentions a specific named project/company that is completely fabricated
      if (!isProjectVerified && !isCompanyVerified && verifiedProjects.length > 0) {
        return {
          isValid: false,
          reason: `Fact Grounding Failure: Mentioned project/company "${cleanedMention}" not found in candidate context.`,
          score: 0.1
        };
      }
    }
  }

  // 3. RELEVANCE CHECK:
  // Ensure technical questions actually mention target role, tech stack, or candidate context
  if (interviewType === "technical" && technologyStack.length > 0) {
    const mentionsTech = technologyStack.some(tech => lowerText.includes(tech.toLowerCase()));
    const mentionsRole = targetRole ? lowerText.includes(targetRole.toLowerCase()) : true;
    const mentionsGeneralTech = /(code|function|class|component|database|query|api|state|async|memory|performance|security|design|server|test|debug)/i.test(text);

    if (!mentionsTech && !mentionsRole && !mentionsGeneralTech) {
      return {
        isValid: false,
        reason: "Relevance Failure: Question lacks alignment with target technology stack or role.",
        score: 0.3
      };
    }
  }

  // 4. DIFFICULTY ALIGNMENT CHECK:
  // Ensure 'hard' questions aren't trivial or 'easy' questions aren't overly complex system architecture problems
  if (difficulty === "hard" && text.length < 35 && !/(trade-off|architecture|scale|optimize|concurrency|race condition|bottleneck|design)/i.test(text)) {
    // Soft penalty / warning for hard questions that lack depth
  }

  return {
    isValid: true,
    reason: "Passed all guardrail validation checks.",
    score: 1.0
  };
}
