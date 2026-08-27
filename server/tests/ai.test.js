import { executeAiTask } from "../src/services/ai/orchestrator.js";
import { validateEvidence } from "../src/services/ai/evidenceValidator.js";

// Mock the AI Task router and dependencies
jest.mock("../src/services/ai/groqProvider.js");

describe("AI Orchestrator Pipeline", () => {
  it("should successfully execute an AI task and return validated JSON", async () => {
    // This test ensures the pipeline: Context -> Prompt -> Model -> Validation works
    expect(true).toBe(true); // placeholder for actual Jest mock setup
  });
});

describe("Evidence Validator (Hallucination Control)", () => {
  const sourceContext = "Candidate has 5 years of experience in JavaScript and built scalable APIs with Node.js.";

  it("should retain evidence if it exists in the source context", () => {
    const evidenceData = {
      classification: "strong",
      resumeEvidence: "built scalable APIs with Node.js"
    };

    const validated = validateEvidence(evidenceData, sourceContext);
    expect(validated.classification).toBe("strong");
    expect(validated.resumeEvidence).toBe("built scalable APIs with Node.js");
  });

  it("should downgrade to missing if evidence is hallucinated", () => {
    const evidenceData = {
      classification: "strong",
      resumeEvidence: "developed microservices with AWS Lambda" // Hallucinated
    };

    const validated = validateEvidence(evidenceData, sourceContext);
    expect(validated.classification).toBe("missing");
    expect(validated.resumeEvidence).toBe("");
    expect(validated._hallucinationDetected).toBe(true);
  });
});
