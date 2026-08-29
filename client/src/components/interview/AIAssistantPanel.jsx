import React, { useState } from "react";
import { Sparkles, HelpCircle, Loader2, ListChecks, Lightbulb, AlertCircle, Code2, CheckCircle2 } from "lucide-react";
import { http } from "../../api/http";

export default function AIAssistantPanel({ plan = [], roomId, currentCode = "", currentLanguage = "", question, role }) {
  const [activeTab, setActiveTab] = useState("plan");
  
  // Copilot State
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotSuggestion, setCopilotSuggestion] = useState(null);
  const [copilotError, setCopilotError] = useState(null);

  // Review State
  const [reviewLoading, setReviewLoading] = useState(false);
  const [codeReview, setCodeReview] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  const isInterviewer = role === "interviewer";
  
  const getSuggestion = async () => {
    try {
      setCopilotLoading(true);
      setCopilotError(null);
      const response = await http.post(`/interview-rooms/${roomId}/copilot`, {
        currentQuestion: question?.title || "General coding challenge",
        context: currentCode
      });
      setCopilotSuggestion(response.data?.data);
    } catch (err) {
      console.error("Copilot error:", err);
      setCopilotError("Failed to get suggestion.");
    } finally {
      setCopilotLoading(false);
    }
  };

  const getCodeReview = async () => {
    try {
      setReviewLoading(true);
      setReviewError(null);
      const response = await http.post(`/interview-rooms/${roomId}/code-review`, {
        questionTitle: question?.title || "Coding Challenge",
        questionDescription: question?.description || "",
        language: currentLanguage,
        code: currentCode,
        testResults: "Not available yet"
      });
      setCodeReview(response.data?.data);
    } catch (err) {
      console.error("Code review error:", err);
      setReviewError("Failed to analyze code.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#151B2B] text-gray-200">
      
      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-[#2A3143] shrink-0">
        <button 
          onClick={() => setActiveTab("plan")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "plan" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          <span className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Plan</span>
          {activeTab === "plan" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("copilot")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "copilot" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Copilot</span>
          {activeTab === "copilot" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("review")}
          className={`py-2.5 text-xs font-medium transition-colors relative whitespace-nowrap ${activeTab === "review" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> Review</span>
          {activeTab === "review" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"></div>}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* --- PLAN TAB --- */}
        {activeTab === "plan" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
              Interview Strategy
            </h3>
            {plan?.length > 0 ? (
              <ul className="space-y-3">
                {plan.map((item, idx) => (
                  <li key={idx} className="group p-3.5 rounded-xl bg-black/20 border border-white/5 transition-all duration-300">
                    <div className="text-[10px] font-mono text-blue-400 mb-1.5 flex items-center justify-between">
                      <span className="uppercase tracking-wider">{item.category}</span>
                      <span className="bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-300 border border-blue-500/20">{item.difficulty}</span>
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed font-medium">{item.questionText}</div>
                    {item.expectedConcepts?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.expectedConcepts.map((c, i) => (
                          <span key={i} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm text-center py-10">No plan available.</p>
            )}
          </div>
        )}

        {/* --- COPILOT TAB --- */}
        {activeTab === "copilot" && (
          <div className="flex flex-col h-full">
            <h3 className="text-gray-300 font-semibold mb-3 flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-blue-400" />
              AI Copilot
            </h3>
            
            <p className="text-gray-400 text-xs mb-4">
              Get intelligent follow-up suggestions based on the candidate's current code.
            </p>

            <button
              onClick={getSuggestion}
              disabled={copilotLoading || !currentCode.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 px-4 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {copilotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
              {copilotLoading ? "Analyzing..." : "Get Suggestion"}
            </button>

            {copilotError && (
              <div className="mt-4 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {copilotError}
              </div>
            )}

            {copilotSuggestion && !copilotLoading && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-3">
                <div>
                  <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">Suggested Follow-up</h4>
                  <p className="text-gray-200 text-xs leading-relaxed">"{copilotSuggestion.suggestedFollowUp}"</p>
                </div>
                <div>
                  <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">Reason</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{copilotSuggestion.reason}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- REVIEW TAB --- */}
        {activeTab === "review" && (
          <div className="flex flex-col h-full">
            <h3 className="text-gray-300 font-semibold mb-3 flex items-center gap-2 text-sm">
              <Code2 className="h-4 w-4 text-green-400" />
              Code Review
            </h3>
            
            <p className="text-gray-400 text-xs mb-4">
              Analyze the candidate's current solution for correctness, efficiency, and edge cases.
            </p>

            <button
              onClick={getCodeReview}
              disabled={reviewLoading || !currentCode.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg py-2.5 px-4 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {reviewLoading ? "Analyzing..." : "Run AI Review"}
            </button>

            {reviewError && (
              <div className="mt-4 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {reviewError}
              </div>
            )}

            {codeReview && !reviewLoading && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 border border-white/5 rounded p-2 text-center">
                    <div className="text-xl font-bold text-green-400">{codeReview.metrics?.correctness || 0}%</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Correctness</div>
                  </div>
                  <div className="bg-black/20 border border-white/5 rounded p-2 text-center">
                    <div className="text-xl font-bold text-blue-400">{codeReview.metrics?.efficiency || 0}%</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Efficiency</div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Time Complexity:</span>
                    <span className="font-mono text-gray-200">{codeReview.timeComplexity}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Space Complexity:</span>
                    <span className="font-mono text-gray-200">{codeReview.spaceComplexity}</span>
                  </div>
                </div>

                {codeReview.potentialIssues?.length > 0 && (
                  <div>
                    <h4 className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-2">Issues & Edge Cases</h4>
                    <ul className="space-y-1">
                      {codeReview.potentialIssues.map((issue, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-gray-300 items-start">
                          <span className="text-red-500 mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {codeReview.optimizationOpportunities?.length > 0 && (
                  <div>
                    <h4 className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-2">Optimizations</h4>
                    <ul className="space-y-1">
                      {codeReview.optimizationOpportunities.map((opt, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-gray-300 items-start">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
