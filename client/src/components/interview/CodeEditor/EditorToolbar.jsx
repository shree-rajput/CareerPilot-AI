import React from "react";
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
    <div className="flex min-h-[48px] items-center justify-between gap-4 border-b border-[#2A3143] bg-[#151B2B] px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded bg-blue-500/20 text-blue-400">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
          </div>
          <span className="text-xs font-semibold text-white tracking-wide">
            Code Editor
          </span>
        </div>

        {languages.length > 0 && (
          <select
            value={language}
            disabled={readOnly}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="ml-2 rounded border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-gray-300 outline-none transition focus:border-blue-500 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {formatLanguageName(item)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={readOnly || isRunning || isSubmitting}
          onClick={onRun}
          className="flex items-center gap-1.5 rounded bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
          {isRunning ? "Running..." : "Run"}
        </button>

        <button
          type="button"
          disabled={readOnly || isRunning || isSubmitting}
          onClick={onSubmit}
          className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
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
