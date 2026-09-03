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
  Flame,
  Layout,
  Terminal,
  Cpu,
  FolderGit2,
  GraduationCap
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { toast } from "../context/ToastContext";

const CATEGORIES = [
  { id: "architecture", label: "Architecture & System Design", icon: Layout, desc: "System design, microservices, scalability, caching & DB design" },
  { id: "coding", label: "Coding & Problem Solving", icon: Code2, desc: "DSA, algorithms, optimization, and code execution" },
  { id: "development", label: "Software Engineering & Dev", icon: Terminal, desc: "JS/React/Node, APIs, SQL, databases, Git, and debugging" },
  { id: "cs_fundamentals", label: "CS Fundamentals", icon: Cpu, desc: "OS, DBMS, Computer Networks, OOP, & concurrency" },
  { id: "project_discussion", label: "Project Architecture Defense", icon: FolderGit2, desc: "Explain your project, technical decisions & difficult production bugs" },
  { id: "interview_prep", label: "Technical Interview Practice", icon: GraduationCap, desc: "Company-specific technical reasoning & deep trade-offs" },
  { id: "custom", label: "Custom Technical Focus", icon: Flame, desc: "Define your own technical scenario or focus area" },
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
  const [mode, setMode] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("architecture");
  const [problemType, setProblemType] = useState("ai_recommended");
  const [experienceLevel, setExperienceLevel] = useState("junior");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("javascript");
  const [durationMinutes, setDurationMinutes] = useState(45);

  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [excludedIds, setExcludedIds] = useState([]);

  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (problemType === "ai_recommended" && mode === "create") {
      let isMounted = true;
      setAiRecLoading(true);
      const excludeIdParam = excludedIds.length > 0 ? excludedIds[excludedIds.length - 1] : "";
      getAIProblemRecommendation(category, difficulty, experienceLevel, excludeIdParam)
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
  }, [category, difficulty, experienceLevel, problemType, mode, excludedIds]);

  const handleRotateQuestion = () => {
    if (aiRecommendation?.question?.id) {
      setExcludedIds((prev) => [...prev, aiRecommendation.question.id]);
    }
  };

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setError("");

      const selectedCat = CATEGORIES.find(c => c.id === category);

      const payload = {
        category,
        topic: selectedCat?.label || category,
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
    toast.success("Invite link copied!");
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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Peer Technical Workspace
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Tech Discussion & Peer Interview</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Collaborate on system architecture, algorithms, and code reviews in a shared video environment.
          </p>
        </div>
      </div>

      <Card>
        <div className="flex border-b border-border bg-bg-secondary/40">
          <button
            onClick={() => {
              setMode("create");
              setError("");
              setCreatedRoomInfo(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold transition-all ${
              mode === "create" ? "text-primary bg-surface border-b-2 border-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            Create Discussion Room
          </button>
          <button
            onClick={() => {
              setMode("join");
              setError("");
              setCreatedRoomInfo(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold transition-all ${
              mode === "join" ? "text-primary bg-surface border-b-2 border-primary" : "text-text-secondary hover:text-text"
            }`}
          >
            Join Existing Room
          </button>
        </div>

        <CardContent className="p-5">
          {error && (
            <div className="mb-4 text-xs text-danger bg-danger-bg p-3 rounded border border-danger-border font-medium">
              {error}
            </div>
          )}

          {createdRoomInfo ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-1">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text m-0">Practice Workspace Active</h3>
                <p className="text-xs text-text-secondary mt-0.5">Share the code below with your peer participant.</p>
              </div>

              <div className="bg-bg-secondary p-3.5 rounded-lg border border-border text-left">
                <span className="text-[10px] font-bold uppercase text-text-muted">Scenario</span>
                <h4 className="text-xs font-bold text-text m-0 mt-0.5">{createdRoomInfo.problem?.title}</h4>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={createdRoomInfo.inviteLink}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text outline-none"
                  />
                  <Button onClick={handleCopyLink} size="xs">
                    {copiedLink ? "Copied" : "Copy Link"}
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-lg border border-border">
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Room Code</span>
                    <span className="text-base font-mono font-bold text-text block">{createdRoomInfo.roomCode}</span>
                  </div>
                  <Button variant="secondary" size="xs" onClick={handleCopyCode}>
                    {copiedCode ? "Copied" : "Copy Code"}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/tech-discussion/${createdRoomInfo.roomId}`)}
                size="md"
                className="w-full mt-2"
              >
                <span>Enter Workspace Now</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          ) : mode === "create" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2">Select Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const IconComponent = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "border-primary bg-primary-bg/20 text-text font-bold shadow-2xs"
                            : "border-border bg-surface text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        <div className={`p-1.5 rounded ${isSelected ? "bg-primary text-white" : "bg-bg-secondary text-text-secondary"}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-text">{cat.label}</div>
                          <p className="text-[10px] text-text-muted m-0 line-clamp-1 font-medium">{cat.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Maturity</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs font-semibold text-text outline-none"
                  >
                    <option value="fresher">Fresher</option>
                    <option value="junior">Junior</option>
                    <option value="intermediate">Mid-level</option>
                    <option value="experienced">Senior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs font-semibold text-text outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Duration</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs font-semibold text-text outline-none"
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <Button
                className="w-full mt-2"
                onClick={handleCreateRoom}
                isLoading={loading}
              >
                Create Workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Room Code or ID"
                placeholder="e.g. 64a7c9f82d1e4a12"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />

              <Button
                className="w-full"
                onClick={handleJoinRoom}
                isLoading={loading}
                disabled={!joinRoomCode.trim()}
              >
                Join Room
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
