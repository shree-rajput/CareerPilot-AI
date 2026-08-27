import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
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

const getStarterCode = (question, language) => {
  if (!question?.starterCode) {
    return "";
  }

  if (typeof question.starterCode === "string") {
    return question.starterCode;
  }

  return question.starterCode[language] || "";
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

  isRunning = false,
  isSubmitting = false,

  executionResult = null,

  readOnly = false,

  editorOptions = {},
  socket = null,
}) {
  const availableLanguages = useMemo(() => {
    return (question?.supportedLanguages || question?.languages || []).map(
      normalizeLanguage,
    );
  }, [question]);

  const firstLanguage =
    normalizeLanguage(
      initialLanguage || question?.defaultLanguage || availableLanguages[0],
    ) || "javascript";

  const [language, setLanguage] = useState(firstLanguage);

  const [code, setCode] = useState(() => {
    if (typeof value === "string") {
      return value;
    }

    return getStarterCode(question, firstLanguage);
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
    const newLanguage = normalizeLanguage(
      initialLanguage ||
      question?.defaultLanguage ||
      question?.supportedLanguages?.[0],
    );

    if (!newLanguage) return;

    setLanguage(newLanguage);

    if (typeof value !== "string") {
      setCode(getStarterCode(question, newLanguage));
    }
  }, [question?.id, question?._id]);

  // Setup Socket Listeners
  useEffect(() => {
    if (!socket || mode !== "peer") return;

    const handleCodeChange = (data) => {
      // Use function state update to access latest code without adding it to dependencies
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

    socket.on("code:change", handleCodeChange);
    socket.on("language:change", handleLanguageChange);

    return () => {
      socket.off("code:change", handleCodeChange);
      socket.off("language:change", handleLanguageChange);
    };
  }, [socket, mode]);

  const testCases = question?.testCases || [];

  const handleLanguageChange = (newLanguage) => {
    const normalizedLanguage = normalizeLanguage(newLanguage);

    setLanguage(normalizedLanguage);

    const newStarterCode = getStarterCode(question, normalizedLanguage);

    setCode(newStarterCode);

    if (socket && mode === "peer") {
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

    // Only emit if the change originated from THIS user's keyboard
    if (updatedCode !== remoteCode.current && socket && mode === "peer") {
      socket.emit("code:change", { code: updatedCode, sessionId });
    }

    // Reset the remote change flag equivalence
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

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-transparent">
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

      <div className="min-h-0 flex-1 relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="light"
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

      <div className="border-t border-[#2A3143] bg-[#0B0F19]">
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
    </section>
  );
}
