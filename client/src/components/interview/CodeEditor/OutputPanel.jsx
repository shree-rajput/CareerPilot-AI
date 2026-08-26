import React from "react";

export default function OutputPanel({ result, isRunning, isSubmitting }) {
  const isLoading = isRunning || isSubmitting;

  return (
    <div className="min-h-[120px] bg-[#0B0F19]">
      <div className="flex items-center justify-between border-b border-[#2A3143] bg-[#151B2B] px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          Output
        </span>

        {result?.status && <StatusBadge status={result.status} />}
      </div>

      <div className="max-h-[220px] overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            {isRunning ? "Running test cases..." : "Submitting solution..."}
          </div>
        )}

        {!isLoading && !result && (
          <p className="text-sm text-gray-500">
            Run your code to see the output.
          </p>
        )}

        {!isLoading && result && <ExecutionResult result={result} />}
      </div>
    </div>
  );
}

function ExecutionResult({ result }) {
  if (result.error) {
    return (
      <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
          Execution Error
        </p>

        <pre className="whitespace-pre-wrap text-xs text-red-300">
          {result.error}
        </pre>
      </div>
    );
  }

  const passed =
    result.passed ??
    result.testResults?.filter((item) => item.passed).length ??
    0;

  const total = result.total ?? result.testResults?.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <Metric label="Tests" value={`${passed}/${total}`} />

        {result.executionTimeMs !== undefined && (
          <Metric label="Runtime" value={`${result.executionTimeMs} ms`} />
        )}

        {result.memoryKb !== undefined && (
          <Metric label="Memory" value={`${result.memoryKb} KB`} />
        )}
      </div>

      {result.output && (
        <pre className="rounded-md border border-white/5 bg-black/40 p-3 text-xs text-gray-300 custom-scrollbar">
          {result.output}
        </pre>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>

      <p className="font-medium text-gray-200 text-sm">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = status.toLowerCase();

  const styles = {
    completed: "bg-emerald-500/10 text-emerald-400",
    passed: "bg-emerald-500/10 text-emerald-400",
    failed: "bg-red-500/10 text-red-400",
    error: "bg-red-500/10 text-red-400",
    running: "bg-blue-500/10 text-blue-400",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles[normalized] || "bg-gray-800 text-gray-300"
        }`}
    >
      {status}
    </span>
  );
}
