import React from "react";

export default function TestCasesPanel({
  testCases = [],
  activeTestCase,
  onSelectTestCase,
  executionResult,
}) {
  if (!testCases.length) {
    return (
      <div className="border-b border-[#2A3143] px-4 py-3 bg-[#151B2B]">
        <p className="text-xs text-gray-500">
          No public test cases available.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-[#2A3143] bg-[#151B2B]">
      <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3">
        {testCases.map((testCase, index) => {
          const result = getTestCaseResult(executionResult, testCase, index);

          const isActive = index === activeTestCase;

          return (
            <button
              key={testCase.id || testCase._id || index}
              type="button"
              onClick={() => onSelectTestCase(index)}
              className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium transition ${isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
                }`}
            >
              {result && (
                <span
                  className={
                    result.passed ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {result.passed ? "✓" : "✕"}
                </span>
              )}
              Test Case {index + 1}
            </button>
          );
        })}
      </div>

      <TestCaseDetails testCase={testCases[activeTestCase]} />
    </div>
  );
}

function TestCaseDetails({ testCase }) {
  if (!testCase) return null;

  const isHidden = testCase.hidden === true || testCase.isHidden === true;

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-2 bg-[#0B0F19]">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Input
        </p>

        <pre className="max-h-32 overflow-auto rounded-md border border-white/5 bg-black/40 p-3 text-xs text-gray-300 custom-scrollbar">
          {isHidden ? "Hidden test case" : formatValue(testCase.input)}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Expected Output
        </p>

        <pre className="max-h-32 overflow-auto rounded-md border border-white/5 bg-black/40 p-3 text-xs text-gray-300 custom-scrollbar">
          {isHidden
            ? "Hidden test case"
            : formatValue(testCase.expectedOutput ?? testCase.output)}
        </pre>
      </div>
    </div>
  );
}

function getTestCaseResult(result, testCase, index) {
  if (!result) {
    return null;
  }

  const testResults = result.testResults || result.results || result.data?.results || [];
  if (!testResults.length) {
    return null;
  }

  return (
    testResults.find(
      (item) => item.testCaseId === (testCase.id || testCase._id),
    ) || testResults[index]
  );
}

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value === "" ? '""' : value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
