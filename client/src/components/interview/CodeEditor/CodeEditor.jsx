import React, { useEffect, useMemo, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import EditorToolbar from "./EditorToolbar";
import TestCasesPanel from "./TestCasesPanel";
import OutputPanel from "./OutputPanel";

const DEFAULT_EDITOR_OPTIONS = {
  automaticLayout: true,
  minimap: {
    enabled: false,
  },
  fontSize: 14,
  fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
  fontLigatures: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "on",
  scrollBeyondLastLine: false,
  padding: {
    top: 12,
    bottom: 12,
  },
  smoothScrolling: true,
  cursorBlinking: "smooth",
  renderWhitespace: "selection",
  bracketPairColorization: {
    enabled: true,
  },
};

const normalizeLanguage = (language) => {
  if (!language) return "javascript";

  const aliases = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    py: "python",
    cplusplus: "cpp",
    "c++": "cpp",
    cs: "csharp",
    "c#": "csharp",
  };

  return aliases[language.toLowerCase()] || language.toLowerCase();
};

const getFrontendLanguageType = (abstractType, lang) => {
  const normType = (abstractType || "integer[]").trim().toLowerCase();
  const is2DArray = normType.includes("[][]") || normType.includes("2d");
  const isArray = !is2DArray && (normType.includes("[]") || normType.includes("array") || normType.includes("vector") || normType.includes("list"));
  const isObject = normType.includes("object") || normType.includes("map") || normType.includes("dict") || normType.includes("record") || normType.includes("{");
  const isString = !isObject && (normType.includes("string") || normType.includes("str") || normType.includes("char"));
  const isBool = normType.includes("bool");
  const isFloat = normType.includes("float") || normType.includes("double");
  const isInt = normType.includes("int") || normType.includes("number") || normType.includes("integer");

  switch (lang) {
    case "typescript":
    case "ts":
      if (is2DArray) return isString ? "string[][]" : "number[][]";
      if (isArray) return isString ? "string[]" : isBool ? "boolean[]" : "number[]";
      if (isObject) return "Record<string, any>";
      if (isString) return "string";
      if (isBool) return "boolean";
      if (isInt || isFloat) return "number";
      return "number[]";

    case "python":
    case "py":
      if (is2DArray) return isString ? "List[List[str]]" : "List[List[int]]";
      if (isArray) return isString ? "List[str]" : isBool ? "List[bool]" : isFloat ? "List[float]" : "List[int]";
      if (isObject) return "dict";
      if (isString) return "str";
      if (isBool) return "bool";
      if (isFloat) return "float";
      if (isInt) return "int";
      return "int[]";

    case "java":
      if (is2DArray) return isString ? "String[][]" : "int[][]";
      if (isArray) return isString ? "String[]" : isBool ? "boolean[]" : isFloat ? "double[]" : "int[]";
      if (isObject) return "Map<String, Object>";
      if (isString) return "String";
      if (isBool) return "boolean";
      if (isFloat) return "double";
      if (isInt) return "int";
      return "int";

    case "cpp":
    case "c++":
      if (is2DArray) return isString ? "vector<vector<string>>" : "vector<vector<int>>";
      if (isArray) return isString ? "vector<string>" : isBool ? "vector<bool>" : isFloat ? "vector<double>" : "vector<int>";
      if (isObject) return "auto";
      if (isString) return "string";
      if (isBool) return "bool";
      if (isFloat) return "double";
      if (isInt) return "int";
      return "int";

    default: // javascript
      return "";
  }
};

