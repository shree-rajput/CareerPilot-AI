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
  interviewType = "mixed",
  candidateExperience = "fresher"
}) {
  if (!questionText || typeof questionText !== "string" || questionText.trim().length < 15) {
    return { isValid: false, reason: "Question text is empty or too short.", score: 0 };
  }

  const text = questionText.trim();
  const lowerText = text.toLowerCase();

  // 1. STRICT LENGTH & CONCISE SINGLE-QUESTION GUARDRAIL:
  // Rejects multi-part assignment dumps and wall-of-text questions (> 45 words or > 3 sentences)
  const words = text.split(/\s+/).length;
  if (words > 45) {
    return {
      isValid: false,
      reason: `Question is too long (${words} words, max allowed 45 words). Questions must be short and focused.`,
      score: 0
    };
  }

  // Count sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    return {
      isValid: false,
      reason: `Question contains too many sentences (${sentences.length}, max allowed 3 sentences). Must ask ONE focused question.`,
      score: 0
    };
  }

  // 2. MULTI-PART ASSIGNMENT DETECTOR:
  // Rejects questions asking the candidate to cover a long list of requirements in one turn
  const multiPartSignals = [
    "describe query parameters, validation",
    "describe query parameters",
    "explain implementation logic, error handling",
    "explain error handling, frontend",
    "client-side caching, server-side",
    "along with loading",
    "as well as error handling and caching",
    "and describe how you would implement, validate, test",
    "covering pagination, sorting, filtering",
    "including loading, error, empty states",
    "describe the backend, frontend, database, and caching"
  ];
  for (const signal of multiPartSignals) {
    if (lowerText.includes(signal)) {
      return {
        isValid: false,
        reason: `Multi-part assignment question detected ("${signal}"). Questions must test ONE primary concept at a time.`,
        score: 0
      };
    }
  }

  // Also check if commas and 'and' create a massive list of > 3 requirement verbs
  const requirementListMatches = lowerText.match(/\b(describe|explain|detail|implement|handle|optimize|validate|design|cache)\b/g) || [];
  if (requirementListMatches.length >= 4) {
    return {
      isValid: false,
      reason: `Question attempts to test too many concepts at once (${requirementListMatches.length} requirement verbs).`,
      score: 0
    };
  }

  // 3. STUDENT-FIRST DIFFICULTY GUARDRAIL:
  // Rejects senior/staff-level topics unless candidate experience is senior or hard mode is explicitly selected
  const isStudentOrJunior = candidateExperience === "fresher" || candidateExperience === "junior" || difficulty === "easy";
  if (isStudentOrJunior) {
    const seniorForbiddenTopics = [
      "distributed session management",
      "multi-region failover",
      "microservice architecture at scale",
      "sharding",
      "replication lag",
      "cache invalidation across distributed",
      "distributed locking",
      "rate limiting at scale",
      "kafka cluster",
      "zero-downtime deployment",
      "eventual consistency",
      "consensus algorithm",
      "high availability failover",
      "service mesh"
    ];
    for (const forbidden of seniorForbiddenTopics) {
      if (lowerText.includes(forbidden)) {
        return {
          isValid: false,
          reason: `Student-First Difficulty Guardrail: Question contains senior-level topic "${forbidden}" inappropriate for students/juniors.`,
          score: 0
        };
      }
    }
  }

  // 4. QUALITY CHECK: Reject ultra-generic or malformed questions
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

  // 5. FACT GROUNDING CHECK (Hallucination Guardrail):
  // Inspect if the question references specific projects, companies, or accomplishments.
  const projectMentions = text.match(/(?:at|for|with|in your|built|developed|designed)\s+([A-Z][a-zA-Z0-9\s-]{2,25})/g) || [];
  
  const verifiedProjects = (candidateContext.projects || []).map(p => (typeof p === 'string' ? p : p.name || '').toLowerCase());
  const verifiedSkills = (candidateContext.skills || []).map(s => (typeof s === 'string' ? s : s.name || s.canonicalName || '').toLowerCase());
  const verifiedCompanies = (candidateContext.experience || []).map(e => (typeof e === 'string' ? e : e.company || '').toLowerCase());

  for (const mention of projectMentions) {
    const cleanedMention = mention.replace(/(?:at|for|with|in your|built|developed|designed)\s+/i, '').trim().toLowerCase();
    
    const commonTechAndTerms = new Set([...technologyStack.map(t => t.toLowerCase()), ...verifiedSkills, "api", "database", "system", "application", "project", "company", "team", "code", "architecture"]);
    
    if (cleanedMention.length > 4 && !commonTechAndTerms.has(cleanedMention)) {
      const isProjectVerified = verifiedProjects.some(vp => vp.includes(cleanedMention) || cleanedMention.includes(vp));
      const isCompanyVerified = verifiedCompanies.some(vc => vc.includes(cleanedMention) || cleanedMention.includes(vc));

      if (!isProjectVerified && !isCompanyVerified && verifiedProjects.length > 0) {
        return {
          isValid: false,
          reason: `Fact Grounding Failure: Mentioned project/company "${cleanedMention}" not found in candidate context.`,
          score: 0.1
        };
      }
    }
  }

  // 6. RELEVANCE CHECK:
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

  return {
    isValid: true,
    reason: "Passed all guardrail validation checks.",
    score: 1.0
  };
}
