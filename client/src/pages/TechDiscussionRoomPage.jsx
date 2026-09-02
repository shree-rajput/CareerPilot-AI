import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  TrackToggle,
  useConnectionState,
  ConnectionState,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { toast } from "../context/ToastContext";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";
import Whiteboard from "../components/interview/Whiteboard.jsx";
import PreJoinLobby from "../components/interview/PreJoinLobby.jsx";
import QuestionPanel from "../components/interview/QuestionPanel.jsx";
import DiscussionAssistantPanel from "../components/interview/DiscussionAssistantPanel.jsx";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Clock,
  Code2,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Sparkles,
  Users,
  Terminal,
  Columns
} from "lucide-react";
import { useSocket } from "../hooks/useSocket.js";
import { getLiveKitToken, endTechDiscussionSession } from "../api/techDiscussion";
import { executeCode } from "../api/peerInterview";

// Error Boundary for LiveKit
class LiveKitErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LiveKit UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6 text-center">
          <div className="max-w-md bg-surface p-6 rounded-xl border border-danger/30 shadow-md">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-danger" />
            <h3 className="text-lg font-bold mb-1 text-text">Media Bridge Notice</h3>
            <p className="text-text-secondary mb-4 text-xs">
              {this.state.error?.message || "Video stream container experienced a minor issue."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-white font-bold text-xs transition-colors"
            >
              Reload Media
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TechDiscussionRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Room & LiveKit Data
  const [roomData, setRoomData] = useState(null);
  const [problem, setProblem] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [selectedCode, setSelectedCode] = useState("");
  const [activeTab, setActiveTab] = useState("code"); // "code" | "whiteboard"

  // Code Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Layout Ratios & Panels Visibility
  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  const [isDiscussionCollapsed, setIsDiscussionCollapsed] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(true); // Video minimized by default to prioritize code!
  const [problemWidth, setProblemWidth] = useState(320); // px
  const [discussionWidth, setDiscussionWidth] = useState(340); // px

  // Room Code Copy State
  const [copiedCode, setCopiedCode] = useState(false);

  // Timer State
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(45 * 60);

  // Real-time socket hook
  const { socket, socketConnected } = useSocket(roomId, hasJoinedLobby);

  // Fetch LiveKit Token & Room Data
  useEffect(() => {
    if (!hasJoinedLobby || !roomId) return;

    let isMounted = true;
    setLoading(true);

    getLiveKitToken(roomId)
      .then((data) => {
        if (!isMounted) return;
        setRoomData(data);
        if (data.problem) {
          setProblem(data.problem);
          setCurrentLanguage(data.problem.defaultLanguage || "javascript");
        }
        if (data.codeState?.code) {
          setCurrentCode(data.codeState.code);
        }
        if (data.participants) {
          setParticipants(data.participants);
        }

        // Calculate timer from startedAt & duration
        if (data.expiresAt) {
          const expires = new Date(data.expiresAt).getTime();
          const now = Date.now();
          const remaining = Math.max(Math.floor((expires - now) / 1000), 0);
          setTimeRemainingSeconds(remaining);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Join Tech Discussion error:", err);
          setError(err.message || "Failed to join Tech Discussion Room.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId, hasJoinedLobby]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (!hasJoinedLobby || loading || error || timeRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.info("Session time expired! Finalizing Tech Discussion Report...");
          handleEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasJoinedLobby, loading, error, timeRemainingSeconds]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRun = async (payload) => {
    try {
      setIsRunning(true);
      const data = await executeCode(roomId, payload.questionId || problem?.id || "question", payload.language, payload.code);
      setExecutionResult(data.data || data);
    } catch (err) {
      console.error("Run error:", err);
      toast.error(err.response?.data?.message || "Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      const data = await executeCode(roomId, payload.questionId || problem?.id || "question", payload.language, payload.code);
      setExecutionResult(data.data || data);
      if (data.data?.passedTests === data.data?.totalTests) {
        toast.success("Submission Successful! All test cases passed.");
      } else {
        toast.info("Submission processed.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.response?.data?.message || "Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async () => {
    try {
      setLoading(true);
      await endTechDiscussionSession(roomId);
      navigate(`/tech-discussion/${roomId}/report`);
    } catch (err) {
      console.error("Failed to end session:", err);
      toast.error("Failed to generate report.");
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId.toUpperCase());
    setCopiedCode(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!hasJoinedLobby) {
    return <PreJoinLobby onJoin={() => setHasJoinedLobby(true)} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold">Connecting to Tech Discussion Room...</h2>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Discussion Room Unavailable</h2>
        <p className="mt-2 text-text-secondary font-medium">{error || "Invalid room session"}</p>
        <button
          onClick={() => navigate("/tech-discussion")}
          className="mt-6 flex items-center rounded-xl bg-surface border border-border px-4 py-2 hover:bg-bg text-text font-bold shadow-sm transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Setup
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-bg text-text overflow-hidden font-sans">
      
      {/* HEADER BAR */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/tech-discussion")}
            className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-bold text-text flex items-center gap-2">
              Tech Discussion <span className="text-text-secondary font-normal">/ {problem?.title || "Workspace"}</span>
            </h1>
          </div>
        </div>

        {/* Center: Timer & Room Code & Connection */}
        <div className="hidden md:flex items-center gap-6">
          {/* Room Code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 bg-bg-secondary hover:bg-border/50 px-2.5 py-1 rounded-lg border border-border transition-colors text-xs font-mono font-bold"
          >
            <span>{roomId.slice(0, 8).toUpperCase()}</span>
            {copiedCode ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-text-secondary" />}
          </button>

          {/* Socket Connection */}
          <div className="flex items-center gap-2 bg-bg-secondary px-3 py-1 rounded-full border border-border">
            <div className={`h-2 w-2 rounded-full ${socketConnected ? "bg-success shadow-sm" : "bg-warning animate-pulse"}`} />
            <span className="text-[11px] text-text-secondary font-bold">
              {socketConnected ? "Peer Connected" : "Connecting..."}
            </span>
          </div>

          {/* Server-authoritative Timer */}
          <div className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-lg border border-border">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono font-bold text-text">{formatTimer(timeRemainingSeconds)}</span>
          </div>
        </div>

        {/* Right: Controls & End Session */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsVideoMinimized(!isVideoMinimized)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs font-bold text-text hover:bg-border/40 transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-primary" />
            {isVideoMinimized ? "Show Video" : "Minimize Video"}
          </button>

          <button
            onClick={handleEndSession}
            className="flex items-center gap-1.5 rounded-lg bg-danger-bg hover:bg-danger/20 border border-danger/30 px-3.5 py-1.5 text-xs font-bold text-danger transition-all shadow-sm"
          >
            End Discussion
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <LiveKitRoom
        token={roomData.token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || roomData.livekitUrl}
        connect={true}
        audio={true}
        video={true}
        className="flex flex-1 overflow-hidden relative bg-bg"
      >
        <LiveKitErrorBoundary>
          
          {/* FLOATING / DOCKED MINIMIZABLE VIDEO PANEL */}
          {!isVideoMinimized && (
            <div className="absolute top-3 right-4 z-30 w-72 bg-surface/95 backdrop-blur border border-border rounded-2xl shadow-2xl p-2 space-y-2 fade-in">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border text-xs font-bold text-text-secondary">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Peers Video (2)</span>
                <button onClick={() => setIsVideoMinimized(true)} className="p-1 hover:bg-bg rounded text-text">
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-40 relative rounded-xl overflow-hidden bg-bg-secondary">
                <RoomAudioRenderer />
                <GridLayout tracks={useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false })} className="w-full h-full p-1 gap-1">
                  <ParticipantTile />
                </GridLayout>
              </div>
              <div className="flex justify-around items-center pt-1 border-t border-border">
                <TrackToggle source={Track.Source.Microphone} className="p-2 bg-bg hover:bg-border rounded-lg text-xs font-bold" />
                <TrackToggle source={Track.Source.Camera} className="p-2 bg-bg hover:bg-border rounded-lg text-xs font-bold" />
                <TrackToggle source={Track.Source.ScreenShare} className="p-2 bg-bg hover:bg-border rounded-lg text-xs font-bold" />
              </div>
            </div>
          )}

          {/* THREE-COLUMN RESIZABLE WORKSPACE */}
          <div className="flex flex-1 w-full h-full overflow-hidden">
            
            {/* LEFT COLUMN: PROBLEM PANEL */}
            <section
              style={{ width: isProblemCollapsed ? "44px" : `${problemWidth}px` }}
              className="flex flex-col bg-surface border-r border-border shrink-0 transition-all duration-200 relative overflow-hidden"
            >
              {isProblemCollapsed ? (
                <button
                  onClick={() => setIsProblemCollapsed(false)}
                  className="flex flex-col items-center py-4 gap-4 text-text-secondary hover:text-text h-full"
                >
                  <ChevronRight className="w-5 h-5" />
                  <span className="writing-mode-vertical text-xs font-bold tracking-widest uppercase text-primary">Problem Statement</span>
                </button>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-primary" /> Problem
                    </span>
                    <button onClick={() => setIsProblemCollapsed(true)} className="p-1 hover:bg-border rounded text-text-secondary">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {problem ? (
                      <QuestionPanel question={problem} />
                    ) : (
                      <div className="p-4 text-xs text-text-secondary">Loading problem statement...</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* MIDDLE COLUMN: LEETCODE MONACO CODE EDITOR */}
            <section className="flex-1 flex flex-col min-w-0 bg-surface overflow-hidden relative">
              {/* Workspace Header Bar & Tabs */}
              <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "code" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text hover:bg-bg"
                    }`}
                  >
                    Code Editor
                  </button>
                  <button
                    onClick={() => setActiveTab("whiteboard")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "whiteboard" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text hover:bg-bg"
                    }`}
                  >
                    Whiteboard
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Realtime Peer Sync
                </div>
              </div>

              {/* Editor Workspace Container */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === "code" ? (
                  <CodeEditor
                    question={problem}
                    sessionId={roomId}
                    mode="peer"
                    socket={socket}
                    value={currentCode}
                    initialLanguage={currentLanguage}
                    onChange={(code, metadata) => {
                      setCurrentCode(code);
                      if (metadata?.language) setCurrentLanguage(metadata.language);
                    }}
                    onSelectionChange={(selected) => setSelectedCode(selected)}
                    onRun={handleRun}
                    onSubmit={handleSubmit}
                    isRunning={isRunning}
                    isSubmitting={isSubmitting}
                    executionResult={executionResult}
                  />
                ) : (
                  <div className="h-full w-full absolute inset-0">
                    <Whiteboard socket={socket} isReadOnly={false} />
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT COLUMN: DISCUSSION & AI ASSISTANT PANEL */}
            <section
              style={{ width: isDiscussionCollapsed ? "44px" : `${discussionWidth}px` }}
              className="flex flex-col bg-surface border-l border-border shrink-0 transition-all duration-200 relative overflow-hidden"
            >
              {isDiscussionCollapsed ? (
                <button
                  onClick={() => setIsDiscussionCollapsed(false)}
                  className="flex flex-col items-center py-4 gap-4 text-text-secondary hover:text-text h-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="writing-mode-vertical text-xs font-bold tracking-widest uppercase text-primary">Discussion & AI</span>
                </button>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-warning" /> AI Companion
                    </span>
                    <button onClick={() => setIsDiscussionCollapsed(true)} className="p-1 hover:bg-border rounded text-text-secondary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <DiscussionAssistantPanel
                      roomId={roomId}
                      problem={problem}
                      currentCode={currentCode}
                      currentLanguage={currentLanguage}
                      selectedCode={selectedCode}
                      socket={socket}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </LiveKitErrorBoundary>
      </LiveKitRoom>
    </div>
  );
}
