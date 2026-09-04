import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTechDiscussionRoom,
  getAIProblemRecommendation,
  joinTechDiscussionRoom
} from "../api/techDiscussion";
import {
  Code2,
  Terminal,
  Layout,
  GraduationCap,
  ArrowRight,
  Check,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { toast } from "../context/ToastContext";

const PRACTICE_MODES = [
  {
    id: "coding",
    label: "Coding",
    icon: Code2,
    desc: "DSA, algorithms, debugging & optimization",
    subtopics: ["Arrays & HashMaps", "Strings & Two Pointers", "Trees & Recursion", "Algorithmic Logic"]
  },
  {
    id: "interview",
    label: "Interview",
    icon: GraduationCap,
    desc: "Mixed technical practice driven by candidate profile",
    subtopics: ["Role-Specific Problem Solving", "Technical Trade-Off Defense", "System Architecture Defense", "CS Core Reasoning"]
  }
];

export default function TechDiscussionSetupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("coding");
  const [experienceLevel, setExperienceLevel] = useState("fresher");
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("javascript");
  const [durationMinutes, setDurationMinutes] = useState(45);

  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [excludedIds, setExcludedIds] = useState([]);

  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (mode === "create") {
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
  }, [category, difficulty, experienceLevel, mode, excludedIds]);

  const handleRotateQuestion = () => {
    if (aiRecommendation?.question?.id) {
      setExcludedIds((prev) => [...prev, aiRecommendation.question.id]);
    }
  };

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setError("");

      const selectedMode = PRACTICE_MODES.find(m => m.id === category);

      const payload = {
        category,
        topic: selectedMode?.label || category,
        problemType: "ai_recommended",
        selectedProblemId: aiRecommendation?.question?.id || null,
        difficulty,
        experienceLevel,
        language,
        durationMinutes
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Peer Technical Practice Workspace
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Tech Discussion Room</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Select a practice mode to start live collaborative coding, architecture design, and peer feedback.
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
                <p className="text-xs text-text-secondary mt-0.5">Share the details below with your peer participant.</p>
              </div>

              <div className="bg-bg-secondary p-3.5 rounded-lg border border-border text-left">
                <span className="text-[10px] font-bold uppercase text-text-muted">Verified Question</span>
                <h4 className="text-xs font-bold text-text m-0 mt-0.5">{createdRoomInfo.problem?.title}</h4>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-surface border border-border text-primary">
                    {createdRoomInfo.problem?.difficulty || difficulty}
                  </span>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                    Verified Source
                  </span>
                </div>
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
            <div className="space-y-5">
              {/* 4 Top-Level Practice Modes */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2">Practice Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRACTICE_MODES.map((pm) => {
                    const IconComponent = pm.icon;
                    const isSelected = category === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setCategory(pm.id)}
                        className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-primary bg-primary-bg/25 text-text font-bold shadow-2xs"
                            : "border-border bg-surface text-text-secondary hover:border-border-hover"
                        }`}
                      >
                        <div className={`p-2 rounded-md ${isSelected ? "bg-primary text-white" : "bg-bg-secondary text-text-secondary"}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-text">{pm.label}</div>
                          <p className="text-[11px] text-text-muted m-0 line-clamp-1 font-medium">{pm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Question Preview Card */}
              {aiRecLoading ? (
                <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border text-center text-xs text-text-muted animate-pulse">
                  Selecting candidate-matched question from verified bank...
                </div>
              ) : aiRecommendation?.question ? (
                <div className="p-3.5 rounded-lg bg-surface border border-primary-border/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> Next Recommended Question
                    </span>
                    <button
                      type="button"
                      onClick={handleRotateQuestion}
                      className="text-[10px] text-text-secondary hover:text-primary font-medium flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Alternate Question
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-text m-0">{aiRecommendation.question.title}</h4>
                  <p className="text-[11px] text-text-secondary line-clamp-2 m-0 font-normal">
                    {aiRecommendation.question.description}
                  </p>
                  {aiRecommendation.rationale && (
                    <div className="text-[10px] text-text-muted font-medium italic pt-1 border-t border-border/50">
                      Rationale: {aiRecommendation.rationale}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs font-semibold text-text outline-none"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">Candidate Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs font-semibold text-text outline-none"
                  >
                    <option value="fresher">Fresher (Foundational)</option>
                    <option value="junior">Junior (1-2 yrs)</option>
                    <option value="intermediate">Mid-Level</option>
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
