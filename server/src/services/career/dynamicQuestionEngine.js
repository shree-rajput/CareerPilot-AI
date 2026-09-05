import { executeAiTask } from "../ai/orchestrator.js";
import { executeCode } from "../codeExecution/executionService.js";
import { User } from "../../models/User.js";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import TechnicalScenarioBank from "../../models/TechnicalScenarioBank.js";
import crypto from "node:crypto";

const MAX_RETRIES = 3;

/**
 * Normalizes title for fingerprint comparison.
 */
function computeFingerprint(title = "") {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Ensures starter code has stubs for supported languages.
 */
function normalizeStarterCode(starterCode = {}, functionName = "solution", params = [], returnType = "AUTO") {
  const paramNames = Array.isArray(params) ? params.map((p) => p.name || p).join(", ") : "";

  const jsDefault = `function ${functionName}(${paramNames}) {\n  // Write your code here\n}\n`;
  const pyDefault = `def ${functionName}(${paramNames}):\n    # Write your code here\n    pass\n`;
  const javaDefault = `public class Solution {\n    public Object ${functionName}(${paramNames}) {\n        // Write your code here\n        return null;\n    }\n}\n`;
  const cppDefault = `class Solution {\npublic:\n    auto ${functionName}(${paramNames}) {\n        // Write your code here\n    }\n};\n`;

  return {
    javascript: starterCode.javascript?.trim() ? starterCode.javascript : jsDefault,
    python: starterCode.python?.trim() ? starterCode.python : pyDefault,
    java: starterCode.java?.trim() ? starterCode.java : javaDefault,
    cpp: starterCode.cpp?.trim() ? starterCode.cpp : cppDefault,
  };
}

/**
 * Main Engine Entrypoint: Dynamic AI-First Question Generation with Reference Quality Gate.
 */
export async function generateDynamicInterviewQuestion(userId = null, options = {}) {
  const {
    mode = "coding",
    topic = "DSA",
    difficulty = "medium",
    language = "javascript",
    roomId = null,
    targetRole: requestedRole,
    experienceLevel: requestedExp,
    skills: requestedSkills,
    askedQuestionTitles = [],
    askedConcepts = []
  } = options;

  let candidateRole = requestedRole || "Software Engineer";
  let candidateExp = requestedExp || "fresher";
  let candidateSkills = Array.isArray(requestedSkills) ? requestedSkills : ["JavaScript", "Problem Solving"];

  // 1. Resolve User Context if userId provided
  if (userId) {
    try {
      const user = await User.findById(userId).select("targetRole experienceLevel technicalSkills skills").lean();
      if (user) {
        candidateRole = user.targetRole || candidateRole;
        candidateExp = user.experienceLevel || candidateExp;
        candidateSkills = user.technicalSkills?.length ? user.technicalSkills : (user.skills?.length ? user.skills : candidateSkills);
      }
    } catch (err) {
      console.warn(`[DynamicQuestionEngine] Failed to load user profile: ${err.message}`);
    }
  }

  // 2. Resolve Room Context if roomId provided
  let room = null;
  const roomAvoidTitles = [];
  const roomAvoidConcepts = [];

  if (roomId) {
    try {
      room = await PeerInterviewRoom.findOne({ roomId });
      if (room) {
        if (Array.isArray(room.previousQuestionTitles)) {
          roomAvoidTitles.push(...room.previousQuestionTitles);
        }
        if (Array.isArray(room.askedConceptIds)) {
          roomAvoidConcepts.push(...room.askedConceptIds);
        }
      }
    } catch (err) {
      console.warn(`[DynamicQuestionEngine] Failed to load room: ${err.message}`);
    }
  }

  const avoidQuestions = Array.from(new Set([...askedQuestionTitles, ...roomAvoidTitles]));
  const avoidConcepts = Array.from(new Set([...askedConcepts, ...roomAvoidConcepts]));

  let lastError = null;

  // 3. Retry loop with negative context updates
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[DynamicQuestionEngine] Generation attempt ${attempt}/${MAX_RETRIES} for topic "${topic}" (${difficulty})`);

      const aiResult = await executeAiTask("DYNAMIC_QUESTION_GENERATION", {
        mode,
        targetRole: candidateRole,
        experienceLevel: candidateExp,
        skills: candidateSkills,
        topic,
        difficulty,
        language,
        avoidQuestions,
        avoidConcepts
      });

      if (!aiResult || !aiResult.title || !aiResult.openingPrompt) {
        throw new Error("AI returned an incomplete question structure");
      }

      // Check anti-repetition title/fingerprint check
      const genFingerprint = computeFingerprint(aiResult.title);
      const isDuplicateTitle = avoidQuestions.some((qTitle) => computeFingerprint(qTitle) === genFingerprint);
      if (isDuplicateTitle) {
        console.warn(`[DynamicQuestionEngine] Attempt ${attempt} generated duplicate question title: "${aiResult.title}". Retrying...`);
        avoidQuestions.push(aiResult.title);
        continue;
      }

      // Quality Gate: Validate Reference Solution Execution for Coding Questions
      const isCodingType = mode === "coding" || aiResult.questionType === "coding" || (aiResult.testCases && aiResult.testCases.length > 0);
      if (isCodingType && aiResult.referenceSolution && aiResult.testCases?.length > 0) {
        const refLang = aiResult.referenceSolution[language] ? language : (aiResult.referenceSolution.javascript ? "javascript" : "python");
        const refCode = aiResult.referenceSolution[refLang];

        if (refCode) {
          console.log(`[DynamicQuestionEngine] Running Reference Solution Quality Gate in ${refLang}...`);

          const execContract = aiResult.execution || {
            mode: "FUNCTION",
            functionName: "solution",
            parameters: [],
            returnType: "AUTO"
          };

          const evalResult = await executeCode({
            language: refLang,
            code: refCode,
            testCases: aiResult.testCases,
            executionContract: execContract
          });

          if (!evalResult.allPassed) {
            console.warn(`[DynamicQuestionEngine] Reference solution failed execution gate (${evalResult.passedTests}/${evalResult.totalTests} passed). Retrying...`);
            avoidQuestions.push(aiResult.title + " (Reference solution failed execution)");
            continue;
          }

          console.log(`[DynamicQuestionEngine] Reference solution execution gate PASSED! (${evalResult.passedTests}/${evalResult.totalTests} test cases clean)`);
        }
      }

      // Question is valid & passed quality gate! Construct canonical normalized question
      const questionId = `dyn_q_${crypto.randomUUID().slice(0, 8)}`;
      const executionContract = aiResult.execution || {
        mode: "FUNCTION",
        type: "function",
        functionName: "solution",
        parameters: [],
        returnType: "AUTO"
      };

      const normalizedStarterCode = normalizeStarterCode(
        aiResult.starterCode,
        executionContract.functionName,
        executionContract.parameters,
        executionContract.returnType
      );

      const canonicalQuestion = {
        id: questionId,
        questionId,
        _id: questionId,
        title: aiResult.title,
        openingPrompt: aiResult.openingPrompt,
        description: aiResult.openingPrompt,
        mode: aiResult.mode || mode,
        questionType: aiResult.questionType || "coding",
        category: aiResult.topic || topic,
        topic: aiResult.topic || topic,
        subtopic: aiResult.subtopic || "",
        difficulty: aiResult.difficulty || difficulty,
        experienceLevel: aiResult.experienceLevel || candidateExp,
        concepts: Array.isArray(aiResult.concepts) ? aiResult.concepts : [],
        expectedConcepts: Array.isArray(aiResult.concepts) ? aiResult.concepts : [],
        expectedSkills: Array.isArray(aiResult.expectedSkills) ? aiResult.expectedSkills : candidateSkills,
        supportedLanguages: Array.isArray(aiResult.supportedLanguages) ? aiResult.supportedLanguages : ["javascript", "python", "java", "cpp"],
        defaultLanguage: language,
        starterCode: normalizedStarterCode,
        execution: executionContract,
        testCases: Array.isArray(aiResult.testCases) ? aiResult.testCases : [],
        referenceSolution: aiResult.referenceSolution || {},
        constraints: Array.isArray(aiResult.constraints) ? aiResult.constraints : [],
        guidedFollowUps: Array.isArray(aiResult.guidedFollowUps) ? aiResult.guidedFollowUps : [],
        evaluationCriteria: Array.isArray(aiResult.evaluationCriteria) ? aiResult.evaluationCriteria : [],
        aiGenerated: true,
        aiProvenance: {
          model: "GROQ AI",
          generatedAt: new Date().toISOString(),
          attempt
        }
      };

      // Persist to MongoDB TechnicalScenarioBank in background for audit trail
      TechnicalScenarioBank.create({
        scenarioId: questionId,
        title: canonicalQuestion.title,
        category: canonicalQuestion.mode === "coding" ? "coding" : "interview_prep",
        subtopic: canonicalQuestion.subtopic || canonicalQuestion.topic,
        difficulty: canonicalQuestion.difficulty,
        experienceLevel: canonicalQuestion.experienceLevel === "fresher" ? "fresher" : "junior",
        targetRoles: [candidateRole],
        openingPrompt: canonicalQuestion.openingPrompt,
        guidedFollowUps: canonicalQuestion.guidedFollowUps,
        expectedConcepts: canonicalQuestion.concepts,
        starterCode: canonicalQuestion.starterCode,
        sourceReference: `AI Generated (Attempt ${attempt})`
      }).catch((e) => console.warn(`[DynamicQuestionEngine] Non-critical persistence warning: ${e.message}`));

      // Update room history if roomId provided
      if (room) {
        room.askedQuestionIds.addToSet(questionId);
        room.askedConceptIds.addToSet(...canonicalQuestion.concepts);
        room.previousQuestionIds.addToSet(questionId);
        room.previousQuestionTitles.addToSet(canonicalQuestion.title);
        room.recentQuestionFingerprints.addToSet(genFingerprint);
        await room.save().catch((e) => console.warn(`[DynamicQuestionEngine] Non-critical room save warning: ${e.message}`));
      }

      return {
        success: true,
        question: canonicalQuestion
      };

    } catch (err) {
      console.warn(`[DynamicQuestionEngine] Attempt ${attempt} failed with error: ${err.message}`);
      lastError = err.message;
    }
  }

  // All retries failed
  return {
    success: false,
    code: "QUESTION_GENERATION_FAILED",
    error: lastError || "Failed to generate a valid question meeting quality standards after 3 retries."
  };
}
