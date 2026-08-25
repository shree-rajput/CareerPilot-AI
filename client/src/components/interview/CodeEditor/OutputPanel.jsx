export default function OutputPanel({ result, isRunning, isSubmitting }) {
  const isLoading = isRunning || isSubmitting;

  return (
    <div className="min-h-[120px] bg-[#181818]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Output
        </span>

        {result?.status && <StatusBadge status={result.status} />}
      </div>

      <div className="max-h-[220px] overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            {isRunning ? "Running test cases..." : "Submitting solution..."}
          </div>
        )}

        {!isLoading && !result && (
          <p className="text-sm text-slate-500">
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
        <p className="mb-1 text-xs font-semibold uppercase text-red-400">
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
        <pre className="rounded-md border border-slate-700 bg-[#1e1e1e] p-3 text-xs text-slate-300">
          {result.output}
        </pre>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>

      <p className="font-medium text-slate-200">{value}</p>
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
      className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase ${
        styles[normalized] || "bg-slate-700 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}
