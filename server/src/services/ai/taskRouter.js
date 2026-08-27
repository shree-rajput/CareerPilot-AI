import { MODEL_ROLES } from "./modelRouter.js";
import { jdStructureSchema } from "./schemas/jdSchema.js";
import { resumeStructureSchema } from "./schemas/resumeSchema.js";
import { tailoringSchema } from "./schemas/tailoringSchema.js";
import { interviewQuestionSchema, interviewEvaluationSchema, interviewPlanSchema, copilotSuggestionSchema, codeReviewSchema } from "./schemas/interviewSchema.js";
import { projectKitSchema, prepPlanSchema, copilotChatSchema } from "./schemas/careerSchema.js";
import { JD_EXTRACTION_SYSTEM, buildJdExtractionPrompt } from "./prompts/jdExtraction.js";
import { RESUME_STRUCTURE_SYSTEM, buildResumeStructurePrompt } from "./prompts/resumeStructure.js";
import { TAILORING_SYSTEM, buildTailoringPrompt } from "./prompts/resumeTailoring.js";
import { generateQuestionPrompt, evaluateAnswerPrompt, generateInterviewPlanPrompt, generateCopilotPrompt, analyzeCodePrompt } from "./prompts/interviewPrompts.js";
import { GENERATE_PROJECT_KIT_SYSTEM, buildProjectKitPrompt, GENERATE_PREP_PLAN_SYSTEM, buildPrepPlanPrompt, COPILOT_CHAT_SYSTEM, buildCopilotChatPrompt } from "./prompts/careerPrompts.js";

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
    schema: interviewEvaluationSchema,
    buildContext: buildInterviewEvaluationContext,
    jsonMode: true
  },
  GENERATE_INTERVIEW_QUESTION: {
    featureName: "interview question generation",
    modelRole: MODEL_ROLES.GENERAL_REASONING,
    systemPrompt: "You are an expert technical interviewer conducting a mock interview. Return only valid JSON.",
    buildPrompt: generateQuestionPrompt,
    schema: interviewQuestionSchema,
    buildContext: buildInterviewQuestionContext,
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
    modelRole: MODEL_ROLES.FAST_EXTRACTION,
    systemPrompt: COPILOT_CHAT_SYSTEM,
    buildPrompt: (context) => buildCopilotChatPrompt(context),
    schema: copilotChatSchema,
    buildContext: buildCopilotChatContext,
    jsonMode: true
  }
};
