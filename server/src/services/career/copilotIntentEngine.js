/**
 * Copilot Intent & Relevance Filter Engine
 * 
 * Provides:
 * 1. Lightweight intent classification across 15 categories.
 * 2. Mapping of intents to specific AI Copilot modes.
 * 3. Relevance filtering to send ONLY data pertinent to the current query intent.
 * 4. Topic change detection & conversation history pruning.
 * 5. Post-generation response relevance validation.
 */

export function classifyIntent(query, history = []) {
  const q = String(query || "").trim().toLowerCase();
  
  if (!q) return "clarification";

  // Check for ambiguous, vague queries
  if (/^(how do i improve this\??|what should i do\??|why\??|help me\??|improve this\??)$/i.test(q)) {
    // If there is context in previous turns, it might not be ambiguous
    if (!history || history.length === 0) {
      return "clarification";
    }
  }

  // 1. Coding & Technical Concept queries
  if (
    /closure|event bubbling|event loop|hoisting|promise|async\/await|prototype|reconciliation|virtual dom|state management|mongodb|indexing|sql join|binary tree|recursion|b-tree|rest api|graphql|jwt|oauth|cors|useeffect|usememo|usecallback|garbage collection|deadlock|concurrency/i.test(q) ||
    /explain|what is|how does|syntax|code snippet|write a function|difference between/i.test(q) && !/resume|cv|application|interview score|job/i.test(q)
  ) {
    return "coding";
  }

  // 2. Resume & ATS queries
  if (/resume|cv|ats|bullet|format|structure|gap in|work experience description|file version/i.test(q)) {
    return "resume";
  }

  // 3. Job Matching & Suitability
  if (/match score|why is my score|why is my match|suitable|fit for|jd match|job requirement/i.test(q)) {
    return "job_matching";
  }

  // 4. Job Search & Companies
  if (/find job|search job|openings|vacancies|target companies|which company|job market/i.test(q)) {
    return "job_search";
  }

  // 5. Applications & Tracking
  if (/applied|applications|application status|which companies have i applied|interview round|applied to/i.test(q)) {
    return "application";
  }

  // 6. Interview Preparation & Mock Evaluation
  if (/interview|mock|prepare for.*interview|interview question|interview score|missed concept|weakness in interview/i.test(q)) {
    return "interview";
  }

  // 7. Projects & Portfolio
  if (/project|portfolio|github|build|codebase|architecture|tech stack|reality check/i.test(q)) {
    return "project";
  }

  // 8. Skill Gaps & Weaknesses
  if (/skill gap|weak skill|weakest skill|strongest skill|what skill|tech stack gap/i.test(q)) {
    return "skills";
  }

  // 9. Learning & Roadmap
  if (/padhu|padhna|study|learn|course|resource|roadmap|today's task|checklist/i.test(q)) {
    return "learning";
  }

  // 10. Cover Letter
  if (/cover letter|letter of interest|application letter/i.test(q)) {
    return "cover_letter";
  }

  // 11. Outreach & Networking
  if (/outreach|cold email|recruiter message|linkedin message|follow-up message/i.test(q)) {
    return "outreach";
  }

  // 12. Dashboard & Overall Readiness
  if (/readiness|overall score|my progress|dashboard|readiness score/i.test(q)) {
    return "dashboard";
  }

  // 13. General Career Advice
  if (/career|placement|salary|negotiation|deadline|transition|strategy/i.test(q)) {
    return "career_advice";
  }

  // Default to general conceptual or career advice
  return "general";
}

export function mapIntentToMode(intent) {
  switch (intent) {
    case "coding":
      return "COPILOT_CODING";
    case "resume":
      return "COPILOT_RESUME";
    case "job_matching":
      return "COPILOT_JOB_MATCH";
    case "interview":
      return "COPILOT_INTERVIEW";
    case "application":
    case "outreach":
    case "cover_letter":
      return "COPILOT_APPLICATION";
    case "project":
      return "COPILOT_PROJECT";
    case "skills":
    case "learning":
    case "job_search":
    case "dashboard":
    case "career_advice":
    case "clarification":
      return "COPILOT_CAREER";
    case "general":
    default:
      return "COPILOT_GENERAL";
  }
}

/**
 * Filter context data strictly based on the user's intent.
 * Pure coding or general conceptual questions get NO heavy profile/resume bloat.
 */
