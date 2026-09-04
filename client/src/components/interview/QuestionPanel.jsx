import React from "react";

function formatTestVal(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

export default function QuestionPanel({ question }) {
  const [activeTab, setActiveTab] = React.useState("problem");

  if (!question) return null;

  const testCases = (question.testCases || []).filter((tc) => !tc.hidden && !tc.isHidden);

  return (
    <div className="h-full w-full flex flex-col bg-[#151B2B] text-gray-200">
      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-[#2A3143] overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveTab("problem")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "problem" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          Problem
          {activeTab === "problem" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab("testcases")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "testcases" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          Test Cases ({testCases.length})
          {activeTab === "testcases" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab("hints")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "hints" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          Hints
          {activeTab === "hints" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "problem" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{question.title || "Technical Scenario"}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                    String(question.difficulty).toLowerCase() === "easy"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : String(question.difficulty).toLowerCase() === "medium"
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {question.difficulty || "medium"}
                </span>
              </div>
            </div>

            {question.category && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {question.category}
                </span>
                {question.experienceLevel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Level: {question.experienceLevel}
                  </span>
                )}
              </div>
            )}

            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300">
              <div
                className="mb-6 font-medium whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: question.description }}
              />

              {question.constraints && question.constraints.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-bold text-white uppercase tracking-wider">Constraints & Trade-Offs:</h3>
                  <ul className="list-inside list-disc space-y-1.5 text-gray-400">
                    {question.constraints.map((constraint, i) => (
                      <li key={i} className="text-xs">
                        <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono border border-white/5">{constraint}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "testcases" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Public Verification Test Cases</h3>
            {testCases.length === 0 ? (
              <div className="text-xs text-gray-400 bg-white/5 p-4 rounded-lg border border-white/10">
                No public test cases specified for this discussion scenario. You can test your code using freeform execution.
              </div>
            ) : (
              testCases.map((tc, idx) => (
                <div key={idx} className="bg-[#0B0F19] rounded-lg p-3 border border-[#2A3143] space-y-2">
                  <div className="text-xs font-bold text-primary flex items-center justify-between">
                    <span>Test Case #{idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Input</span>
                      <pre className="bg-black/50 p-2 rounded text-gray-200 font-mono mt-1 overflow-x-auto">
                        {formatTestVal(tc.input)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Expected Output</span>
                      <pre className="bg-black/50 p-2 rounded text-gray-200 font-mono mt-1 overflow-x-auto">
                        {formatTestVal(tc.expectedOutput ?? tc.output)}
                      </pre>
                    </div>
                  </div>
                  {tc.explanation && (
                    <p className="text-[11px] text-gray-400 italic mt-1">Explanation: {tc.explanation}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "hints" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Progressive Hints & Considerations</h3>
            {question.hints && question.hints.length > 0 ? (
              question.hints.map((hint, idx) => (
                <div key={idx} className="bg-[#0B0F19] p-3 rounded-lg border border-[#2A3143] text-xs text-gray-300">
                  <span className="font-bold text-amber-400 mr-2">Hint #{idx + 1}:</span>
                  {hint}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 bg-white/5 p-4 rounded-lg border border-white/10">
                Use the AI Discussion Assistant on the right panel for progressive Socratic hints and solution guidance.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}