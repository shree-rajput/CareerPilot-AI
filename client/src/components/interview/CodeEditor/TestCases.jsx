export default function TestCasesPanel({
  testCases = [],
  activeTestCase,
  onSelectTestCase,
  executionResult,
}) {
  if (!testCases.length) {
    return (
      <div className="border-b border-slate-700 px-4 py-3">
        <p className="text-xs text-slate-500">
          No public test cases available.
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-700">
      <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3">
        {testCases.map((testCase, index) => {
          const result = getTestCaseResult(executionResult, testCase, index);

          const isActive = index === activeTestCase;

          return (
            <button
              key={testCase.id || testCase._id || index}
              type="button"
              onClick={() => onSelectTestCase(index)}
              className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? "bg-[#1e1e1e] text-white"
                  : "text-slate-500 hover:text-slate-300"
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
    <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Input
        </p>

        <pre className="max-h-32 overflow-auto rounded-md border border-slate-700 bg-[#1e1e1e] p-3 text-xs text-slate-300">
          {isHidden ? "Hidden test case" : formatValue(testCase.input)}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Expected Output
        </p>

        <pre className="max-h-32 overflow-auto rounded-md border border-slate-700 bg-[#1e1e1e] p-3 text-xs text-slate-300">
          {isHidden
            ? "Hidden test case"
            : formatValue(testCase.expectedOutput ?? testCase.output)}
        </pre>
      </div>
    </div>
  );
}

function getTestCaseResult(result, testCase, index) {
  if (!result?.testResults) {
    return null;
  }

  return (
    result.testResults.find(
      (item) => item.testCaseId === (testCase.id || testCase._id),
    ) || result.testResults[index]
  );
}

function formatValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