const generateFrontendStarterCode = (question, language) => {
  const norm = normalizeLanguage(language);
  const fn = question?.functionName || question?.execution?.functionName || "solution";
  const params = (question?.parameters || question?.execution?.parameters || [{ name: "arr", type: "integer[]" }]);
  const returnType = question?.returnType || question?.execution?.returnType || "integer";

  if (norm === "java") {
    let hasMap = false;
    const javaParams = params.map((p, i) => {
      const pName = p.name || `arg${i + 1}`;
      const pType = getFrontendLanguageType(p.type, "java");
      if (pType.includes("Map")) hasMap = true;
      return `${pType} ${pName}`;
    }).join(", ");
    const javaRet = getFrontendLanguageType(returnType, "java");
    const retStmt = javaRet === "int" ? "return 0;" : javaRet.includes("[]") ? "return new " + javaRet + "{};" : javaRet === "boolean" ? "return false;" : javaRet === "String" ? 'return "";' : "return 0;";
    const imports = hasMap ? "import java.util.*;\n\n" : "";
    return `${imports}class Solution {\n    public ${javaRet} ${fn}(${javaParams}) {\n        // Write your solution here\n        ${retStmt}\n    }\n}`;
  }

  if (norm === "cpp") {
    const cppParams = params.map((p, i) => {
      const pName = p.name || `arg${i + 1}`;
      const pType = getFrontendLanguageType(p.type, "cpp");
      const isComplex = pType.includes("vector") || pType.includes("string");
      return isComplex ? `const ${pType}& ${pName}` : `${pType} ${pName}`;
    }).join(", ");
    const cppRet = getFrontendLanguageType(returnType, "cpp");
    const retStmt = cppRet.includes("vector") ? "return {};" : cppRet === "bool" ? "return false;" : cppRet === "string" ? 'return "";' : "return 0;";
    return `class Solution {\npublic:\n    ${cppRet} ${fn}(${cppParams}) {\n        // Write your solution here\n        ${retStmt}\n    }\n};`;
  }

  if (norm === "python") {
    const pyParams = params.map((p, i) => p.name || `arg${i + 1}`).join(", ");
    return `def ${fn}(${pyParams}):\n    # Write your solution here\n    pass\n`;
  }

  if (norm === "typescript") {
    const tsParams = params.map((p, i) => {
      const pName = p.name || `arg${i + 1}`;
      const pType = getFrontendLanguageType(p.type, "typescript");
      return `${pName}: ${pType}`;
    }).join(", ");
    const tsRet = getFrontendLanguageType(returnType, "typescript");
    return `function ${fn}(${tsParams}): ${tsRet} {\n  // Write your solution here\n}`;
  }

  // javascript
  const jsParams = params.map((p, i) => p.name || `arg${i + 1}`).join(", ");
  return `function ${fn}(${jsParams}) {\n  // Write your solution here\n}`;
};

const getStarterCode = (question, language) => {
  const norm = normalizeLanguage(language);
  if (question?.starterCode && typeof question.starterCode === "object" && question.starterCode[norm]) {
    const starter = question.starterCode[norm];
    if (typeof starter === "string" && !starter.includes("public Object solution")) {
      return starter;
    }
  }
  if (typeof question?.starterCode === "string" && question.starterCode.trim() !== "" && !question.starterCode.includes("public Object solution")) {
    return question.starterCode;
  }
  return generateFrontendStarterCode(question, norm);
};

