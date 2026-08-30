import fs from 'fs';

const controllerPath = "c:/Users/Lenovo/OneDrive/Desktop/CareerPilot AI/server/src/controllers/interviewController.js";
let content = fs.readFileSync(controllerPath, 'utf8');

const submitCodingAnswerCode = `
import { executeCode } from "../services/codeExecution/executionService.js";

// Submit an answer for a coding challenge
export async function submitCodingAnswer(req, res, next) {
  try {
    const { questionId } = req.params;
    const { language, code } = req.body;

    const challenge = await InterviewChallenge.findById(questionId).populate("interviewSessionId");
    if (!challenge || challenge.interviewSessionId.userId.toString() !== req.user._id.toString()) {
      throw new AppError("Challenge not found", 404);
    }

    // Execute code
    const executionResult = await executeCode({
      language,
      code,
      testCases: challenge.testCases || []
    });

    const totalTests = challenge.testCases?.length || 0;
    const allPassed = executionResult.passedTests === totalTests;

    // AI Review
    let aiReview = null;
    try {
      const reviewResult = await evaluateCodingChallenge({
        questionTitle: challenge.question,
        questionDescription: challenge.description || challenge.question,
        language,
        code,
        testResults: \`Passed \${executionResult.passedTests} of \${totalTests} test cases. Details: \${JSON.stringify(executionResult.results)}\`
      });
      aiReview = reviewResult;
    } catch (aiError) {
      console.warn("AI Review failed:", aiError);
    }

    // Mark challenge as answered
    challenge.validationStatus = "valid"; // Actually, we should probably add a status like 'answered' 
    // Or we just rely on CodingSubmission to mark it answered
    await challenge.save();
    
    // We can also save a CodingSubmission here to track the attempt
    // For now, we return the result so the frontend knows it was evaluated

    res.status(200).json({
      success: true,
      data: {
        passedTests: executionResult.passedTests,
        totalTests: totalTests,
        results: executionResult.results,
        aiReview
      }
    });
  } catch (error) {
    next(error);
  }
}
`;

// Append it to the file if it doesn't already exist
if (!content.includes("submitCodingAnswer")) {
  fs.appendFileSync(controllerPath, submitCodingAnswerCode, 'utf8');
  console.log("Appended submitCodingAnswer successfully!");
} else {
  console.log("submitCodingAnswer already exists.");
}
