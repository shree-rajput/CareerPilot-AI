import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  TrackToggle,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { toast } from "../context/ToastContext";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";
import ArchitecturalCanvas from "../components/interview/ArchitecturalCanvas.jsx";
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
  Layout,
  FileText
} from "lucide-react";
import { useSocket } from "../hooks/useSocket.js";
import { YjsSocketProvider } from "../services/yjsProvider.js";
import {
  getLiveKitToken,
  getTechDiscussionSession,
  saveTechDiscussionDraft,
  endTechDiscussionSession,
  getNextQuestion,
  executeTechDiscussionCode
} from "../api/techDiscussion";

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
            <h3 className="text-lg font-bold mb-1 text-text">Media Stream Notice</h3>
            <p className="text-text-secondary mb-4 text-xs">
              {this.state.error?.message || "Media container noticed a device change. Continuing practice session."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-white font-bold text-xs transition-colors"
            >
              Reset Media Container
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
  const [mediaPermissions, setMediaPermissions] = useState({ hasCamera: true, hasMic: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Room & LiveKit Data
  const [roomData, setRoomData] = useState(null);
  const [problem, setProblem] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [selectedCode, setSelectedCode] = useState("");
  const [specNotes, setSpecNotes] = useState("# System Architecture Spec Notes\n\n- Component 1: Client Application\n- Component 2: API Gateway / Load Balancer\n- Component 3: Microservice Cluster\n- Database: PostgreSQL & Redis Cache");

  // Multi-tool Workspace Mode: "code" | "canvas" | "spec"
  const [activeWorkspace, setActiveWorkspace] = useState("code");
  const [isFullscreenWorkspace, setIsFullscreenWorkspace] = useState(false);

  // Code Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Resizable Layout Proportions & Panels Visibility
  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  const [isDiscussionCollapsed, setIsDiscussionCollapsed] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(true);

  const [problemWidth, setProblemWidth] = useState(() => {
    return Number(localStorage.getItem("tech_discussion_problem_width")) || 320;
  });
  const [discussionWidth, setDiscussionWidth] = useState(() => {
    return Number(localStorage.getItem("tech_discussion_discussion_width")) || 340;
  });

  const isResizingProblem = useRef(false);
  const isResizingDiscussion = useRef(false);

  // Room Code Copy State
  const [copiedCode, setCopiedCode] = useState(false);

  // Timer State
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(45 * 60);

  // Real-time socket & presence hook
  const { socket, socketConnected, connectionStatus, peerPresence } = useSocket(
    roomId,
    hasJoinedLobby,
    { hasCamera: mediaPermissions.hasCamera, hasMic: mediaPermissions.hasMic }
  );

  // Sync workspace activity over Socket.IO
  useEffect(() => {
    if (!socket || !socketConnected) return;
    const activityMap = {
      code: "coding",
      canvas: "canvas_editing",
      spec: "notes_editing"
    };
    socket.emit("activity:change", { activity: activityMap[activeWorkspace] || "idle" });
  }, [activeWorkspace, socket, socketConnected]);

  // Yjs CRDT Provider State
  const [yjsProvider, setYjsProvider] = useState(null);

  useEffect(() => {
    if (!roomId || !socket || !socketConnected) return;

    const provider = new YjsSocketProvider(roomId, socket);
    setYjsProvider(provider);

    return () => {
      provider.destroy();
      setYjsProvider(null);
    };
  }, [roomId, socket, socketConnected]);
  // Fetch Session State & LiveKit Token with Refresh Recovery
  useEffect(() => {
    if (!hasJoinedLobby || !roomId) return;

    let isMounted = true;
    setLoading(true);

    async function loadSessionAndMedia() {
      try {
        // 1. Fetch canonical database session state
        const sessionRes = await getTechDiscussionSession(roomId);
        const sessionData = sessionRes?.data || sessionRes;

        if (!isMounted) return;

        if (sessionData?.problem) {
          setProblem(sessionData.problem);
          setCurrentLanguage(sessionData.language || sessionData.problem.defaultLanguage || "javascript");
          if (sessionData.activeWorkspace) {
            setActiveWorkspace(sessionData.activeWorkspace);
          } else if (sessionData.category === "architecture" || sessionData.problem.questionType === "system_design") {
            setActiveWorkspace("canvas");
          }
        }

        if (sessionData?.codeState?.code) {
          setCurrentCode(sessionData.codeState.code);
        } else if (sessionData?.draftCode && sessionData?.language && sessionData.draftCode[sessionData.language]) {
          setCurrentCode(sessionData.draftCode[sessionData.language]);
        }

        if (sessionData?.participants) {
          setParticipants(sessionData.participants);
        }

        if (sessionData?.timeRemainingSeconds !== undefined) {
          setTimeRemainingSeconds(sessionData.timeRemainingSeconds);
        }

        // 2. Fetch WebRTC LiveKit Token seamlessly
        const lkData = await getLiveKitToken(roomId).catch((lkErr) => {
          console.warn("LiveKit media token warning (continuing workspace practice):", lkErr.message);
          return null;
        });

        if (!isMounted) return;

        if (lkData) {
          setRoomData(lkData);
        } else {
          // Soft fallback so room page remains active even if LiveKit server is offline
          setRoomData({
            token: "",
            roomName: `tech-discussion-${roomId}`,
            problem: sessionData.problem,
            participants: sessionData.participants
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error("Session restoration error:", err);
          setError(err.response?.data?.message || err.message || "Failed to restore practice room session.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSessionAndMedia();

    return () => {
      isMounted = false;
    };
  }, [roomId, hasJoinedLobby]);
  // Real-time listener for question change from peer/host
  useEffect(() => {
    if (!socket) return;
    const handleQuestionChange = (data) => {
      if (data?.problem) {
        setProblem(data.problem);
        if (data.code) {
          setCurrentCode(data.code);
        }
        setExecutionResult(null);
        toast.info(`Room advanced to Question #${data.sequence || ""}`);
      }
    };
    socket.on("question:change", handleQuestionChange);
    return () => socket.off("question:change", handleQuestionChange);
  }, [socket]);

  // Debounced auto-save code draft to backend
  useEffect(() => {
    if (!roomId || !currentCode) return;
    const saveTimer = setTimeout(() => {
      saveTechDiscussionDraft(roomId, {
        code: currentCode,
        language: currentLanguage,
        activeWorkspace
      }).catch(() => {});
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [roomId, currentCode, currentLanguage, activeWorkspace]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (!hasJoinedLobby || loading || error || timeRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.info("Session time completed!");
          handleEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasJoinedLobby, loading, error, timeRemainingSeconds]);

  // Resizable panel mouse handlers
  const handleMouseDownProblemResize = (e) => {
    e.preventDefault();
    isResizingProblem.current = true;
    document.addEventListener("mousemove", handleMouseMoveResize);
    document.addEventListener("mouseup", handleMouseUpResize);
  };

  const handleMouseDownDiscussionResize = (e) => {
    e.preventDefault();
    isResizingDiscussion.current = true;
    document.addEventListener("mousemove", handleMouseMoveResize);
    document.addEventListener("mouseup", handleMouseUpResize);
  };

  const handleMouseMoveResize = (e) => {
    if (isResizingProblem.current) {
      const newWidth = Math.max(220, Math.min(e.clientX, 650));
      setProblemWidth(newWidth);
      localStorage.setItem("tech_discussion_problem_width", newWidth);
      window.dispatchEvent(new Event("resize"));
    } else if (isResizingDiscussion.current) {
      const newWidth = Math.max(240, Math.min(window.innerWidth - e.clientX, 650));
      setDiscussionWidth(newWidth);
      localStorage.setItem("tech_discussion_discussion_width", newWidth);
      window.dispatchEvent(new Event("resize"));
    }
  };

  const handleMouseUpResize = () => {
    isResizingProblem.current = false;
    isResizingDiscussion.current = false;
    document.removeEventListener("mousemove", handleMouseMoveResize);
    document.removeEventListener("mouseup", handleMouseUpResize);
    window.dispatchEvent(new Event("resize"));
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRun = async (payload) => {
    if (isRunning || isSubmitting) return;
    try {
      setIsRunning(true);
      const res = await executeTechDiscussionCode(roomId, {
        questionId: payload?.questionId || problem?.id || "question",
        language: payload?.language || currentLanguage,
        code: payload?.code || currentCode
      });
      const resData = res?.data || res;
      setExecutionResult(resData);
      if (resData?.status === "COMPILE_ERROR") {
        toast.error("Compilation Error: Check output panel.");
      } else if (resData?.status === "RUNTIME_ERROR") {
        toast.error("Runtime Error: Check output panel.");
      } else if (resData?.status === "TIMEOUT") {
        toast.error("Execution Timeout exceeded.");
      } else {
        toast.success(`Run completed: ${resData?.passedTests || 0}/${resData?.totalTests || 0} passed`);
      }
    } catch (err) {
      console.error("Run error:", err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to execute code";
      toast.error(msg);
      setExecutionResult({
        status: "EXECUTION_ERROR",
        verdict: "Execution Error",
        stderr: msg,
        message: msg
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async (payload) => {
    if (isRunning || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await executeTechDiscussionCode(roomId, {
        questionId: payload?.questionId || problem?.id || "question",
        language: payload?.language || currentLanguage,
        code: payload?.code || currentCode
      });
      const resData = res?.data || res;
      setExecutionResult(resData);
      if (resData?.status === "SUCCESS" && resData?.allPassed) {
        toast.success("Submission Accepted! All test cases passed.");
      } else if (resData?.verdict) {
        toast.info(`Submission Result: ${resData.verdict}`);
      } else {
        toast.info("Submission processed.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to submit code";
      toast.error(msg);
      setExecutionResult({
        status: "EXECUTION_ERROR",
        verdict: "Submission Error",
        stderr: msg,
        message: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [loadingNext, setLoadingNext] = useState(false);

  const handleNextQuestion = async () => {
    if (loadingNext) return;
    try {
      setLoadingNext(true);
      toast.info("Generating your next interview question with AI...");
      const res = await getNextQuestion(roomId);
      const payload = res?.data || res;

      if (payload?.code === "NO_ELIGIBLE_QUESTION") {
        toast.info(payload.message || "All eligible practice questions for this configuration have been completed in this session.");
        return;
      }

      if (payload?.code === "QUESTION_GENERATION_FAILED") {
        toast.error(payload.message || "AI question generation quality gate failed. Please try again.");
        return;
      }

      const problemData = payload?.problem;
      if (problemData) {
        setProblem(problemData);
        let starter = "";
        if (typeof problemData.starterCode === "object" && problemData.starterCode[currentLanguage]) {
          starter = problemData.starterCode[currentLanguage];
        } else if (typeof problemData.starterCode === "string") {
          starter = problemData.starterCode;
        } else if (payload?.codeState?.code) {
          starter = payload.codeState.code;
        }
        setCurrentCode(starter);
        setExecutionResult(null);
        if (socket) {
          socket.emit("question:change", { roomId, problem: problemData, code: starter, sequence: payload?.questionSequence });
        }
        toast.success(`Advanced to Question #${payload?.questionSequence || ""}: ${problemData.title}`);
        window.dispatchEvent(new Event("resize"));
      } else {
        toast.error("Failed to parse next question data.");
      }
    } catch (err) {
      console.error("Next Question error:", err);
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to load next question";
      toast.error(msg);
    } finally {
      setLoadingNext(false);
    }
  };

  const handleEndSession = async () => {
    try {
      setLoading(true);
      await endTechDiscussionSession(roomId).catch(() => {});
      toast.success("Practice session ended.");
      navigate("/tech-discussion/history");
    } catch (err) {
      console.error("Failed to end session:", err);
      navigate("/tech-discussion/history");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId.toUpperCase());
    setCopiedCode(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!hasJoinedLobby) {
    return (
      <PreJoinLobby
        onJoin={(devices) => {
          if (devices) setMediaPermissions(devices);
          setHasJoinedLobby(true);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold">Connecting to Practice Workspace...</h2>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text p-6">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Practice Room Unavailable</h2>
        <p className="mt-2 text-text-secondary font-medium text-sm text-center max-w-md">{error || "Invalid room session"}</p>
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
            title="Exit Room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-bold text-text flex items-center gap-2">
              Tech Discussion <span className="text-text-secondary font-normal truncate max-w-xs">/ {problem?.title || "Workspace"}</span>
            </h1>
          </div>
        </div>

        {/* Center: Timer & Room Code & Connection */}
        <div className="hidden md:flex items-center gap-4 sm:gap-6">
          {/* Room Code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 bg-bg-secondary hover:bg-border/50 px-2.5 py-1 rounded-lg border border-border transition-colors text-xs font-mono font-bold"
            title="Click to copy Room Code"
          >
            <span>{roomId.slice(0, 8).toUpperCase()}</span>
            {copiedCode ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-text-secondary" />}
          </button>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-2 bg-bg-secondary px-3 py-1 rounded-full border border-border">
            <div
              className={`h-2 w-2 rounded-full ${connectionStatus === "joined"
                  ? "bg-success shadow-sm"
                  : connectionStatus === "reconnecting"
                    ? "bg-warning animate-pulse"
                    : "bg-danger"
                }`}
            />
            <span className="text-[11px] text-text-secondary font-bold uppercase tracking-wider">
              {connectionStatus === "joined"
                ? "Realtime Sync Active"
                : connectionStatus === "reconnecting"
                  ? "Reconnecting..."
                  : "Connecting..."}
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
            onClick={handleNextQuestion}
            disabled={loadingNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
            title="Advance to next question in this practice mode"
          >
            {loadingNext ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loadingNext ? "Generating with AI..." : "Next Question"}
          </button>

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
            End Practice
          </button>
        </div>
      </header>

      {/* REAL-TIME PRESENCE & STATUS SUB-HEADER BAR */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-bg border-b border-border text-xs shrink-0 z-10 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className="font-bold text-text-secondary uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3 text-primary" /> Active Room Peers ({peerPresence.length || 1})
          </span>
          <div className="flex items-center gap-2">
            {peerPresence.map((p, idx) => {
              const actLabels = {
                coding: "💻 Coding",
                canvas_editing: "🎨 Editing Diagram",
                notes_editing: "📝 Spec Notes",
                idle: "⏳ Idle"
              };
              return (
                <div
                  key={p.socketId || idx}
                  className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-0.5 rounded-full text-[11px] font-medium shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-bold text-text">{p.userName || "Peer Candidate"}</span>
                  <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.2 rounded-md">
                    {actLabels[p.activity] || "💻 Coding"}
                  </span>
                  <div className="flex items-center gap-1 ml-1 border-l border-border pl-1.5 text-text-secondary">
                    {p.hasMic ? <Mic className="w-3 h-3 text-success" /> : <MicOff className="w-3 h-3 text-text-secondary" />}
                    {p.hasCamera ? <Video className="w-3 h-3 text-success" /> : <VideoOff className="w-3 h-3 text-text-secondary" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reconnection / Connection Status Alert */}
        {connectionStatus === "reconnecting" && (
          <div className="flex items-center gap-1.5 text-warning font-semibold text-[11px] bg-warning-bg px-2.5 py-0.5 rounded-md border border-warning/30">
            <Loader2 className="w-3 h-3 animate-spin" /> Connection lost. Reconnecting socket...
          </div>
        )}
      </div>

      {/* MAIN WORKSPACE BODY */}
      <LiveKitRoom
        token={roomData.token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || roomData.livekitUrl}
        connect={Boolean(roomData.token)}
        audio={mediaPermissions.hasMic}
        video={mediaPermissions.hasCamera}
        className="flex flex-1 overflow-hidden relative bg-bg"
      >
        <LiveKitErrorBoundary>

          {/* FLOATING MINIMIZABLE VIDEO PANEL */}
          {!isVideoMinimized && (
            <div className="absolute top-3 right-4 z-30 w-72 bg-surface/95 backdrop-blur border border-border rounded-2xl shadow-2xl p-2 space-y-2 fade-in">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border text-xs font-bold text-text-secondary">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Peer Stream</span>
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
          <div className="flex flex-1 w-full h-full overflow-hidden relative">

            {/* LEFT COLUMN: SCENARIO / PROBLEM PANEL */}
            {!isFullscreenWorkspace && (
              <section
                style={{ width: isProblemCollapsed ? "44px" : `${problemWidth}px` }}
                className="flex flex-col bg-surface border-r border-border shrink-0 transition-all duration-75 relative overflow-hidden"
              >
                {isProblemCollapsed ? (
                  <button
                    onClick={() => setIsProblemCollapsed(false)}
                    className="flex flex-col items-center py-4 gap-4 text-text-secondary hover:text-text h-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                    <span className="writing-mode-vertical text-xs font-bold tracking-widest uppercase text-primary">Scenario Prompt</span>
                  </button>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-primary" /> Scenario Prompt
                      </span>
                      <button onClick={() => setIsProblemCollapsed(true)} className="p-1 hover:bg-border rounded text-text-secondary">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {problem ? (
                        <QuestionPanel question={problem} />
                      ) : (
                        <div className="p-4 text-xs text-text-secondary">Loading scenario prompt...</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* RESIZABLE DIVIDER 1 */}
            {!isFullscreenWorkspace && !isProblemCollapsed && (
              <div
                onMouseDown={handleMouseDownProblemResize}
                className="w-1 hover:w-1.5 bg-border hover:bg-primary cursor-col-resize z-10 transition-all shrink-0"
              />
            )}

            {/* MIDDLE COLUMN: MULTI-TOOL WORKSPACE */}
            <section className="flex-1 flex flex-col min-w-0 bg-surface overflow-hidden relative">

              {/* Workspace Mode Bar: Code | Architectural Canvas | Spec Notes */}
              <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveWorkspace("code")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeWorkspace === "code" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text hover:bg-bg"
                      }`}
                  >
                    <Terminal className="w-3.5 h-3.5" /> Code Editor
                  </button>

                  <button
                    onClick={() => setActiveWorkspace("canvas")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeWorkspace === "canvas" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text hover:bg-bg"
                      }`}
                  >
                    <Layout className="w-3.5 h-3.5 text-warning" /> Architecture Canvas
                  </button>

                  <button
                    onClick={() => setActiveWorkspace("spec")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeWorkspace === "spec" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text hover:bg-bg"
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-success" /> System Spec Notes
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFullscreenWorkspace(!isFullscreenWorkspace)}
                    className="p-1 hover:bg-bg rounded text-text-secondary hover:text-text transition-colors"
                    title={isFullscreenWorkspace ? "Exit Fullscreen" : "Fullscreen Workspace"}
                  >
                    {isFullscreenWorkspace ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  <div className="flex items-center gap-2 text-xs text-text-secondary border-l border-border pl-3">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Yjs CRDT Sync
                  </div>
                </div>
              </div>

              {/* Multi-Tool Canvas / Editor Container */}
              <div className="flex-1 relative overflow-hidden">
                {activeWorkspace === "code" ? (
                  <CodeEditor
                    question={problem}
                    sessionId={roomId}
                    mode="peer"
                    socket={socket}
                    yjsProvider={yjsProvider}
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
                ) : activeWorkspace === "canvas" ? (
                  <div className="h-full w-full absolute inset-0">
                    <ArchitecturalCanvas
                      socket={socket}
                      yjsProvider={yjsProvider}
                      initialElements={problem?.starterCanvasElements || []}
                      isReadOnly={false}
                    />
                  </div>
                ) : (
                  /* Spec Notes Workspace */
                  <div className="flex flex-col h-full w-full p-4 bg-bg font-mono">
                    <textarea
                      value={specNotes}
                      onChange={(e) => setSpecNotes(e.target.value)}
                      placeholder="Write system architecture specs, API endpoints, data flow, and trade-off notes here..."
                      className="w-full h-full bg-surface border border-border rounded-xl p-4 text-xs text-text outline-none focus:border-primary transition-all resize-none"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* RESIZABLE DIVIDER 2 */}
            {!isFullscreenWorkspace && !isDiscussionCollapsed && (
              <div
                onMouseDown={handleMouseDownDiscussionResize}
                className="w-1 hover:w-1.5 bg-border hover:bg-primary cursor-col-resize z-10 transition-all shrink-0"
              />
            )}

            {/* RIGHT COLUMN: DISCUSSION & AI FACILITATOR PANEL */}
            {!isFullscreenWorkspace && (
              <section
                style={{ width: isDiscussionCollapsed ? "44px" : `${discussionWidth}px` }}
                className="flex flex-col bg-surface border-l border-border shrink-0 transition-all duration-75 relative overflow-hidden"
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
                        <Sparkles className="w-3.5 h-3.5 text-warning" /> AI Facilitator
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
            )}
          </div>
        </LiveKitErrorBoundary>
      </LiveKitRoom>
    </div>
  );
}
