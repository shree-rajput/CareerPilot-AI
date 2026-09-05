import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeAiTask } from "../src/services/ai/orchestrator.js";
import { validateEvidence } from "../src/services/ai/evidenceValidator.js";

describe("AI Orchestrator Pipeline", () => {
  it("should successfully execute an AI task placeholder", async () => {
    assert.equal(true, true);
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
    assert.equal(validated.classification, "strong");
    assert.equal(validated.resumeEvidence, "built scalable APIs with Node.js");
  });

  it("should downgrade to missing if evidence is hallucinated", () => {
    const evidenceData = {
      classification: "strong",
      resumeEvidence: "developed microservices with AWS Lambda" // Hallucinated
    };

    const validated = validateEvidence(evidenceData, sourceContext);
    assert.equal(validated.classification, "missing");
    assert.equal(validated.resumeEvidence, "");
    assert.equal(validated._hallucinationDetected, true);
  });
});

