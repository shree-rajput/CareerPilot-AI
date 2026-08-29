import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer, GridLayout, ParticipantTile, TrackToggle, useConnectionState, ConnectionState, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";
import Whiteboard from "../components/interview/Whiteboard.jsx";
import PreJoinLobby from "../components/interview/PreJoinLobby.jsx";
import QuestionPanel from "../components/interview/QuestionPanel.jsx";
import AIAssistantPanel from "../components/interview/AIAssistantPanel.jsx";
import { Loader2, AlertCircle, ArrowLeft, Clock } from "lucide-react";
import { useSocket } from "../hooks/useSocket.js";
import { useLiveKitRoom } from "../hooks/useLiveKitRoom.js";
import { useCodingQuestion } from "../hooks/useCodingQuestion.js";
import { useTimer } from "../hooks/useTimer.js";

// Error Boundary to prevent white screen on LiveKit component crashes
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
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-danger" />
            <h2 className="text-xl font-bold mb-2 text-text">Video Interface Error</h2>
            <p className="text-text-secondary mb-4 text-sm">{this.state.error?.message || "An unexpected error occurred in the video layout."}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded bg-bg-secondary px-4 py-2 hover:bg-border text-text font-medium text-sm transition-colors"
            >
              Try to Recover
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Inner component for rendering LiveKit layout with safe track fetching
function InterviewRoomLayout({
  liveKitData, roomId, socket, codingQuestion, codingLoading, codingError,
  handleRun, handleSubmit, handleLeave, handleEndInterview,
  currentCode, currentLanguage, setCurrentCode, setCurrentLanguage,
  myName, otherName, myInitials, otherInitials,
  activeTab, setActiveTab, isRunning, isSubmitting, executionResult
}) {
  const roomState = useConnectionState();
  const [connectTime, setConnectTime] = useState(0);
  const [bypassMedia, setBypassMedia] = useState(false);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      setConnectTime(0);
      return;
    }

    const timer = setInterval(() => {
      setConnectTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [roomState]);

  // Guard: don't render tracks if not connected (unless user bypassed media)
  if (roomState !== ConnectionState.Connected && !bypassMedia) {
    let statusText = "Step 1/3: Authorizing Peer Room Credentials...";
    if (connectTime >= 5 && connectTime < 10) {
      statusText = "Step 2/3: Establishing WebRTC Media Bridge...";
    } else if (connectTime >= 10 && connectTime < 15) {
      statusText = "Step 3/3: Synchronizing Workspace & Realtime Socket...";
    }

    if (connectTime >= 15) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center p-6 bg-surface border border-border rounded-xl max-w-md w-full text-center gap-4 shadow-2xl">
            <div className="p-3 bg-warning-bg border border-warning/30 rounded-full text-warning">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-text">Media Connection Timeout</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Could not connect to LiveKit media server within 15 seconds. You can retry the connection or continue in Workspace-Only mode.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-3 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                Retry Connection
              </button>
              <button
                onClick={() => setBypassMedia(true)}
                className="flex-1 px-3 py-2.5 bg-bg-secondary border border-border text-text text-xs font-bold rounded-lg hover:bg-border/40 transition-colors"
              >
                Workspace Mode
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-text-secondary bg-surface border border-border/40 p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-text">{statusText}</p>
            <p className="text-[11px] text-text-secondary">Connecting... ({connectTime}s)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <RoomAudioRenderer />
      {/* Left Column: Video & Controls (approx 340px) */}
      <section className="w-full lg:w-[340px] flex flex-col gap-2 shrink-0 h-[400px] lg:h-auto">

        {/* Top: Videos Container */}
        <div className="flex flex-col bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex-none">
          <div className="px-4 py-2 border-b border-border bg-bg">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Participants (2)</span>
          </div>

          <div className="h-[280px] lg:h-[320px] relative bg-bg-secondary">
            {tracks.length === 0 ? (
              <div className="flex h-full items-center justify-center text-text-secondary text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Waiting for video streams...
              </div>
            ) : (
              <GridLayout
                tracks={tracks}
                className="w-full h-full p-2 gap-2"
              >
                <ParticipantTile />
              </GridLayout>
            )}
          </div>
        </div>

        {/* Middle: Participant List */}
        <div className="flex flex-col bg-surface rounded-xl border border-border shadow-sm p-3 gap-3 flex-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-info-bg border border-blue-200 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-primary">{myInitials}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text tracking-tight">{myName} <span className="text-text-secondary font-normal">(You)</span></span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-bg-secondary text-text-secondary border border-border uppercase tracking-wider">
                    {liveKitData?.role || "INTERVIEWER"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            </div>
          </div>

          <div className="h-px w-full bg-border"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-purple-600">{otherInitials}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text tracking-tight">
                    {otherName || "Waiting..."}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-bg-secondary text-text-secondary border border-border uppercase tracking-wider">
                    {liveKitData?.role === "interviewer" ? "INTERVIEWEE" : "INTERVIEWER"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              {otherName ? (
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between bg-surface rounded-xl border border-border shadow-sm p-3 flex-none mt-auto">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-text uppercase tracking-wider">Connection</span>
            <span className="text-[10px] text-text-secondary mt-0.5">Latency: 28ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span className="text-xs text-success font-bold tracking-wide">Excellent</span>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex justify-between items-center mt-1">
          <TrackToggle
            source={Track.Source.Microphone}
            className="flex flex-col items-center justify-center bg-surface hover:bg-bg border border-border transition-colors w-[60px] h-[60px] rounded-xl text-text-secondary shadow-sm"
          >
            <span className="text-[10px] mt-1 font-bold">Mic</span>
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Camera}
            className="flex flex-col items-center justify-center bg-surface hover:bg-bg border border-border transition-colors w-[60px] h-[60px] rounded-xl text-text-secondary shadow-sm"
          >
            <span className="text-[10px] mt-1 font-bold">Camera</span>
          </TrackToggle>
          <TrackToggle
            source={Track.Source.ScreenShare}
            className="flex flex-col items-center justify-center bg-surface hover:bg-bg border border-border transition-colors w-[60px] h-[60px] rounded-xl text-text-secondary shadow-sm"
          >
            <span className="text-[10px] mt-1 font-bold">Screen</span>
          </TrackToggle>
          <button className="flex flex-col items-center justify-center bg-surface hover:bg-bg border border-border transition-colors w-[60px] h-[60px] rounded-xl text-text-secondary shadow-sm">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="text-[10px] font-bold">Set.</span>
          </button>
          <button onClick={handleLeave} className="flex flex-col items-center justify-center bg-danger-bg hover:bg-danger/20 border border-danger/30 transition-colors w-[60px] h-[60px] rounded-xl text-danger shadow-sm">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span className="text-[10px] font-bold">Leave</span>
          </button>
        </div>
      </section>

      {/* Middle Column: Problem & Editor */}
      <section className="flex-1 flex flex-col min-w-0 bg-surface rounded-xl border border-border shadow-sm overflow-hidden min-h-[500px]">

        {/* Top Half: Problem Description */}
        <div className="h-[35%] min-h-[250px] flex flex-col border-b border-border bg-bg">
          {codingQuestion ? (
            <QuestionPanel question={codingQuestion} />
          ) : (
            <div className="flex h-full items-center justify-center text-text-secondary p-6 text-center text-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="font-medium">Waiting for coding question to be selected...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Half: Workspace */}
        <div className="flex-1 flex flex-col relative bg-bg-secondary">
          {/* Workspace Tabs */}
          <div className="flex items-center gap-4 border-b border-border bg-surface px-4 py-2 shrink-0 shadow-sm z-10">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'code' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text hover:bg-bg'}`}
            >
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${activeTab === 'whiteboard' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text hover:bg-bg'}`}
            >
              Whiteboard
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'code' ? (
              codingLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-text-secondary">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                  <p className="font-bold tracking-wide">Initializing workspace...</p>
                </div>
              ) : codingError ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="mb-4 h-12 w-12 text-danger" />
                  <p className="text-danger font-medium">{codingError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-6 rounded-lg bg-surface border border-border px-6 py-2.5 hover:bg-bg text-sm font-bold transition-all shadow-sm text-text"
                  >
                    Retry Loading Editor
                  </button>
                </div>
              ) : codingQuestion ? (
                <CodeEditor
                  question={codingQuestion}
                  sessionId={roomId}
                  mode="peer"
                  socket={socket}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  executionResult={executionResult}
                  readOnly={liveKitData?.role === "interviewer"}
                  onChange={(code, metadata) => {
                    setCurrentCode(code);
                    if (metadata?.language) {
                      setCurrentLanguage(metadata.language);
                    }
                  }}
                  editorOptions={{ theme: "vs-light" }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-text-secondary">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="h-8 w-8 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    <p className="font-medium">No active coding session.</p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full w-full absolute inset-0">
                <Whiteboard socket={socket} isReadOnly={false} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right Column: AI Assistant & Review */}
      <section className="w-full lg:w-[360px] xl:w-[400px] flex flex-col shrink-0 bg-surface rounded-xl border border-border shadow-sm overflow-hidden h-[400px] lg:h-auto">
        <AIAssistantPanel
          plan={liveKitData?.plan || []}
          roomId={roomId}
          role={liveKitData?.role}
          currentCode={currentCode}
          currentLanguage={currentLanguage}
          question={codingQuestion}
        />
      </section>
    </>
  );
}

export default function PeerInterviewRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [activeTab, setActiveTab] = useState("code");

  const { socket, socketConnected } = useSocket(roomId, hasJoinedLobby);
  const { liveKitData, loading, error } = useLiveKitRoom(roomId, hasJoinedLobby);
  const { codingQuestion, codingLoading, codingError } = useCodingQuestion(roomId, hasJoinedLobby);
  const { elapsedSeconds, formattedTime } = useTimer(hasJoinedLobby);
  const [mediaError, setMediaError] = useState(null);

  // Compute dynamic names
  const isInterviewer = liveKitData?.role === "interviewer";
  const myName = isInterviewer ? (liveKitData?.interviewerName || "Interviewer") : (liveKitData?.intervieweeName || "Interviewee");
  const otherName = isInterviewer ? (liveKitData?.intervieweeName || "Interviewee") : (liveKitData?.interviewerName || "Interviewer");

  const getInitials = (name) => {
    if (!name || name === "Interviewer" || name === "Interviewee") return "NA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const myInitials = getInitials(myName);
  const otherInitials = getInitials(otherName);

  const handleMediaDeviceFailure = (error) => {
    console.warn("LiveKit Media Error:", error);
    if (error?.name === 'NotFoundError' || error?.message?.toLowerCase().includes('not found')) {
      setMediaError("Camera or microphone not found. You have joined in view-only mode.");
    } else if (error?.name === 'NotAllowedError') {
      setMediaError("Camera/microphone permission denied. You can join in view-only mode.");
    } else {
      setMediaError(`Media device error: ${error?.message || "Unknown error"}`);
    }
  };


  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const handleRun = async (payload) => {
    try {
      setIsRunning(true);
      const { executeCode } = await import("../api/peerInterview.js");
      const data = await executeCode(roomId, payload.questionId, payload.language, payload.code);
      setExecutionResult(data.data || data);
    } catch (err) {
      console.error("Run error:", err);
      alert(err.response?.data?.message || "Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      const { executeCode } = await import("../api/peerInterview.js");
      const data = await executeCode(roomId, payload.questionId, payload.language, payload.code);
      setExecutionResult(data.data || data);
      alert(data.data?.passedTests === data.data?.totalTests ? "Submission Successful! All test cases passed." : "Submission processed.");
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.response?.data?.message || "Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndInterview = async () => {
    if (!window.confirm("Are you sure you want to end this interview? A final report will be generated.")) {
      return;
    }

    try {
      setLoading(true);
      await import("../api/http").then(({ http }) => http.post(`/interview-rooms/${roomId}/end`));
      navigate(`/peer-interview/${roomId}/report`);
    } catch (err) {
      console.error("Failed to end interview:", err);
      alert("Failed to end interview.");
      setLoading(false);
    }
  };

  const handleLeave = () => {
    navigate("/peer-interview");
  };

  // Lobby state
  if (!hasJoinedLobby) {
    return <PreJoinLobby onJoin={() => setHasJoinedLobby(true)} />;
  }

  // Full page loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold">Please wait...</h2>
      </div>
    );
  }

  // Error state
  if (error || (!loading && !liveKitData)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Failed to join interview</h2>
        <p className="mt-2 text-text-secondary font-medium">{error || "Invalid interview session"}</p>
        <button
          onClick={handleLeave}
          className="mt-6 flex items-center rounded-lg bg-surface border border-border px-4 py-2 hover:bg-bg shadow-sm transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-bg text-text overflow-hidden font-sans">
      {/* Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-white font-bold text-xs shadow-md">
            CP
          </div>
          <h1 className="text-sm font-bold tracking-wide text-text flex items-center gap-2">
            CareerPilot AI <span className="text-border">/</span> <span className="text-text-secondary font-medium">Peer Interview</span>
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-10">
          {/* Room Code */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-0.5">Room Code</span>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary text-text transition-colors bg-bg-secondary px-2 py-0.5 rounded-md border border-border">
              <span className="text-xs font-mono font-bold">{roomId.slice(0, 8).toUpperCase()}</span>
              <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
          </div>

          {/* Connection */}
          <div className="flex items-center gap-2 bg-bg-secondary px-3 py-1.5 rounded-full border border-border">
            <div className={`h-2 w-2 rounded-full ${socketConnected ? "bg-success shadow-sm" : "bg-warning animate-pulse"}`}></div>
            <span className="text-xs text-text-secondary font-bold">
              {socketConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-0.5">Session Time</span>
            <span className="text-sm font-mono font-bold text-text">{formattedTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* User Info */}
          <div className="hidden lg:flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-0.5">You</span>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-bg-secondary text-text-secondary border border-border uppercase">
                  {liveKitData?.role || "INTERVIEWER"}
                </span>
                <span className="text-sm font-bold text-text">{myName}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-border"></div>

            <div className="flex flex-col items-start">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-0.5">Partner</span>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-bg-secondary text-text-secondary border border-border uppercase">
                  {liveKitData?.role === "interviewer" ? "INTERVIEWEE" : "INTERVIEWER"}
                </span>
                <span className="text-sm font-bold text-text">{otherName || "Waiting..."}</span>
              </div>
            </div>
          </div>

          {/* Leave Button */}
          <button
            onClick={liveKitData?.role === "interviewer" ? handleEndInterview : handleLeave}
            className="flex items-center gap-2 rounded-lg bg-danger-bg hover:bg-danger/20 border border-danger/30 px-4 py-2 text-sm font-bold text-danger transition-all shadow-sm"
          >
            Leave <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </header>

      {/* Notification Banner for Media Errors */}
      {mediaError && (
        <div className="flex items-center justify-center bg-warning-bg border-b border-warning/20 text-warning px-4 py-2 text-xs font-medium shadow-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {mediaError}
        </div>
      )}

      {/* Main Workspace Layout */}
      <LiveKitRoom
        token={liveKitData.token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || liveKitData.livekitUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={handleLeave}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-2 gap-2 z-10 w-full bg-bg"
      >
        <LiveKitErrorBoundary>
          <InterviewRoomLayout
            liveKitData={liveKitData}
            roomId={roomId}
            socket={socket}
            codingQuestion={codingQuestion}
            codingLoading={codingLoading}
            codingError={codingError}
            handleRun={handleRun}
            handleSubmit={handleSubmit}
            handleLeave={handleLeave}
            handleEndInterview={handleEndInterview}
            currentCode={currentCode}
            currentLanguage={currentLanguage}
            setCurrentCode={setCurrentCode}
            setCurrentLanguage={setCurrentLanguage}
            myName={myName}
            otherName={otherName}
            myInitials={myInitials}
            otherInitials={otherInitials}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            executionResult={executionResult}
          />
        </LiveKitErrorBoundary>
      </LiveKitRoom>
    </div>
  );
}
