import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTechDiscussionRoom,
  getAIProblemRecommendation,
  joinTechDiscussionRoom
} from "../api/techDiscussion";
import {
  Code2,
  Sparkles,
  Users,
  ArrowRight,
  Plus,
  KeyRound,
  AlertCircle,
  Copy,
  Check,
  BrainCircuit,
  Clock,
  Layers,
  ShieldCheck,
  Flame
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { toast } from "../context/ToastContext";

const TOPICS = [
  { id: "DSA", label: "Data Structures & Algorithms" },
  { id: "Backend", label: "Backend System Development" },
  { id: "Frontend", label: "Frontend & Web Architecture" },
  { id: "System Design", label: "System Design & Scalability" },
  { id: "Database", label: "Database Optimization & SQL" },
  { id: "JavaScript", label: "JavaScript Core & Async" },
  { id: "Python", label: "Python Engineering" },
  { id: "Java", label: "Java Enterprise Concepts" },
  { id: "Custom", label: "Custom Problem Focus" },
];

const LANGUAGES = [
  { id: "javascript", label: "JavaScript (Node.js)" },
  { id: "python", label: "Python 3" },
  { id: "java", label: "Java 17" },
  { id: "cpp", label: "C++ (GCC)" },
  { id: "typescript", label: "TypeScript" },
];

export default function TechDiscussionSetupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup Form State
  const [topic, setTopic] = useState("DSA");
  const [problemType, setProblemType] = useState("ai_recommended"); // "ai_recommended" | "custom_problem"
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("javascript");
  const [durationMinutes, setDurationMinutes] = useState(45);

  // Custom Problem fields
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  // AI Recommendation preview
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);

  // Join State
  const [joinRoomCode, setJoinRoomCode] = useState("");

  // Created Room Share modal state
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch AI Recommendation Preview when topic or difficulty changes
  useEffect(() => {
    if (problemType === "ai_recommended" && mode === "create") {
      let isMounted = true;
      setAiRecLoading(true);
      getAIProblemRecommendation(topic, difficulty)
        .then((res) => {
          if (isMounted && res?.data) {
            setAiRecommendation(res.data);
          }
        })
        .catch((err) => {
          console.warn("AI Rec error:", err);
        })
        .finally(() => {
          if (isMounted) setAiRecLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [topic, difficulty, problemType, mode]);

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setError("");

      const payload = {
        topic,
        problemType,
        difficulty,
        language,
        durationMinutes,
        customProblem: problemType === "custom_problem" ? { title: customTitle, description: customDescription } : null
      };

      const res = await createTechDiscussionRoom(payload);
      const roomData = res?.data;

      if (!roomData?.roomId) {
        throw new Error("Room created, but room ID was not returned.");
      }

      setCreatedRoomInfo(roomData);
    } catch (err) {
      console.error("Create room failed:", err);
      setError(err?.response?.data?.message || err.message || "Failed to create discussion room.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    const code = joinRoomCode.trim();
    if (!code) {
      setError("Please enter a valid room code or ID.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await joinTechDiscussionRoom(code);
      const joinedRoomId = res?.data?.roomId || code;

      navigate(`/tech-discussion/${joinedRoomId}`);
    } catch (err) {
      console.error("Join room failed:", err);
      setError(err?.response?.data?.message || "Unable to join discussion room. Check room code.");
    } finally {
      setLoading(false);
    }
  }

  const handleCopyLink = () => {
    if (!createdRoomInfo?.inviteLink) return;
    navigator.clipboard.writeText(createdRoomInfo.inviteLink);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!createdRoomInfo?.roomCode) return;
    navigator.clipboard.writeText(createdRoomInfo.roomCode);
    setCopiedCode(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center pt-10 pb-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-3xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/20">
            <Code2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text mb-3">
            Tech Discussion Room
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Collaborative coding workspace with real-time peer editing, LiveKit video, LeetCode-style execution, and AI technical assistance.
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-border rounded-2xl overflow-hidden bg-surface">
          <div className="flex border-b border-border bg-bg-secondary">
            <button
              onClick={() => {
                setMode("create");
                setError("");
                setCreatedRoomInfo(null);
              }}
              className={`flex-1 py-4 px-6 text-sm font-bold transition-all relative ${
                mode === "create"
                  ? "text-primary bg-surface"
                  : "text-text-secondary hover:text-text hover:bg-surface/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Create Discussion Room
              </div>
              {mode === "create" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => {
                setMode("join");
                setError("");
                setCreatedRoomInfo(null);
              }}
              className={`flex-1 py-4 px-6 text-sm font-bold transition-all relative ${
                mode === "join"
                  ? "text-primary bg-surface"
                  : "text-text-secondary hover:text-text hover:bg-surface/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <KeyRound className="h-4 w-4" />
                Join Existing Room
              </div>
              {mode === "join" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
          </div>

          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl bg-danger-bg p-4 border border-danger/20 text-danger">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* IF ROOM WAS JUST CREATED: SHOW SHARE MODAL */}
            {createdRoomInfo ? (
              <div className="space-y-6 fade-in text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-success-bg border border-green-200 flex items-center justify-center text-success mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text">Discussion Room Ready!</h3>
                  <p className="text-text-secondary text-sm mt-1">Share the invite link or room code with your practice partner to join together.</p>
                </div>

                {/* Problem Info Card */}
                <div className="bg-bg border border-border rounded-xl p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">{createdRoomInfo.problem?.difficulty || "Medium"}</span>
                    <span className="text-xs text-text-secondary font-medium">{createdRoomInfo.problem?.topics?.join(", ") || topic}</span>
                  </div>
                  <h4 className="font-bold text-text text-base">{createdRoomInfo.problem?.title}</h4>
                  {createdRoomInfo.aiRecommendationReason && (
                    <p className="text-xs text-text-secondary mt-2 bg-info-bg/50 p-2.5 rounded-lg border border-blue-100 text-blue-900 leading-relaxed font-medium">
                      💡 {createdRoomInfo.aiRecommendationReason}
                    </p>
                  )}
                </div>

                {/* Share Box */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={createdRoomInfo.inviteLink}
                      className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 text-xs font-mono text-text outline-none"
                    />
                    <Button onClick={handleCopyLink} className="h-10 text-xs px-4">
                      {copiedLink ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copiedLink ? "Copied" : "Copy Link"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between bg-bg-secondary p-3.5 rounded-xl border border-border">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Room Code</span>
                      <span className="text-lg font-mono font-extrabold text-text tracking-wider">{createdRoomInfo.roomCode}</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text hover:bg-bg transition-colors"
                    >
                      {copiedCode ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    onClick={() => navigate(`/tech-discussion/${createdRoomInfo.roomId}`)}
                    className="w-full h-12 text-base font-bold shadow-md"
                  >
                    Enter Workspace Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : mode === "create" ? (
              /* CREATE MODE FORM */
              <div className="space-y-6 fade-in">
                {/* Topic Selector */}
                <div>
                  <label className="block text-sm font-bold text-text mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Technical Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl h-11 px-3 text-sm text-text font-medium focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow"
                  >
                    {TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Problem Selection Strategy */}
                <div>
                  <label className="block text-sm font-bold text-text mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-primary" /> Problem Selection
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProblemType("ai_recommended")}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        problemType === "ai_recommended"
                          ? "border-primary bg-info-bg/30 text-text shadow-sm"
                          : "border-border bg-bg text-text-secondary hover:border-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-text mb-1">
                        <Sparkles className="w-4 h-4 text-primary" /> AI Recommended
                      </div>
                      <p className="text-[11px] text-text-secondary leading-tight">Tailored to your skill gaps & target role.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProblemType("custom_problem")}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        problemType === "custom_problem"
                          ? "border-primary bg-info-bg/30 text-text shadow-sm"
                          : "border-border bg-bg text-text-secondary hover:border-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-text mb-1">
                        <Flame className="w-4 h-4 text-warning" /> Custom Problem
                      </div>
                      <p className="text-[11px] text-text-secondary leading-tight">Define a custom problem title & prompt.</p>
                    </button>
                  </div>
                </div>

                {/* AI Recommendation Preview Banner */}
                {problemType === "ai_recommended" && (
                  <div className="bg-info-bg/40 border border-blue-200/60 rounded-xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Recommended Problem
                      </span>
                      {aiRecLoading && <span className="text-xs text-text-secondary animate-pulse">Analyzing profile...</span>}
                    </div>

                    {aiRecommendation?.question ? (
                      <div>
                        <h4 className="text-sm font-bold text-text">{aiRecommendation.question.title}</h4>
                        <p className="text-xs text-blue-900 mt-1 leading-relaxed font-medium">{aiRecommendation.rationale}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">Loading AI recommendation based on your CareerPilot intelligence...</p>
                    )}
                  </div>
                )}

                {/* Custom Problem Inputs */}
                {problemType === "custom_problem" && (
                  <div className="space-y-4 bg-bg border border-border p-4 rounded-xl">
                    <Input
                      label="Problem Title"
                      placeholder="e.g. Design an In-Memory Rate Limiter"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-bold text-text mb-1">Problem Description</label>
                      <textarea
                        rows={3}
                        placeholder="Specify requirements, constraints, and sample test inputs..."
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow"
                      />
                    </div>
                  </div>
                )}

                {/* Difficulty & Language & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-text mb-1">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl h-11 px-3 text-sm text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-text mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl h-11 px-3 text-sm text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id}>{l.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-text mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-text-secondary" /> Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-bg border border-border rounded-xl h-11 px-3 text-sm text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    >
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="bg-bg-secondary rounded-xl p-3.5 border border-border flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                  <p className="text-xs text-text-secondary font-medium">
                    Private room by default. LiveKit camera & microphone permissions will be requested upon joining.
                  </p>
                </div>

                <Button
                  className="w-full h-12 text-base font-bold shadow-md"
                  onClick={handleCreateRoom}
                  isLoading={loading}
                >
                  Create Tech Discussion Room
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            ) : (
              /* JOIN MODE FORM */
              <div className="space-y-6 fade-in">
                <div>
                  <h2 className="text-xl font-bold text-text mb-1">Join Discussion Room</h2>
                  <p className="text-text-secondary text-sm">
                    Enter the 16-character room code or share link provided by your practice peer.
                  </p>
                </div>

                <Input
                  label="Room Code or ID"
                  placeholder="e.g. 64a7c9f82d1e4a12"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  className="text-lg tracking-widest font-mono uppercase"
                />

                <Button
                  className="w-full h-12 text-base font-bold shadow-md"
                  onClick={handleJoinRoom}
                  isLoading={loading}
                  disabled={!joinRoomCode.trim()}
                >
                  Join Room Workspace
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
