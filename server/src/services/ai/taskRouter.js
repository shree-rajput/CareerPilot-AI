import { MODEL_ROLES } from "./modelRouter.js";
import { jdStructureSchema } from "./schemas/jdSchema.js";
import { resumeStructureSchema, resumeAnalysisResultSchema, inlineSuggestionSchema } from "./schemas/resumeSchema.js";
import { tailoringSchema } from "./schemas/tailoringSchema.js";
import { interviewQuestionSchema, evidenceEvaluationSchema, interviewPlanSchema, copilotSuggestionSchema, codeReviewSchema, candidateContextSchema, adaptiveActionSchema, coachingReportSchema, interviewChallengeSchema, interviewerReactionSchema, codingFollowUpSchema } from "./schemas/interviewSchema.js";
import { projectKitSchema, prepPlanSchema, copilotChatSchema, mentorExplanationSchema, mentorSummarySchema, projectRealityCheckSchema, coverLetterSchema, recruiterMessageSchema } from "./schemas/careerSchema.js";
import { JD_EXTRACTION_SYSTEM, buildJdExtractionPrompt } from "./prompts/jdExtraction.js";
import { RESUME_STRUCTURE_SYSTEM, buildResumeStructurePrompt } from "./prompts/resumeStructure.js";
import { TAILORING_SYSTEM, buildTailoringPrompt } from "./prompts/resumeTailoring.js";
import { generateQuestionPrompt, evaluateAnswerPrompt, generateInterviewPlanPrompt, generateCopilotPrompt, analyzeCodePrompt, extractCandidateContextPrompt, adaptiveActionPrompt, generateCoachingReportPrompt, generateInterviewChallengePrompt, interviewerReactionPrompt, codingFollowUpPrompt } from "./prompts/interviewPrompts.js";
import { GENERATE_PROJECT_KIT_SYSTEM, buildProjectKitPrompt, GENERATE_PREP_PLAN_SYSTEM, buildPrepPlanPrompt, COPILOT_CHAT_SYSTEM, buildCopilotChatPrompt, PROJECT_REALITY_CHECK_SYSTEM, buildRealityCheckPrompt, GENERATE_COVER_LETTER_SYSTEM, buildCoverLetterPrompt, GENERATE_RECRUITER_MESSAGE_SYSTEM, buildRecruiterMessagePrompt } from "./prompts/careerPrompts.js";


import {
  buildInterviewEvaluationContext,
  buildInterviewQuestionContext,
  buildResumeAnalysisContext,
  buildJdAnalysisContext,
  buildMatchContext,
  buildTailoringContext,
  buildPlanContext,
  buildCopilotContext,
  buildCodeContext,
  buildProjectKitContext,
  buildPrepPlanContext,
  buildCopilotChatContext
} from "./contextEngine.js";

/**
 * Task Router Configuration
 * Maps logical task names to their required prompt builders, schemas, context builders, and model roles.
 */
