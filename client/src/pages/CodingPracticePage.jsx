import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { codingApi } from "../api/coding";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { 
  Code, 
  ChevronLeft, 
  Play, 
  Send, 
  History, 
  Terminal, 
  Cpu, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Flame,
  Award
} from "lucide-react";

export function CodingPracticePage() {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Editor and execution states
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [leftTab, setLeftTab] = useState("problem"); // problem, history, review
  const [consoleOpen, setConsoleOpen] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError("");
      const qRes = await codingApi.getQuestions();
      setQuestions(qRes.data || []);
      
      const sRes = await codingApi.getSubmissions();
      setRecentSubmissions(sRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load SDE coding catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = async (q) => {
    try {
      setLoading(true);
      const detailRes = await codingApi.getQuestion(q._id);
      const fullQuestion = detailRes.data;
      setSelectedQuestion(fullQuestion);
      
      // Set default starter code
      const defaultLanguage = fullQuestion.supportedLanguages?.[0] || "javascript";
      setLanguage(defaultLanguage);
      setCode(fullQuestion.starterCode?.[defaultLanguage] || `// Write your code here\nfunction ${fullQuestion.title.replace(/\s+/g, "")}(input) {\n  \n}`);
      setResults(null);
      setAiReview(null);
      setLeftTab("problem");
    } catch (err) {
      console.error(err);
      setError("Failed to load question details.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunOrSubmit = async () => {
    if (!selectedQuestion) return;
    try {
      setExecuting(true);
      setConsoleOpen(true);
      setResults(null);
      
      const res = await codingApi.submitCode(selectedQuestion._id, language, code);
      setResults(res.data);
      
      if (res.data.aiReview) {
        setAiReview(res.data.aiReview);
        setLeftTab("review");
      }
      
      // Refresh submissions history
      const sRes = await codingApi.getSubmissions();
      setRecentSubmissions(sRes.data || []);
    } catch (err) {
      console.error(err);
      setResults({
        status: "failed",
        error: "Execution timeout or compile error occurred."
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleBackToCatalog = () => {
    setSelectedQuestion(null);
    setResults(null);
    setAiReview(null);
    loadCatalog();
  };

  if (loading && !selectedQuestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-bg">
        <Spinner size="lg" className="text-primary" />
        <span className="text-xs font-semibold text-text-secondary mt-2">Loading practice platform...</span>
      </div>
    );
  }

  if (error && !selectedQuestion) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12 bg-surface rounded-xl border border-border">
        <XCircle className="text-danger mx-auto mb-3" size={32} />
        <p className="text-sm font-semibold text-text">{error}</p>
        <Button variant="outline" size="sm" onClick={loadCatalog} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-bg animate-in fade-in">
      
      {/* CASE 1: DSA CATALOG LISTING */}
      {!selectedQuestion ? (
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-2">
                <Code className="text-primary" size={24} />
                <h1 className="text-xl font-black text-text m-0">SDE Coding Practice</h1>
              </div>
              <p className="text-xs text-text-secondary m-0 mt-1">Master DSA patterns, test executions, and receive immediate AI reviews to boost your interview readiness.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Question Grid */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider mb-1 flex items-center gap-1">
                  <BookOpen size={16} className="text-primary" /> Coding Challenges
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map((q) => (
                    <div 
                      key={q._id} 
                      className="bg-surface border border-border hover:border-primary/40 rounded-xl p-5 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between"
                      onClick={() => handleSelectQuestion(q)}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-extrabold text-sm text-text leading-tight">{q.title}</h3>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            q.difficulty === "easy" ? "bg-success/15 text-success" :
                            q.difficulty === "medium" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {q.tags?.map((t, idx) => (
                            <span key={idx} className="bg-bg-secondary text-[10px] font-bold text-text-secondary px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-border mt-4 pt-3 text-xs">
                        <span className="text-text-secondary font-semibold flex items-center gap-1">
                          <Award size={14} className="text-warning" /> {q.points || 100} Points
                        </span>
                        <Button variant="ghost" size="xs" className="font-bold text-primary flex items-center gap-1 p-0">
                          Solve Challenge <ExternalLink size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {questions.length === 0 && (
                    <div className="col-span-2 text-center p-8 bg-surface rounded-xl border border-dashed border-border text-xs text-text-secondary">
                      No DSA challenges loaded.
                    </div>
                  )}
                </div>
              </div>

              {/* Submissions Sidebar */}
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm h-fit flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-text uppercase tracking-wider m-0 flex items-center gap-1.5 pb-2 border-b border-border">
                  <History size={16} className="text-primary" /> Recent Submissions
                </h2>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {recentSubmissions.slice(0, 8).map((sub) => (
                    <div key={sub._id} className="bg-bg-secondary/40 border border-border rounded-lg p-3 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-text truncate max-w-[120px]">{sub.questionId?.title || "SDE Problem"}</span>
                        <span className={`text-[9px] font-black uppercase flex items-center gap-0.5 ${sub.status === "completed" ? "text-success" : "text-danger"}`}>
                          {sub.status === "completed" ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {sub.status === "completed" ? "Success" : "Failed"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-secondary font-medium mt-1">
                        <span>{sub.language}</span>
                        <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}

                  {recentSubmissions.length === 0 && (
                    <p className="text-xs text-text-secondary italic text-center py-6">No previous attempts logged.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* CASE 2: LIVE CODE COMPILER SPLIT SCREEN */}
          
          {/* LEFT: WORKSPACE DETAILS PANEL */}
          <div className="w-1/2 flex flex-col border-r border-border bg-surface">
            
            {/* Header Toolbar */}
            <div className="p-3 bg-bg-secondary border-b border-border flex items-center gap-3">
              <button 
                onClick={handleBackToCatalog}
                className="hover:bg-border p-1.5 rounded-lg text-text-secondary transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="font-extrabold text-sm text-text leading-none">{selectedQuestion.title}</h1>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 mt-1 inline-block rounded-full ${
                  selectedQuestion.difficulty === "easy" ? "bg-success/15 text-success" :
                  selectedQuestion.difficulty === "medium" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"
                }`}>
                  {selectedQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex border-b border-border px-2 py-1 bg-surface gap-1">
              <button 
                onClick={() => setLeftTab("problem")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors ${leftTab === "problem" ? "bg-primary text-white" : "hover:bg-bg-secondary text-text-secondary"}`}
              >
                Problem Description
              </button>
              <button 
                onClick={() => setLeftTab("review")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-center transition-colors ${leftTab === "review" ? "bg-primary text-white" : "hover:bg-bg-secondary text-text-secondary"} ${!aiReview ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!aiReview}
              >
                AI Review Insights
              </button>
            </div>

            {/* Left Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {leftTab === "problem" ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider mb-2">Description</h3>
                    <div className="text-sm text-text leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedQuestion.description}
                    </div>
                  </div>

                  {selectedQuestion.constraints && selectedQuestion.constraints.length > 0 && (
                    <div>
                      <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider mb-2">Constraints</h3>
                      <ul className="list-disc pl-4 text-xs font-mono text-text-secondary flex flex-col gap-1">
                        {selectedQuestion.constraints.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedQuestion.testCases && selectedQuestion.testCases.filter(t => !t.hidden).length > 0 && (
                    <div>
                      <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider mb-2">Example Cases</h3>
                      <div className="flex flex-col gap-4">
                        {selectedQuestion.testCases.filter(t => !t.hidden).slice(0, 2).map((tc, idx) => (
                          <div key={idx} className="bg-bg-secondary rounded-lg border border-border p-3.5 font-mono text-xs">
                            <div className="flex flex-col gap-1 mb-2">
                              <span className="text-[10px] font-bold text-text-secondary uppercase">Input</span>
                              <pre className="text-text font-bold whitespace-pre-wrap">{JSON.stringify(tc.input)}</pre>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-text-secondary uppercase">Expected Output</span>
                              <pre className="text-primary font-bold whitespace-pre-wrap">{JSON.stringify(tc.expectedOutput)}</pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // AI REVIEW TAB
                aiReview && (
                  <div className="flex flex-col gap-6 animate-in fade-in">
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm font-extrabold text-text flex items-center gap-1.5">
                          <Cpu className="text-primary" size={16} /> AI Code Analysis
                        </h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">Automated code review metrics and complexities.</p>
                      </div>
                    </div>

                    {/* AI Score Indicators */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-bg-secondary border border-border p-2 rounded-lg flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-text-secondary uppercase">Correctness</span>
                        <strong className="text-base font-black text-text mt-1">{aiReview.metrics?.correctness || 0}%</strong>
                      </div>
                      <div className="bg-bg-secondary border border-border p-2 rounded-lg flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-text-secondary uppercase">Efficiency</span>
                        <strong className="text-base font-black text-text mt-1">{aiReview.metrics?.efficiency || 0}%</strong>
                      </div>
                      <div className="bg-bg-secondary border border-border p-2 rounded-lg flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-text-secondary uppercase">Code Quality</span>
                        <strong className="text-base font-black text-text mt-1">{aiReview.metrics?.codeQuality || 0}%</strong>
                      </div>
                      <div className="bg-bg-secondary border border-border p-2 rounded-lg flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-text-secondary uppercase">Edge Cases</span>
                        <strong className="text-base font-black text-text mt-1">{aiReview.metrics?.edgeCases || 0}%</strong>
                      </div>
                    </div>

                    {/* Complexities */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase">Time Complexity</span>
                        <span className="text-sm font-mono font-black text-text mt-1">{aiReview.timeComplexity || "N/A"}</span>
                      </div>
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase">Space Complexity</span>
                        <span className="text-sm font-mono font-black text-text mt-1">{aiReview.spaceComplexity || "N/A"}</span>
                      </div>
                    </div>

                    {/* Detailed Review Checklists */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="text-[11px] font-bold text-success uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <CheckCircle size={12} /> Key Strengths
                        </h4>
                        <ul className="list-disc pl-4 text-xs font-semibold text-text-secondary flex flex-col gap-1">
                          {aiReview.strengths?.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-danger uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <XCircle size={12} /> Potential Issues
                        </h4>
                        <ul className="list-disc pl-4 text-xs font-semibold text-text-secondary flex flex-col gap-1">
                          {aiReview.potentialIssues?.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-warning uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Flame size={12} /> Optimizations
                        </h4>
                        <ul className="list-disc pl-4 text-xs font-semibold text-text-secondary flex flex-col gap-1">
                          {aiReview.optimizationOpportunities?.map((opt, i) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* RIGHT: LIVE COMPILER EDITOR & CONSOLE */}
          <div className="w-1/2 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
            
            {/* Compiler Options bar */}
            <div className="p-3 bg-[#181818] border-b border-[#2d2d2d] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-secondary uppercase">Language:</span>
                <select 
                  className="bg-transparent border border-[#3d3d3d] text-xs font-bold text-white px-2 py-0.5 rounded cursor-pointer"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {selectedQuestion.supportedLanguages?.map((lang) => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={handleRunOrSubmit} 
                  disabled={executing}
                  className="bg-transparent border-[#3d3d3d] text-white hover:bg-[#2d2d2d] flex items-center gap-1 font-bold"
                >
                  <Play size={12} /> Run Code
                </Button>
                <Button 
                  variant="primary" 
                  size="xs" 
                  onClick={handleRunOrSubmit} 
                  disabled={executing}
                  className="flex items-center gap-1 font-bold"
                >
                  <Send size={12} /> Submit
                </Button>
              </div>
            </div>

            {/* Monaco Editor Canvas */}
            <div className="flex-1 min-h-[350px]">
              <Editor
                height="100%"
                language={language === "javascript" ? "javascript" : language}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontWeight: "500",
                  lineNumbers: "on",
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  readOnly: executing,
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Execution Console Pane */}
            {consoleOpen && (
              <div className="border-t border-[#2d2d2d] bg-[#121212] flex flex-col h-[220px] overflow-hidden z-20">
                <div className="p-2 bg-[#181818] border-b border-[#2d2d2d] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-secondary flex items-center gap-1 uppercase">
                    <Terminal size={12} /> Execution Console
                  </span>
                  {executing && <Spinner size="xs" />}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-xs text-[#d4d4d4] flex flex-col gap-2">
                  {results ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-2 border-b border-[#2d2d2d]">
                        <span className="text-[11px] font-bold text-text-secondary">Summary</span>
                        <strong className={results.status === "completed" ? "text-success" : "text-danger"}>
                          {results.status === "completed" ? "Completed Successfully" : "Execution Failed"}
                        </strong>
                      </div>
                      
                      {results.testResults ? (
                        results.testResults.map((tc, idx) => (
                          <div key={idx} className="border-b border-[#1e1e1e] pb-2 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-text-secondary">Test Case {idx + 1}</span>
                              <span className={tc.passed ? "text-success font-black" : "text-danger font-black"}>
                                {tc.passed ? "PASSED" : "FAILED"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary mt-1">
                              <div>Expected: <span className="text-white font-bold">{JSON.stringify(tc.expectedOutput)}</span></div>
                              <div>Actual: <span className={tc.passed ? "text-success font-bold" : "text-danger font-bold"}>{JSON.stringify(tc.actualOutput)}</span></div>
                            </div>
                          </div>
                        ))
                      ) : results.error ? (
                        <pre className="text-danger whitespace-pre-wrap leading-relaxed">{results.error}</pre>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-text-secondary italic">Console initialized. Click Run or Submit to compile and test code.</span>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
