export default function EditorToolbar({
  language,
  languages = [],
  mode,
  readOnly,
  isRunning,
  isSubmitting,
  onLanguageChange,
  onRun,
  onSubmit,
}) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 border-b border-slate-700 bg-[#252526] px-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

          <span className="text-sm font-medium text-slate-200">
            Code Editor
          </span>
        </div>

        {languages.length > 0 && (
          <select
            value={language}
            disabled={readOnly}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="rounded-md border border-slate-600 bg-[#1e1e1e] px-3 py-1.5 text-sm text-slate-200 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {formatLanguageName(item)}
              </option>
            ))}
          </select>
        )}

        {mode === "peer" && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
            Collaborative
          </span>
        )}

        {mode === "ai" && (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400">
            AI Interview
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={readOnly || isRunning || isSubmitting}
          onClick={onRun}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running..." : "▶ Run"}
        </button>

        <button
          type="button"
          disabled={readOnly || isRunning || isSubmitting}
          onClick={onSubmit}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

function formatLanguageName(language) {
  const names = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    csharp: "C#",
    go: "Go",
    rust: "Rust",
    kotlin: "Kotlin",
  };

  return names[language] || language;
}
