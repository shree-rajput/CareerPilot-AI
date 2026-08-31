import { AI_TASKS } from "./taskRouter.js";
import { callWithRetry } from "./retryStrategy.js";
import { validateOutput, extractJson } from "./outputValidator.js";
import { validateEvidence } from "./evidenceValidator.js";
import { aiLogger } from "./observability.js";

/**
 * AI Orchestrator
 * Main entry point for all AI interactions.
 * Pipeline: Request → Task Config → Context Builder → Prompt Builder → LLM (w/ Retry) → Output Validation → Evidence Validation
 */
export async function executeAiTask(taskName, params) {
  const taskConfig = AI_TASKS[taskName];
  if (!taskConfig) {
    throw new Error(`AI Task ${taskName} is not configured in taskRouter.`);
  }

  const startTime = Date.now();
  let context = null;
  let parsedJson = null;

  try {
    // 1. Build Context (Deterministic)
    context = await taskConfig.buildContext(params);

    // 2. Build Prompt
    const userPrompt = taskConfig.buildPrompt(context);

    // 3. Define Validation Pipeline
    const validateFn = (rawOutput) => {
      // 3a. JSON extraction and Schema validation
      const parsed = extractJson(rawOutput) || rawOutput; // fallback to raw if not extractable (e.g. if LLM returned clean json object already)
      let data = validateOutput(parsed, taskConfig.schema);

      // 3b. Evidence validation (if applicable)
      // If the schema returns an array of evidence items, or has an evidence field, validate it.
      if (data && typeof data === "object") {
        if (Array.isArray(data.evidence)) {
          // Flatten context to a single string for simple substring validation
          const contextString = JSON.stringify(context);
          data.evidence = data.evidence.map(ev => validateEvidence(ev, contextString));
        }
      }
      return data;
    };

    // 4. LLM Call with Retry
    parsedJson = await callWithRetry({
      systemPrompt: taskConfig.systemPrompt,
      userPrompt,
      modelRole: taskConfig.modelRole,
      jsonMode: taskConfig.jsonMode,
      maxTokens: taskConfig.maxTokens || 1024,
      validateFn,
      featureName: taskConfig.featureName
    });

    const latencyMs = Date.now() - startTime;
    
    // 5. Observability
    aiLogger.logOperation({
      task: taskName,
      modelRole: taskConfig.modelRole,
      latencyMs,
      success: true,
      retryCount: 0, // This could be updated if retryStrategy returns it
      validationResult: "passed"
    });

    return parsedJson;

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    
    aiLogger.logOperation({
      task: taskName,
      modelRole: taskConfig.modelRole,
      latencyMs,
      success: false,
      retryCount: 0,
      validationResult: error.code || "error"
    });

    aiLogger.logError({
      task: taskName,
      error,
      category: error.code || "UNKNOWN_ERROR"
    });

    throw error;
  }
}