export function buildFilteredContext(rawContext, intent) {
  if (!rawContext) return {};

  const {
    careerProfile = {},
    resumeIntelligence = null,
    skillGaps = [],
    applications = [],
    interviewIntelligence = {},
    preparationIntelligence = null,
    nextBestActions = []
  } = rawContext;

  // 1. Coding & General conceptual questions -> Minimal profile background, no resume/application bloat
  if (intent === "coding" || intent === "general") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || []
      }
    };
  }

  // 2. Resume questions -> Include resume intelligence, omit applications & interview history
  if (intent === "resume") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || [],
        experienceLevel: careerProfile.experienceLevel || "student"
      },
      resumeIntelligence: resumeIntelligence ? {
        fileName: resumeIntelligence.fileName,
        atsScore: resumeIntelligence.atsScore,
        contentScore: resumeIntelligence.contentScore,
        missingSkills: resumeIntelligence.missingSkills,
        skills: resumeIntelligence.skills?.slice(0, 15),
        projects: resumeIntelligence.projects?.map(p => ({
          name: p.name,
          description: p.description,
          technologies: p.technologies
        })),
        experience: resumeIntelligence.experience
      } : null
    };
  }

  // 3. Job Matching -> Include active applications, match scores, resume skills/missing skills
  if (intent === "job_matching") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || [],
        targetCompanies: careerProfile.targetCompanies || []
      },
      resumeSkills: resumeIntelligence?.skills || [],
      applications: applications.map(a => ({
        company: a.company,
        role: a.role,
        status: a.status,
        matchScore: a.matchScore,
        matchedSkills: a.matchedSkills,
        missingSkills: a.missingSkills
      }))
    };
  }

  // 4. Interview questions -> Include interview performance intelligence, weak concepts
  if (intent === "interview") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || [],
        experienceLevel: careerProfile.experienceLevel || "student"
      },
      interviewIntelligence: {
        totalSessions: interviewIntelligence.totalSessions || 0,
        weaknesses: (interviewIntelligence.weaknesses || []).map(w => ({
          category: w.category,
          question: w.question,
          accuracyScore: w.accuracyScore,
          feedback: w.feedback,
          missedConcepts: w.missedConcepts
        }))
      }
    };
  }

  // 5. Project questions -> Include project portfolio details
  if (intent === "project") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || []
      },
      projects: resumeIntelligence?.projects || []
    };
  }

  // 6. Application / Outreach -> Include application history & statuses
  if (intent === "application" || intent === "outreach" || intent === "cover_letter" || intent === "job_search") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || [],
        targetCompanies: careerProfile.targetCompanies || []
      },
      applications: applications.map(a => ({
        company: a.company,
        role: a.role,
        status: a.status,
        appliedAt: a.appliedAt
      }))
    };
  }

  // 7. Skills & Learning -> Include skill gaps and preparation tasks
  if (intent === "skills" || intent === "learning") {
    return {
      candidateProfile: {
        name: careerProfile.name || "Candidate",
        targetRoles: careerProfile.targetRoles || []
      },
      skillGaps: skillGaps.slice(0, 5),
      preparationIntelligence
    };
  }

  // 8. Career advice / Dashboard / Clarification -> Balanced subset
  return {
    candidateProfile: {
      name: careerProfile.name || "Candidate",
      experienceLevel: careerProfile.experienceLevel || "student",
      targetRoles: careerProfile.targetRoles || [],
      overallReadinessScore: careerProfile.overallReadinessScore || 0
    },
    weakestAreas: careerProfile.weakestAreas || [],
    nextBestActions: nextBestActions.slice(0, 2)
  };
}

/**
 * Filter conversation history based on topic shifts.
 * Prevents old topics from dominating new, unrelated queries.
 */
export function filterRelevantHistory(history = [], currentIntent) {
  if (!Array.isArray(history) || history.length === 0) return [];

  // Truncate message text aggressively to prevent LLM token / Request Entity Too Large overhead
  const formatted = history.slice(-2).map(m => ({
    role: m.role,
    content: (m.content || "").length > 150 ? (m.content || "").substring(0, 150) + "..." : (m.content || "")
  }));

  // If switching to coding or general intent from another topic, isolate history completely
  if (currentIntent === "coding" || currentIntent === "general") {
    const lastUserTurn = formatted.filter(m => m.role === "user").pop();
    if (lastUserTurn && /closure|event|mongodb|react|code|function/i.test(lastUserTurn.content)) {
      return formatted.slice(-2);
    }
    return []; // Completely isolate history if starting a new coding topic
  }

  return formatted;
}

/**
 * Validates generated AI response for relevance and grounding.
 */
export function validateResponseRelevance(responsePayload, query, intent, contextData) {
  if (!responsePayload || typeof responsePayload !== "object") {
    return { isValid: false, reason: "Response payload is null or non-object" };
  }

  const reply = String(responsePayload.reply || "").trim();
  if (!reply || reply.length < 10) {
    return { isValid: false, reason: "Response reply is empty or too short" };
  }

  const lowerReply = reply.toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();

  // Rule 1: For coding or general technical questions, reject forced profile mentions
  if (intent === "coding" || intent === "general") {
    const forcedProfileTerms = [
      "your resume has a gap",
      "your ats score",
      "your target company",
      "your match score",
      "your application health"
    ];

    const hasForcedTerm = forcedProfileTerms.some(term => lowerReply.includes(term));
    const queryAskedAboutProfile = /resume|ats|score|gap|application/i.test(lowerQuery);

    if (hasForcedTerm && !queryAskedAboutProfile) {
      return {
        isValid: false,
        reason: "Response forced irrelevant profile/resume details into a pure coding/technical question."
      };
    }
  }

  // Rule 2: Non-hallucination for applications query
  if (intent === "application" || /companies have i applied|my applications/i.test(lowerQuery)) {
    const apps = contextData?.applications || [];
    if (apps.length === 0) {
      // Must clearly state no applications exist rather than inventing company names
      if (!/don't have|no application|no record|haven't applied/i.test(lowerReply)) {
        return {
          isValid: false,
          reason: "Response failed non-hallucination check when candidate has 0 application records."
        };
      }
    }
  }

  // Rule 3: Ambiguous questions must ask for clarification
  if (intent === "clarification") {
    if (!/\?|clarify|specify|what would you like/i.test(lowerReply)) {
      return {
        isValid: false,
        reason: "Response failed to ask clarification for an ambiguous question."
      };
    }
  }

  return { isValid: true };
}
