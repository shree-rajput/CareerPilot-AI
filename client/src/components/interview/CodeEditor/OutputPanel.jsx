import React from "react";

function formatVal(val, outputState) {
  if (outputState === "UNDEFINED_RETURN" || val === "undefined") {
    return "undefined";
  }
  if (outputState === "NULL_RETURN" || (val === null && outputState)) {
    return "null";
  }
  if (val === undefined) {
    return "undefined";
  }
  if (val === null) {
    return "null";
  }
  if (typeof val === "string") {
    return val === "" ? '""' : val;
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

export default function OutputPanel({ result, isRunning, isSubmitting }) {
  const isLoading = isRunning || isSubmitting;

  const status = result?.executionStatus || result?.status;
  const verdict = result?.verdict;

  return (
    <div className="min-h-[140px] bg-[#0B0F19] border-t border-[#2A3143]">
      <div className="flex items-center justify-between border-b border-[#2A3143] bg-[#151B2B] px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          Execution Results & Output
        </span>

        {result && <StatusBadge status={status} verdict={verdict} />}
      </div>

      <div className="max-h-[260px] overflow-auto p-4 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            {isRunning ? "Running test cases in isolated sandbox..." : "Submitting solution for evaluation..."}
          </div>
        )}

        {!isLoading && !result && (
          <p className="text-sm text-gray-500">
            Click <strong className="text-gray-300">Run</strong> to execute public test cases, or <strong className="text-gray-300">Submit</strong> for full verification.
          </p>
        )}

        {!isLoading && result && <ExecutionResult result={result} />}
      </div>
    </div>
  );
}

function ExecutionResult({ result }) {
  const errorMessage = result.compileError || result.runtimeError || result.error || result.stderr || result.result?.stderr;

  if (errorMessage && !result.results && !result.testResults) {
    return (
      <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
          {result.status || "Execution Error"}
        </p>
        <pre className="whitespace-pre-wrap text-xs text-red-300 font-mono">
          {errorMessage}
        </pre>
      </div>
    );
  }

  const testList = result.results || result.testResults || result.data?.results || [];
  
  const passed = result.passedTests ?? result.passed ?? testList.filter((item) => item.passed).length ?? 0;
  const total = result.totalTests ?? result.total ?? testList.length ?? 0;
  const runtime = result.executionTimeMs ?? result.result?.executionTimeMs;
  const stdout = result.stdout ?? result.output ?? result.result?.stdout;

  const verdictLabel = result.verdict || (passed === total && total > 0 ? "Accepted" : "Wrong Answer");

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="flex flex-wrap items-center gap-6 bg-[#151B2B] p-3 rounded-lg border border-[#2A3143]">
        <Metric 
          label="Test Cases" 
          value={`${passed} / ${total} Passed`} 
          highlight={passed === total && total > 0 ? "text-emerald-400" : "text-amber-400"}
        />

        {runtime !== undefined && (
          <Metric label="Runtime" value={`${runtime} ms`} />
        )}

        <Metric 
          label="Result Verdict" 
          value={verdictLabel} 
          highlight={verdictLabel === "Accepted" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}
        />
      </div>

      {/* Stdout if available */}
      {stdout && stdout.trim() !== "" && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Console Output (stdout)
          </p>
          <pre className="rounded-md border border-white/5 bg-black/50 p-3 text-xs text-gray-200 font-mono custom-scrollbar">
            {stdout}
          </pre>
        </div>
      )}

      {/* Errors if any */}
      {errorMessage && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
            {result.status || "Stderr / Error Trace"}
          </p>
          <pre className="whitespace-pre-wrap text-xs text-red-300 font-mono">
            {errorMessage}
          </pre>
        </div>
      )}

      {/* Detailed Per-Test-Case breakdown */}
      {testList.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Test Case Breakdown
          </p>
          <div className="space-y-2">
            {testList.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border text-xs font-mono transition-colors ${
                  item.passed 
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200" 
                    : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-2">
                  <span>Test #{idx + 1} {item.passed ? "✓ PASSED" : "✕ FAILED"}</span>
                  {item.executionTimeMs && <span className="text-[10px] text-gray-400">{item.executionTimeMs}ms</span>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 uppercase text-[9px]">Expected:</span>
                    <pre className="bg-black/40 p-1.5 rounded mt-0.5 overflow-x-auto text-gray-300">
                      {formatVal(item.expectedOutput, item.outputState)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[9px]">Actual Output:</span>
                    <pre className={`p-1.5 rounded mt-0.5 overflow-x-auto ${item.passed ? "bg-black/40 text-emerald-300" : "bg-black/40 text-rose-300"}`}>
                      {formatVal(item.actualOutput, item.outputState)}
                    </pre>
                  </div>
                </div>
                {item.error && (
                  <p className="mt-2 text-rose-400 text-[10px] whitespace-pre-wrap">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <p className={`font-medium text-sm ${highlight || "text-gray-200"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status, verdict }) {
  const isAccepted = verdict === "Accepted" || verdict === "ACCEPTED";
  const isCompileErr = status === "COMPILE_ERROR" || verdict === "Compilation Error";
  const isTimeout = status === "TIMEOUT" || verdict === "Time Limit Exceeded";

  const badgeStyle = isAccepted
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
    : isCompileErr
    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
    : isTimeout
    ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
    : "bg-rose-500/10 text-rose-400 border border-rose-500/30";

  const label = verdict || status || "Executed";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${badgeStyle}`}
    >
      {label}
    </span>
  );
}
