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
  Brain,
  Bug,
  Compass,
  Cpu,
  Layers
} from "lucide-react";
import { getAINudge, executeContextAction } from "../../api/techDiscussion";

const ACTIONS = [
  { id: "explain", label: "Explain Code / Spec", icon: BookOpen, color: "text-primary", desc: "Line-by-line explanation" },
  { id: "complexity", label: "Analyze Complexity (Big-O)", icon: Code2, color: "text-purple-600", desc: "Time & Space complexity" },
  { id: "challenge", label: "Challenge Approach", icon: ShieldAlert, color: "text-warning", desc: "Find edge cases & bottlenecks" },
  { id: "suggest", label: "Suggest Optimization", icon: Lightbulb, color: "text-success", desc: "Cleaner implementation pattern" },
  { id: "debug", label: "Debug & Find Bugs", icon: Bug, color: "text-danger", desc: "Identify race conditions & nulls" },
  { id: "design", label: "Propose System Diagram", icon: Layers, color: "text-blue-600", desc: "Component architecture outline" },
  { id: "optimize", label: "Performance Tuning", icon: Flame, color: "text-orange-500", desc: "Speed & memory optimizations" },
  { id: "analyze", label: "Analyze Scalability Limits", icon: Cpu, color: "text-indigo-600", desc: "High-throughput throughput caps" },
];

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
      text: `Welcome to Tech Discussion! Discuss '${problem?.title || "Topic"}', write code or draw system design stencils together, and click Context Actions for instant AI feedback.`,
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

        if (socket && res.data.nudgeText) {
          socket.emit("discussion:message", {
            text: `[AI Facilitator Level ${level}] ${res.data.nudgeText}`,
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
                placeholder="Discuss technical approach with your peer..."
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

        {/* --- TAB 2: PROGRESSIVE HINTS --- */}
        {activeTab === "nudge" && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Progressive Facilitator Hints
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Receive guided hints step-by-step without spoiling full architecture or code immediately.
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
                Conceptual Pattern
              </button>

              <button
                onClick={() => handleRequestNudge(3)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 3 ? "border-primary bg-info-bg/30 text-primary" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-text-secondary">Level 3</span>
                Structural Outline
              </button>

              <button
                onClick={() => handleRequestNudge(4)}
                disabled={nudgeLoading}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  nudgeLevel === 4 ? "border-warning bg-warning-bg/30 text-warning" : "border-border bg-bg text-text-secondary hover:text-text"
                }`}
              >
                <span className="block text-[10px] uppercase font-bold tracking-widest text-warning">Level 4</span>
                Optimal Solution Pattern
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

        {/* --- TAB 3: 9 CONTEXT ACTIONS --- */}
        {activeTab === "actions" && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Zap className="w-4 h-4 text-success" /> AI Facilitator Actions
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Select code or canvas elements and trigger actions for instant targeted feedback.
              </p>
            </div>

            {selectedCode ? (
              <div className="p-2.5 bg-bg-secondary border border-border rounded-xl text-xs font-mono text-text-secondary truncate">
                Target snippet: <span className="text-text font-bold">"{selectedCode.slice(0, 40)}..."</span>
              </div>
            ) : (
              <div className="p-2.5 bg-bg border border-dashed border-border rounded-xl text-[11px] text-text-secondary text-center">
                Tip: Highlight code in editor to scope AI actions to that block.
              </div>
            )}

            {/* 8 Action Buttons Grid */}
            <div className="grid grid-cols-1 gap-2">
              {ACTIONS.map((act) => {
                const IconComponent = act.icon;
                return (
                  <button
                    key={act.id}
                    onClick={() => handleTriggerAction(act.id)}
                    disabled={actionLoading}
                    className="w-full p-2.5 bg-bg hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text text-left flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-3.5 h-3.5 ${act.color}`} />
                      <div>
                        <span>{act.label}</span>
                        <span className="block text-[10px] text-text-secondary font-normal">{act.desc}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Custom Question input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-text mb-1">💬 Ask Technical Question</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. How to handle cache invalidation on write?"
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
                <span className="text-xs font-medium">Executing AI Facilitator Action...</span>
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