export default function CodeEditor({
  question,
  sessionId,
  mode = "ai",
  initialLanguage,
  value,
  onChange,
  onRun,
  onSubmit,
  onSelectionChange,
  isRunning = false,
  isSubmitting = false,
  executionResult = null,
  readOnly = false,
  editorOptions = {},
  socket = null,
  yjsProvider = null,
  userName = "You",
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const availableLanguages = useMemo(() => {
    const raw = (question?.supportedLanguages?.length > 0
      ? question.supportedLanguages
      : question?.languages?.length > 0
      ? question.languages
      : ["javascript", "python", "java", "cpp"]);
    return raw.map(normalizeLanguage);
  }, [question]);

  const firstLanguage =
    normalizeLanguage(
      initialLanguage || question?.defaultLanguage || availableLanguages[0],
    ) || "javascript";

  const [language, setLanguage] = useState(firstLanguage);
  const codeByLanguageRef = useRef({});

  const [code, setCode] = useState(() => {
    if (typeof value === "string") {
      return value;
    }
    const starter = getStarterCode(question, firstLanguage);
    codeByLanguageRef.current[firstLanguage] = starter;
    return starter;
  });

  const [activeTestCase, setActiveTestCase] = useState(0);

  // Reference to track remote code to prevent emit loops
  const remoteCode = useRef("");

  useEffect(() => {
    if (typeof value === "string") {
      setCode(value);
    }
  }, [value]);

  useEffect(() => {
    codeByLanguageRef.current = {};

    const newLanguage = normalizeLanguage(
      initialLanguage ||
      question?.defaultLanguage ||
      question?.supportedLanguages?.[0] ||
      "javascript"
    );

    setLanguage(newLanguage);
    const starter = getStarterCode(question, newLanguage);
    codeByLanguageRef.current[newLanguage] = starter;

    if (typeof value !== "string" || !value) {
      setCode(starter);
    }

    if (yjsProvider) {
      yjsProvider.resetCode(starter);
    }
  }, [question?.id, question?._id, question?.title, question?.question]);

  // Setup Monaco mount handler
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Bind Yjs CRDT text model to Monaco
    if (yjsProvider) {
      yjsProvider.bindMonaco(editor, monaco);
    }

    // Track cursor and selection changes to emit to peer
    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        socket.emit("code:cursor", {
          cursor: { lineNumber: e.position.lineNumber, column: e.position.column },
          userName,
        });
      }
    });

    editor.onDidChangeCursorSelection((e) => {
      const selectedText = editor.getModel()?.getValueInRange(e.selection);
      if (selectedText) {
        onSelectionChange?.(selectedText);
      }
    });
  };

  // Setup Socket Listeners for code, language & peer cursors
  useEffect(() => {
    if (!socket) return;

    const handleCodeChange = (data) => {
      setCode((prevCode) => {
        if (data.code !== prevCode) {
          remoteCode.current = data.code;
          return data.code;
        }
        return prevCode;
      });
    };

    const handleLanguageChange = (data) => {
      setLanguage((prevLang) => {
        if (data.language !== prevLang) {
          return data.language;
        }
        return prevLang;
      });
    };

    const handleRemoteCursor = (data) => {
      if (!editorRef.current || !monacoRef.current || !data.cursor) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      const newDecorations = [
        {
          range: new monaco.Range(
            data.cursor.lineNumber,
            data.cursor.column,
            data.cursor.lineNumber,
            data.cursor.column + 1
          ),
          options: {
            className: "peer-cursor-glow",
            hoverMessage: { value: `👤 ${data.userName || "Peer Collaborator"}` },
            beforeContentClassName: "peer-cursor-badge",
          },
        },
      ];

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    };

    socket.on("code:change", handleCodeChange);
    socket.on("language:change", handleLanguageChange);
    socket.on("code:cursor", handleRemoteCursor);

    return () => {
      socket.off("code:change", handleCodeChange);
      socket.off("language:change", handleLanguageChange);
      socket.off("code:cursor", handleRemoteCursor);
    };
  }, [socket]);

  const testCases = question?.testCases || [];

  const handleLanguageChange = (newLanguage) => {
    const normalizedLanguage = normalizeLanguage(newLanguage);

    // Cache current language code before switching
    if (code) {
      codeByLanguageRef.current[language] = code;
    }

    setLanguage(normalizedLanguage);

    const cachedCode = codeByLanguageRef.current[normalizedLanguage];
    const newStarterCode = cachedCode || getStarterCode(question, normalizedLanguage);
    codeByLanguageRef.current[normalizedLanguage] = newStarterCode;

    setCode(newStarterCode);

    if (socket) {
      socket.emit("language:change", { language: normalizedLanguage, sessionId });
      socket.emit("code:change", { code: newStarterCode, sessionId });
    }

    onChange?.(newStarterCode, {
      language: normalizedLanguage,
      sessionId,
      questionId: question?.id || question?._id,
    });
  };

  const handleEditorChange = (newValue) => {
    const updatedCode = newValue || "";

    setCode(updatedCode);
    codeByLanguageRef.current[language] = updatedCode;

    // Only emit if the change originated from THIS user's keyboard
    if (updatedCode !== remoteCode.current && socket) {
      socket.emit("code:change", { code: updatedCode, sessionId });
    }

    remoteCode.current = "";

    onChange?.(updatedCode, {
      language,
      sessionId,
      questionId: question?.id || question?._id,
    });
  };

  const handleRun = () => {
    onRun?.({
      sessionId,
      questionId: question?.id || question?._id,
      language,
      code,
      testCases,
    });
  };

  const handleSubmit = () => {
    onSubmit?.({
      sessionId,
      questionId: question?.id || question?._id,
      language,
      code,
    });
  };

  const containerRef = useRef(null);
  const isResizingOutput = useRef(false);
  const [outputHeight, setOutputHeight] = useState(() => {
    return Number(localStorage.getItem("tech_discussion_output_height")) || 240;
  });
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);

  // Auto-expand output drawer when execution starts or finishes with result
  useEffect(() => {
    if (isRunning || isSubmitting || executionResult) {
      setIsOutputCollapsed(false);
      window.dispatchEvent(new Event("resize"));
      if (editorRef.current) editorRef.current.layout();
    }
  }, [isRunning, isSubmitting, executionResult]);

  const handleMouseDownOutputResize = (e) => {
    e.preventDefault();
    isResizingOutput.current = true;
    document.addEventListener("mousemove", handleMouseMoveOutputResize);
    document.addEventListener("mouseup", handleMouseUpOutputResize);
  };

  const handleMouseMoveOutputResize = (e) => {
    if (isResizingOutput.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = Math.max(36, Math.min(rect.bottom - e.clientY, rect.height - 100));
      setOutputHeight(newHeight);
      localStorage.setItem("tech_discussion_output_height", newHeight);
      window.dispatchEvent(new Event("resize"));
      if (editorRef.current) editorRef.current.layout();
    }
  };

  const handleMouseUpOutputResize = () => {
    isResizingOutput.current = false;
    document.removeEventListener("mousemove", handleMouseMoveOutputResize);
    document.removeEventListener("mouseup", handleMouseUpOutputResize);
    window.dispatchEvent(new Event("resize"));
    if (editorRef.current) editorRef.current.layout();
  };

  return (
    <section ref={containerRef} className="flex h-full w-full flex-col overflow-hidden bg-transparent relative">
      <EditorToolbar
        language={language}
        languages={availableLanguages}
        mode={mode}
        readOnly={readOnly}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        onSubmit={handleSubmit}
      />

      <div className="min-h-0 flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="light"
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            ...DEFAULT_EDITOR_OPTIONS,
            ...editorOptions,
            readOnly,
          }}
          loading={
            <div className="flex h-full items-center justify-center bg-transparent text-sm text-slate-400">
              Loading editor...
            </div>
          }
        />
      </div>

      {/* DRAGGABLE HORIZONTAL SPLITTER BAR FOR TEST CASES / OUTPUT PANEL */}
      <div
        onMouseDown={handleMouseDownOutputResize}
        className="h-2 bg-[#1A2234] hover:bg-primary cursor-row-resize z-20 transition-colors shrink-0 flex items-center justify-center group border-t border-b border-[#2A3143]"
        title="Drag up/down to resize Test Cases & Output Panel"
      >
        <div className="w-10 h-1 rounded-full bg-gray-500 group-hover:bg-white transition-colors" />
      </div>

      {/* RESIZABLE TEST CASES & OUTPUT PANEL CONTAINER */}
      <div
        style={{ height: isOutputCollapsed ? "36px" : `${outputHeight}px` }}
        className="border-t border-[#2A3143] bg-[#0B0F19] flex flex-col shrink-0 overflow-hidden transition-all duration-75 relative"
      >
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#151B2B] border-b border-[#2A3143] shrink-0 text-xs font-bold text-gray-300">
          <span className="flex items-center gap-2">
            <span>Test Cases & Execution Output</span>
            {executionResult?.status && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                executionResult.status === "SUCCESS" && executionResult.allPassed
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : executionResult.status === "COMPILE_ERROR"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {executionResult.verdict || executionResult.status}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsOutputCollapsed(!isOutputCollapsed);
              window.dispatchEvent(new Event("resize"));
              if (editorRef.current) editorRef.current.layout();
            }}
            className="px-2 py-0.5 rounded bg-[#2A3143] hover:bg-gray-700 text-gray-300 text-[10px] uppercase font-bold transition-colors"
          >
            {isOutputCollapsed ? "▲ Expand Panel" : "▼ Collapse Panel"}
          </button>
        </div>

        {!isOutputCollapsed && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TestCasesPanel
              testCases={testCases}
              activeTestCase={activeTestCase}
              onSelectTestCase={setActiveTestCase}
              executionResult={executionResult}
            />

            <OutputPanel
              result={executionResult}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </div>
    </section>
  );
}
