import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  HelpCircle,
  Loader2,
  Lightbulb,
  AlertCircle,
  Code2,
  CheckCircle2,
  MessageSquare,
  Send,
  Zap,
  Flame,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  Brain
} from "lucide-react";
import { getAINudge, executeContextAction } from "../../api/techDiscussion";

export default function DiscussionAssistantPanel({
  roomId,
  problem,
  currentCode = "",
  currentLanguage = "javascript",
  selectedCode = "",
  socket = null,
  userName = "You"
}) {
  const [activeTab, setActiveTab] = useState("discussion"); // "discussion" | "nudge" | "actions"

  // Chat & Discussion State
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      senderId: "system",
      senderName: "AI Practice Companion",
      text: `Welcome to Tech Discussion! Discuss the '${problem?.title || "Problem"}' problem, write code together, and click Context Actions or Progressive Hints for assistance.`,
      type: "system",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  // Progressive Nudge State
  const [nudgeLevel, setNudgeLevel] = useState(1);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeData, setNudgeData] = useState(null);
  const [nudgeError, setNudgeError] = useState(null);

  // Context Actions State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [userQuestionText, setUserQuestionText] = useState("");

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup Socket listeners for chat messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("discussion:message", handleMessage);

    return () => {
      socket.off("discussion:message", handleMessage);
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText("");

    if (socket) {
      socket.emit("discussion:message", { text, type: "text" });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          senderName: userName,
          text,
          type: "text",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const handleRequestNudge = async (level) => {
    try {
      setNudgeLoading(true);
      setNudgeError(null);
      setNudgeLevel(level);

      const res = await getAINudge(roomId, {
        currentCode,
        hintLevel: level,
        questionTitle: problem?.title,
        selectedSnippet: selectedCode
      });

      if (res?.data) {
        setNudgeData(res.data);

        // Optionally broadcast AI nudge to chat so both peers benefit!
        if (socket && res.data.nudgeText) {
          socket.emit("discussion:message", {
            text: `[AI Hint Level ${level}] ${res.data.nudgeText}`,
            type: "ai_nudge",
            actionType: `level_${level}`
          });
        }
      }
    } catch (err) {
      console.error("Nudge error:", err);
      setNudgeError("Failed to generate hint.");
    } finally {
      setNudgeLoading(false);
    }
  };

  const handleTriggerAction = async (actionType) => {
    try {
      setActionLoading(true);
      setActionError(null);

      const res = await executeContextAction(roomId, {
        actionType,
        selectedCode,
        currentCode,
        problem,
        userQuestion: userQuestionText
      });

      if (res?.data) {
        setActionResult(res.data);
      }
    } catch (err) {
      console.error("Context Action error:", err);
      setActionError("Failed to execute action.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface border-l border-border text-text font-sans">
      
      {/* Top Header & Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-border bg-bg-secondary shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("discussion")}
            className={`py-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "discussion" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Discussion
            {activeTab === "discussion" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>

          <button
            onClick={() => setActiveTab("nudge")}
            className={`py-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "nudge" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-warning" /> Progressive Hints
            {activeTab === "nudge" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>

          <button
            onClick={() => setActiveTab("actions")}
            className={`py-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "actions" ? "text-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-success" /> AI Actions
            {activeTab === "actions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        
        {/* --- TAB 1: PEER DISCUSSION CHAT --- */}
        {activeTab === "discussion" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                    msg.type === "system"
                      ? "bg-bg border-border text-text-secondary text-center"
                      : msg.type === "ai_nudge"
                      ? "bg-info-bg/40 border-blue-200 text-blue-950 font-medium"
                      : "bg-bg-secondary border-border text-text"
                  }`}
                >
                  {msg.senderName && msg.type !== "system" && (
                    <div className="font-bold text-[10px] uppercase tracking-wider text-primary mb-1 flex justify-between">
                      <span>{msg.senderName}</span>
                      <span className="text-[9px] text-text-secondary font-normal">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-bg-secondary flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Discuss problem strategy with your peer..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* --- TAB 2: PROGRESSIVE NUDGE SYSTEM --- */}
        {activeTab === "nudge" && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Progressive Nudge Engine
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Receive guided hints step-by-step without spoiling the solution immediately.
              </p>
            </div>

            {/* Level Selector Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRequestNudge(1)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 1 ? "border-primary bg-info-bg/30 text-primary" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-text-secondary">Level 1</span>
                Socratic Question
              </button>

              <button
                onClick={() => handleRequestNudge(2)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 2 ? "border-primary bg-info-bg/30 text-primary" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-text-secondary">Level 2</span>
                Conceptual Hint
              </button>

              <button
                onClick={() => handleRequestNudge(3)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 3 ? "border-primary bg-info-bg/30 text-primary" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-text-secondary">Level 3</span>
                Strong Pattern Hint
              </button>

              <button
                onClick={() => handleRequestNudge(4)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 4 ? "border-warning bg-warning-bg/30 text-warning" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-warning">Level 4</span>
                Full Solution Code
              </button>
            </div>

            {nudgeLoading && (
              <div className="flex items-center justify-center p-8 text-text-secondary gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs font-medium">Formulating Level {nudgeLevel} Hint...</span>
              </div>
            )}

            {nudgeError && (
              <div className="p-3 bg-danger-bg border border-danger/20 text-danger rounded-xl text-xs">
                {nudgeError}
              </div>
            )}

            {nudgeData && !nudgeLoading && (
              <div className="bg-bg border border-border rounded-xl p-4 space-y-3 fade-in shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Level {nudgeData.level || nudgeLevel} Assistance
                  </span>
                  {nudgeData.keyTakeaway && (
                    <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {nudgeData.keyTakeaway}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text leading-relaxed whitespace-pre-line font-medium">
                  {nudgeData.nudgeText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: CONTEXT ACTIONS --- */}
        {activeTab === "actions" && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Zap className="w-4 h-4 text-success" /> Code & Discussion Context Actions
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Select a code snippet in the Monaco editor and click an action below for instant targeted feedback.
              </p>
            </div>

            {selectedCode ? (
              <div className="p-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-mono text-text-secondary truncate">
                Target snippet: <span className="text-text font-bold">"{selectedCode.slice(0, 40)}..."</span>
              </div>
            ) : (
              <div className="p-2.5 bg-bg border border-dashed border-border rounded-xl text-[11px] text-text-secondary text-center">
                Tip: Highlight code lines in editor to scope AI actions to that block.
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleTriggerAction("explain")}
                disabled={actionLoading}
                className="w-full p-2.5 bg-bg hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text text-left flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary" /> Explain Code</span>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button
                onClick={() => handleTriggerAction("complexity")}
                disabled={actionLoading}
                className="w-full p-2.5 bg-bg hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text text-left flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5 text-purple-600" /> Analyze Complexity (Big-O)</span>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button
                onClick={() => handleTriggerAction("challenge")}
                disabled={actionLoading}
                className="w-full p-2.5 bg-bg hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text text-left flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-warning" /> Challenge Approach / Edge Cases</span>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button
                onClick={() => handleTriggerAction("suggest")}
                disabled={actionLoading}
                className="w-full p-2.5 bg-bg hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text text-left flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5 text-success" /> Suggest Optimization Pattern</span>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Custom Question input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-text mb-1">Ask Custom Technical Question</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. How does garbage collection affect map deletion?"
                  value={userQuestionText}
                  onChange={(e) => setUserQuestionText(e.target.value)}
                  className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text outline-none"
                />
                <button
                  onClick={() => handleTriggerAction("ask")}
                  disabled={actionLoading || !userQuestionText.trim()}
                  className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
            </div>

            {actionLoading && (
              <div className="flex items-center justify-center p-6 text-text-secondary gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs font-medium">Executing Context Action...</span>
              </div>
            )}

            {actionResult && !actionLoading && (
              <div className="bg-bg border border-border rounded-xl p-4 space-y-2 fade-in shadow-sm">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{actionResult.title || actionResult.actionType}</h4>
                <div className="text-xs text-text leading-relaxed whitespace-pre-line font-medium">
                  {actionResult.response}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
