import React from "react";

export default function QuestionPanel({ question }) {
  const [activeTab, setActiveTab] = React.useState("problem");

  if (!question) return null;

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
          Test Cases
          {activeTab === "testcases" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "submissions" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          Submissions
          {activeTab === "submissions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "problem" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{question.title || "Two Sum"}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${question.difficulty === "Easy"
                    ? "bg-green-500/10 text-green-500"
                    : question.difficulty === "Medium"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-red-500/10 text-red-500"
                    }`}
                >
                  {question.difficulty || "Easy"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                <span>Solved: 48.7%</span>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                  Companies
                </button>
              </div>
            </div>

            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300">
              <div
                className="mb-6 font-medium"
                dangerouslySetInnerHTML={{ __html: question.description }}
              />

              {question.constraints && question.constraints.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-bold text-white">Constraints:</h3>
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
          <div className="text-sm text-gray-400 flex items-center justify-center h-full">Test cases will appear here.</div>
        )}
        {activeTab === "submissions" && (
          <div className="text-sm text-gray-400 flex items-center justify-center h-full">Previous submissions will appear here.</div>
        )}
      </div>
    </div>
  );

}