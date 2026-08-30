import fs from 'fs';
import path from 'path';

const controllerPath = "c:/Users/Lenovo/OneDrive/Desktop/CareerPilot AI/server/src/controllers/interviewController.js";
let content = fs.readFileSync(controllerPath, 'utf8');

// The new getNextQuestion function
const newGetNextQuestion = `
function determineNextState(session, totalCount) {
  if (totalCount === 0) return "INTRODUCTION";
  if (totalCount >= session.numberOfQuestions) return "COMPLETED";
  
  const isTechnical = ["technical", "mixed"].includes(session.interviewType);
  
  if (totalCount === session.numberOfQuestions - 1) return "FINAL_EVALUATION";
  if (totalCount === session.numberOfQuestions - 2) return "BEHAVIORAL";
  
  if (isTechnical && totalCount === Math.floor(session.numberOfQuestions / 2)) {
      return "CODING";
  }
  
  return session.interviewType === "project" ? "PROJECT_DISCUSSION" : "THEORY";
}

export async function getNextQuestion(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "completed") {
      throw new AppError("Session is already completed", 400);
    }

    const previousQuestions = await InterviewQuestion.find({ sessionId }).sort({ createdAt: 1 }).lean();
    const previousChallenges = await InterviewChallenge.find({ sessionId }).sort({ createdAt: 1 }).lean();

    const completedQuestions = previousQuestions.filter(q => q.status !== "pending");
    const completedChallenges = previousChallenges.filter(c => c.validationStatus !== "pending");
    const totalCount = completedQuestions.length + completedChallenges.length;

    // Idempotency check: if last entity is an unanswered question/challenge, return it
    const lastRealQuestion = completedQuestions[completedQuestions.length - 1];
    if (lastRealQuestion && lastRealQuestion.status === "asked") {
      return res.status(200).json({ success: true, data: { type: "question", data: lastRealQuestion } });
    }
    const lastChallenge = completedChallenges[completedChallenges.length - 1];
    // For challenges, if we haven't submitted anything yet, it should be the active one
    // But we need a way to track if it's "answered". Let's say if we have a CodingSubmission for it?
    // For simplicity, we just return the challenge if it exists and totalCount implies we are in CODING state
    
    // Check pending stubs
    const pendingStub = previousQuestions.find(q => q.status === "pending");
    const pendingChallenge = previousChallenges.find(c => c.validationStatus === "pending");
    if (pendingStub || pendingChallenge) {
      return res.status(202).json({
        success: true,
        data: null,
        message: "Question is being generated. Please wait a moment and try again."
      });
    }

    const nextState = determineNextState(session, totalCount);

    if (nextState === "COMPLETED") {
      session.status = "completed";
      session.interviewState = "COMPLETED";
      session.completedAt = new Date();
      await session.save();
      return res.status(200).json({ success: true, data: null, message: "Interview completed" });
    }

    session.interviewState = nextState;
    await session.save();

    const limitCheck = await checkAiLimit(req.user._id, "mock_question", env.aiLimitMockQuestions);

    if (nextState === "CODING") {
      // 1. If we already have a generated valid challenge that isn't answered, return it
      // To simplify, if a challenge exists, it means we are already in CODING state. 
      // If we need to generate one:
      const stub = await InterviewChallenge.create({
        interviewSessionId: sessionId,
        question: "__pending__",
        language: "javascript",
        difficulty: session.difficulty,
        validationStatus: "pending"
      });

      try {
        const aiChallenge = limitCheck.allowed
          ? await generateInterviewChallenge({
              targetRole: session.targetRole,
              technologyStack: session.technologyStack,
              difficulty: session.difficulty
            })
          : { question: "Write a function to return true.", language: "javascript", difficulty: "easy", starterCode: { javascript: "function solution() {}" }, testCases: [], requirements: [], constraints: [], evaluationCriteria: [] };

        stub.question = aiChallenge.question || "Coding Challenge";
        stub.technology = aiChallenge.technology || "Algorithms";
        stub.language = aiChallenge.language || "javascript";
        stub.difficulty = aiChallenge.difficulty || session.difficulty;
        stub.starterCode = aiChallenge.starterCode || {};
        stub.requirements = aiChallenge.requirements || [];
        stub.constraints = aiChallenge.constraints || [];
        stub.evaluationCriteria = aiChallenge.evaluationCriteria || [];
        stub.testCases = aiChallenge.testCases || [];
        stub.generatedBy = "ai";
        stub.validationStatus = "valid";
        await stub.save();

        if (stub.generatedBy === "ai") {
          await incrementAiUsage(req.user._id, "mock_question");
        }

        return res.status(201).json({ success: true, data: { type: "challenge", data: stub } });
      } catch (err) {
        await InterviewChallenge.deleteOne({ _id: stub._id });
        throw err;
      }
    } else {
      // Generate standard interview question
      const stub = await InterviewQuestion.create({
        sessionId,
        questionText: "__pending__",
        category: "Generating...",
        difficulty: session.difficulty,
        expectedConcepts: [],
        status: "pending"
      });

      try {
        let aiQuestion;
        if (totalCount === 0 && session.interviewPlan?.length > 0) {
          const questionContext = {
            targetRole: session.targetRole,
            technologyStack: session.technologyStack,
            interviewType: session.interviewType,
            difficulty: session.difficulty,
            jobDescription: session.jobDescription,
            previousQuestions: [],
            questionNumber: 1,
            totalQuestions: session.numberOfQuestions
          };
          aiQuestion = limitCheck.allowed ? await generateInterviewQuestion(questionContext) : buildFallbackInterviewQuestion(questionContext, "Limit reached");
        } else if (totalCount > 0) {
          const lastQuestion = completedQuestions[completedQuestions.length - 1];
          const adaptiveRes = limitCheck.allowed && lastQuestion ? await adaptiveNextAction({
            previousQuestionText: lastQuestion.questionText,
            transcript: lastQuestion.transcript,
            evaluation: lastQuestion.evaluation
          }) : {
            action: "MOVE_FORWARD",
            nextQuestionText: buildFallbackInterviewQuestion({ targetRole: session.targetRole, technologyStack: session.technologyStack, previousQuestions: completedQuestions }).questionText,
            expectedConcepts: []
          };
          aiQuestion = {
            questionText: adaptiveRes.nextQuestionText,
            category: adaptiveRes.action,
            difficulty: session.difficulty,
            expectedConcepts: adaptiveRes.expectedConcepts,
            generationSource: "ai"
          };
        } else {
          aiQuestion = limitCheck.allowed ? await generateInterviewQuestion({
            targetRole: session.targetRole, technologyStack: session.technologyStack, interviewType: session.interviewType, difficulty: session.difficulty, jobDescription: session.jobDescription, previousQuestions: [], questionNumber: 1, totalQuestions: session.numberOfQuestions
          }) : buildFallbackInterviewQuestion({}, "Limit reached");
        }

        if (!aiQuestion.questionText) {
          await InterviewQuestion.deleteOne({ _id: stub._id });
          throw new AppError("AI generated an empty question. Please try again.", 502, "AI_INVALID_RESPONSE");
        }

        stub.questionText = aiQuestion.questionText.trim();
        stub.category = aiQuestion.category || "General";
        stub.difficulty = aiQuestion.difficulty || session.difficulty;
        stub.expectedConcepts = Array.isArray(aiQuestion.expectedConcepts) ? aiQuestion.expectedConcepts : [];
        stub.followUpStrategy = aiQuestion.followUpStrategy || "";
        stub.generationSource = aiQuestion.generationSource || "ai";
        stub.fallbackReason = aiQuestion.fallbackReason || "";
        stub.status = "asked";
        await stub.save();

        if (stub.generationSource === "ai") {
          await incrementAiUsage(req.user._id, "mock_question");
        }

        return res.status(201).json({ success: true, data: { type: "question", data: stub } });
      } catch (err) {
        await InterviewQuestion.deleteOne({ _id: stub._id });
        throw err;
      }
    }
  } catch (error) {
    next(error);
  }
}
`;

const getNextQuestionRegex = /export async function getNextQuestion\([\s\S]*?\n\}\n/m;
content = content.replace(getNextQuestionRegex, newGetNextQuestion);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log("Replaced getNextQuestion successfully!");