export const AI_TASKS = {
  EVALUATE_INTERVIEW: {
    featureName: "interview answer evaluation",
    modelRole: MODEL_ROLES.COMPLEX_REASONING,
    systemPrompt: "You are an expert technical interviewer evaluating a candidate's answer. Return only valid JSON.",
    buildPrompt: evaluateAnswerPrompt,
    schema: evidenceEvaluationSchema,
    buildContext: buildInterviewEvaluationContext,
    jsonMode: true
  },
  EXTRACT_CANDIDATE_CONTEXT: {
    featureName: "extract candidate context",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert technical interviewer preparing for an interview. Return only valid JSON.",
    buildPrompt: extractCandidateContextPrompt,
    schema: candidateContextSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  ADAPTIVE_NEXT_ACTION: {
    featureName: "adaptive next action",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert technical interviewer leading an interview. Return only valid JSON.",
    buildPrompt: adaptiveActionPrompt,
    schema: adaptiveActionSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_COACHING_REPORT: {
    featureName: "generate coaching report",
    modelRole: MODEL_ROLES.COMPLEX_REASONING,
    systemPrompt: "You are an expert career coach writing a feedback report. Return only valid JSON.",
    buildPrompt: generateCoachingReportPrompt,
    schema: coachingReportSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_INTERVIEW_QUESTION: {
    featureName: "interview question generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert technical interviewer conducting a mock interview. Return only valid JSON.",
    buildPrompt: generateQuestionPrompt,
    schema: interviewQuestionSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_INTERVIEW_CHALLENGE: {
    featureName: "interview coding challenge generation",
    modelRole: MODEL_ROLES.COMPLEX_REASONING,
    systemPrompt: "You are an expert technical interviewer creating a dynamic coding challenge for a candidate. Return only valid JSON.",
    buildPrompt: generateInterviewChallengePrompt,
    schema: interviewChallengeSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_INTERVIEWER_REACTION: {
    featureName: "interviewer reaction generation",
    modelRole: MODEL_ROLES.FAST_EXTRACTION,
    systemPrompt: "You are a professional technical interviewer reacting naturally to a candidate's answer. Return only valid JSON.",
    buildPrompt: interviewerReactionPrompt,
    schema: interviewerReactionSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_CODING_FOLLOWUP: {
    featureName: "coding follow-up generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a professional technical interviewer reviewing submitted code and generating a follow-up question. Return only valid JSON.",
    buildPrompt: codingFollowUpPrompt,
    schema: codingFollowUpSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  STRUCTURE_RESUME: {
    featureName: "resume structuring",
    modelRole: MODEL_ROLES.FAST_EXTRACTION,
    systemPrompt: RESUME_STRUCTURE_SYSTEM,
    buildPrompt: (context) => buildResumeStructurePrompt(context.rawText),
    schema: resumeStructureSchema,
    buildContext: buildResumeAnalysisContext,
    jsonMode: true
  },
  EXTRACT_JD: {
    featureName: "JD extraction",
    modelRole: MODEL_ROLES.FAST_EXTRACTION,
    systemPrompt: JD_EXTRACTION_SYSTEM,
    buildPrompt: (context) => buildJdExtractionPrompt(context.jdText),
    schema: jdStructureSchema,
    buildContext: buildJdAnalysisContext,
    jsonMode: true
  },
  EXPLAIN_MATCH_RESULT: {
    featureName: "match explanation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a career advisor explaining an AI-generated semantic match score.", // Usually from MATCH_EXPLANATION_SYSTEM
    buildPrompt: (context) => buildMatchExplanationPrompt(context),
    schema: null, // Since explainMatchResult isn't jsonMode
    buildContext: buildMatchContext,
    jsonMode: false
  },
  GENERATE_TAILORING: {
    featureName: "resume tailoring",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: TAILORING_SYSTEM,
    buildPrompt: (context) => buildTailoringPrompt(context),
    schema: tailoringSchema,
    buildContext: buildTailoringContext,
    jsonMode: true
  },
  GENERATE_INTERVIEW_PLAN: {
    featureName: "interview plan generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert technical interviewer planning a structured interview. Return only valid JSON.",
    buildPrompt: (context) => generateInterviewPlanPrompt(context),
    schema: interviewPlanSchema,
    buildContext: buildPlanContext,
    jsonMode: true
  },
  GENERATE_COPILOT: {
    featureName: "copilot suggestion",
    modelRole: MODEL_ROLES.FAST_EXTRACTION,
    systemPrompt: "You are an AI Copilot assisting a human interviewer. Return only valid JSON.",
    buildPrompt: (context) => generateCopilotPrompt(context),
    schema: copilotSuggestionSchema,
    buildContext: buildCopilotContext,
    jsonMode: true
  },
  ANALYZE_CODE: {
    featureName: "code review",
    modelRole: MODEL_ROLES.COMPLEX_REASONING,
    systemPrompt: "You are an expert code reviewer. Return only valid JSON.",
    buildPrompt: (context) => analyzeCodePrompt(context),
    schema: codeReviewSchema,
    buildContext: buildCodeContext,
    jsonMode: true
  },
  GENERATE_PROJECT_KIT: {
    featureName: "project interview kit generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: GENERATE_PROJECT_KIT_SYSTEM,
    buildPrompt: (context) => buildProjectKitPrompt(context),
    schema: projectKitSchema,
    buildContext: buildProjectKitContext,
    jsonMode: true
  },
  GENERATE_PREP_PLAN: {
    featureName: "preparation plan generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: GENERATE_PREP_PLAN_SYSTEM,
    buildPrompt: (context) => buildPrepPlanPrompt(context),
    schema: prepPlanSchema,
    buildContext: buildPrepPlanContext,
    jsonMode: true
  },
  COPILOT_CHAT: {
    featureName: "copilot chat",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: COPILOT_CHAT_SYSTEM,
    buildPrompt: (context) => buildCopilotChatPrompt(context),
    schema: copilotChatSchema,
    buildContext: buildCopilotChatContext,
    jsonMode: true
  },
  GENERATE_MENTOR_EXPLANATION: {
    featureName: "mentor explanation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a career consultant at CareerCopilot. Write a short (1-2 sentences), highly encouraging, professional explanation of why a candidate matches with a specific mentor. Address target roles, target companies, and skill gaps relative to the mentor's profile. Return JSON with the field 'explanation'. Example: {\"explanation\": \"Rahul is a perfect match because...\"}",
    buildPrompt: (context) => `Candidate Gaps: ${context.candidateGaps.join(", ")}\nCandidate Target Companies: ${context.targetCompanies.join(", ")}\nCandidate Target Roles: ${context.targetRoles.join(", ")}\nMentor Company: ${context.mentorCompany}\nMentor Role: ${context.mentorRole}\nMentor Skills: ${context.mentorSkills.join(", ")}\nMentor Bio: ${context.mentorBio}`,
    schema: mentorExplanationSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_PRE_SESSION_BRIEF: {
    featureName: "mentorship pre-session brief",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a CareerCopilot talent coordinator. Compile a structured pre-session summary for the mentor. Outline candidate background, weak areas, and project titles, and suggest focal points for the session. Focus on actionable insights, omit empty sections, and format in clean Markdown.",
    buildPrompt: (context) => `Candidate: ${context.candidateName}\nTarget Roles: ${context.targetRoles.join(", ")}\nTarget Companies: ${context.targetCompanies.join(", ")}\nTechnical Skills: ${context.technicalSkills.join(", ")}\nWeak Skills: ${context.weakSkills.join(", ")}\nProjects: ${context.projects.join(", ")}\nMock Interview Average Score: ${context.interviewScore}%\nMentor Session Topic: ${context.topic}\nMentor Session Description: ${context.description}`,
    schema: null,
    buildContext: (params) => params,
    jsonMode: false
  },
  GENERATE_POST_SESSION_SUMMARY: {
    featureName: "mentorship post-session summary",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a career development coach. Convert raw notes and feedback from a mentorship session into a professional summary (key takeaways) and a clean list of concrete, actionable task items for the candidate. Return valid JSON containing fields 'summary' (clean markdown string summarizing the session) and 'actionItems' (array of strings, each a clear TODO task). Ensure task descriptions are specific and actionable.",
    buildPrompt: (context) => `Session Topic: ${context.topic}\nMentor Feedback: ${context.mentorFeedback}\nRaw Mentor Notes: ${context.rawNotes}`,
    schema: mentorSummarySchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  ANALYZE_RESUME_AGAINST_JOB: {
    featureName: "resume job analysis",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a professional recruiting coordinator. Perform a comprehensive ATS compatibility analysis and match analysis for the given resume against the job description. Return valid JSON only.",
    buildPrompt: (context) => `Resume: ${JSON.stringify(context.resumeData)}\nJob Description: ${context.jdText}\nRequirements: ${context.jdRequirements}`,
    schema: resumeAnalysisResultSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GET_INLINE_RESUME_SUGGESTION: {
    featureName: "inline resume suggestion",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert resume writer. Improve the given resume bullet or text based on the user instructions. Keep descriptions factual, clear, and professional. Return valid JSON containing the field 'suggestion'.",
    buildPrompt: (context) => `Text to improve: "${context.text}"\nSection context: "${context.context}"\nUser instructions: "${context.instruction}"`,
    schema: inlineSuggestionSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  PROJECT_REALITY_CHECK: {
    featureName: "project reality check",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: PROJECT_REALITY_CHECK_SYSTEM,
    buildPrompt: (context) => buildRealityCheckPrompt(context),
    schema: projectRealityCheckSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_COVER_LETTER: {
    featureName: "cover letter generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: GENERATE_COVER_LETTER_SYSTEM,
    buildPrompt: (context) => buildCoverLetterPrompt(context),
    schema: coverLetterSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  GENERATE_RECRUITER_MESSAGE: {
    featureName: "recruiter message generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: GENERATE_RECRUITER_MESSAGE_SYSTEM,
    buildPrompt: (context) => buildRecruiterMessagePrompt(context),
    schema: recruiterMessageSchema,
    buildContext: (params) => params,
    jsonMode: true
  },
  SOLO_INTERVIEW_FEEDBACK: {
    featureName: "tech discussion feedback",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are a senior staff software engineer and technical facilitator. Return valid JSON.",
    buildPrompt: (context) => context.customPrompt || "Analyze code and provide technical feedback.",
    schema: null,
    buildContext: (params) => params,
    jsonMode: false
  }
};

