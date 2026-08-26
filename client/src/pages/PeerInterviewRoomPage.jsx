import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer, GridLayout, ParticipantTile, TrackToggle, useConnectionState, ConnectionState, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import CodeEditor from "../components/interview/CodeEditor/CodeEditor.jsx";
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
           <div className="max-w-md bg-[#151B2B] p-6 rounded-xl border border-red-500/30">
             <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
             <h2 className="text-xl font-bold mb-2 text-white">Video Interface Error</h2>
             <p className="text-gray-400 mb-4 text-sm">{this.state.error?.message || "An unexpected error occurred in the video layout."}</p>
             <button
               onClick={() => this.setState({ hasError: false, error: null })}
               className="rounded bg-white/10 px-4 py-2 hover:bg-white/20 text-white text-sm"
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
  myName, otherName, myInitials, otherInitials
}) {
  const roomState = useConnectionState();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  // Guard: don't render tracks if not connected
  if (roomState !== ConnectionState.Connected) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-gray-400">
           <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
           <p>Connecting to media server...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RoomAudioRenderer />
      {/* Left Column: Video & Controls (approx 340px) */}
      <section className="w-[340px] flex flex-col gap-2 shrink-0">
        
        {/* Top: Videos Container */}
        <div className="flex flex-col bg-[#151B2B] rounded-xl border border-[#2A3143] overflow-hidden flex-none">
          <div className="px-4 py-2 border-b border-[#2A3143]">
            <span className="text-xs font-semibold text-gray-300">Participants (2)</span>
          </div>
          
          <div className="h-[320px] relative bg-[#0B0F19]">
             {tracks.length === 0 ? (
               <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                 Waiting for video streams...
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
        <div className="flex flex-col bg-slate-900/50 rounded-xl border border-slate-700/50 p-3 gap-3 flex-none glass-dark">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-inner">
                   <span className="text-xs font-bold text-blue-400">{myInitials}</span>
                 </div>
                 <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-semibold text-white tracking-tight">{myName} <span className="text-slate-400 font-normal">(You)</span></span>
                       <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                         {liveKitData?.role || "INTERVIEWER"}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                 <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </div>
           </div>

           <div className="h-px w-full bg-slate-800/50"></div>

           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                   <span className="text-xs font-bold text-indigo-400">{otherInitials}</span>
                 </div>
                 <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-semibold text-white tracking-tight">
                         {otherName || "Waiting..."}
                       </span>
                       <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                         {liveKitData?.role === "interviewer" ? "INTERVIEWEE" : "INTERVIEWER"}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                 {otherName ? (
                   <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                 ) : (
                   <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                 )}
              </div>
           </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between bg-[#151B2B] rounded-xl border border-[#2A3143] p-3 flex-none mt-auto">
           <div className="flex flex-col">
             <span className="text-[11px] font-semibold text-white">Connection</span>
             <span className="text-[10px] text-gray-500 mt-0.5">Latency: 28ms</span>
           </div>
           <div className="flex items-center gap-1.5">
             <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
             <span className="text-xs text-green-500 font-medium">Excellent</span>
           </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex justify-between items-center mt-1">
           <TrackToggle 
             source={Track.Source.Microphone} 
             className="flex flex-col items-center justify-center bg-[#151B2B] hover:bg-[#1E2638] border border-[#2A3143] hover:border-gray-500 transition-colors w-[60px] h-[60px] rounded-xl text-gray-300"
           >
             <span className="text-[10px] mt-1 font-medium">Mic</span>
           </TrackToggle>
           <TrackToggle 
             source={Track.Source.Camera} 
             className="flex flex-col items-center justify-center bg-[#151B2B] hover:bg-[#1E2638] border border-[#2A3143] hover:border-gray-500 transition-colors w-[60px] h-[60px] rounded-xl text-gray-300"
           >
             <span className="text-[10px] mt-1 font-medium">Camera</span>
           </TrackToggle>
           <TrackToggle 
             source={Track.Source.ScreenShare} 
             className="flex flex-col items-center justify-center bg-[#151B2B] hover:bg-[#1E2638] border border-[#2A3143] hover:border-gray-500 transition-colors w-[60px] h-[60px] rounded-xl text-gray-300"
           >
             <span className="text-[10px] mt-1 font-medium">Screen</span>
           </TrackToggle>
           <button className="flex flex-col items-center justify-center bg-[#151B2B] hover:bg-[#1E2638] border border-[#2A3143] hover:border-gray-500 transition-colors w-[60px] h-[60px] rounded-xl text-gray-300">
             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             <span className="text-[10px] font-medium">Set.</span>
           </button>
           <button onClick={handleLeave} className="flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors w-[60px] h-[60px] rounded-xl text-red-400">
             <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
             <span className="text-[10px] font-medium">Leave</span>
           </button>
        </div>
      </section>

      {/* Middle Column: Problem & Editor */}
      <section className="flex-1 flex flex-col min-w-0 bg-[#151B2B] rounded-xl border border-[#2A3143] overflow-hidden">
        
        {/* Top Half: Problem Description */}
        <div className="h-[35%] min-h-[250px] flex flex-col border-b border-[#2A3143]">
           {codingQuestion ? (
              <QuestionPanel question={codingQuestion} />
           ) : (
              <div className="flex h-full items-center justify-center text-gray-500 p-6 text-center text-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500/50" />
                  <span>Waiting for coding question to be selected...</span>
                </div>
              </div>
           )}
        </div>

        {/* Bottom Half: Code Editor */}
        <div className="flex-1 flex flex-col relative bg-[#0B0F19]">
          {codingLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-500" />
              <p className="font-medium tracking-wide">Initializing workspace...</p>
            </div>
          ) : codingError ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-red-500/50" />
              <p className="text-red-400 font-medium">{codingError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 rounded-lg bg-white/5 border border-[#2A3143] px-6 py-2.5 hover:bg-white/10 text-sm font-medium transition-all"
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
              onChange={(code, metadata) => {
                setCurrentCode(code);
                if (metadata?.language) {
                  setCurrentLanguage(metadata.language);
                }
              }}
              editorOptions={{ theme: "vs-dark" }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-8 w-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                <p>No active coding session.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right Column: AI Assistant & Review */}
      <section className="w-[360px] xl:w-[400px] flex flex-col shrink-0 bg-[#151B2B] rounded-xl border border-[#2A3143] overflow-hidden">
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


  const handleRun = async (payload) => {
    console.log("Run code:", payload);
  };

  const handleSubmit = async (payload) => {
    console.log("Submit code:", payload);
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
        <h2 className="text-xl font-semibold">Please wait...</h2>
      </div>
    );
  }

  // Error state
  if (error || (!loading && !liveKitData)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-red-400">Failed to join interview</h2>
        <p className="mt-2 text-gray-400">{error || "Invalid interview session"}</p>
        <button
          onClick={handleLeave}
          className="mt-6 flex items-center rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#0B0F19] text-white overflow-hidden font-sans">
      {/* Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20">
            CP
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
            CareerPilot AI <span className="text-slate-600">/</span> <span className="text-slate-400 font-medium">Peer Interview</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-10">
          {/* Room Code */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Room Code</span>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-blue-400 text-slate-300 transition-colors bg-slate-800 px-2 py-0.5 rounded-md">
              <span className="text-xs font-mono font-medium">{roomId.slice(0, 8).toUpperCase()}</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
          </div>

          {/* Connection */}
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
            <div className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse"}`}></div>
            <span className="text-xs text-slate-300 font-medium">
              {socketConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Session Time</span>
            <span className="text-sm font-mono font-bold text-slate-100">{formattedTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* User Info */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">You</span>
               <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {liveKitData?.role || "INTERVIEWER"}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{myName}</span>
               </div>
            </div>
            
            <div className="h-8 w-px bg-slate-700"></div>
            
            <div className="flex flex-col items-start">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Partner</span>
               <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {liveKitData?.role === "interviewer" ? "INTERVIEWEE" : "INTERVIEWER"}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{otherName || "Waiting..."}</span>
               </div>
            </div>
          </div>

          {/* Leave Button */}
          <button
            onClick={liveKitData?.role === "interviewer" ? handleEndInterview : handleLeave}
            className="flex items-center gap-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-400 transition-all hover:shadow-[0_0_12px_rgba(244,63,94,0.2)]"
          >
            Leave <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </header>

      {/* Notification Banner for Media Errors */}
      {mediaError && (
        <div className="flex items-center justify-center bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-500 px-4 py-2 text-xs">
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
        className="flex flex-1 overflow-hidden p-2 gap-2 z-10 w-full"
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
          />
        </LiveKitErrorBoundary>
      </LiveKitRoom>
    </div>
  );
}
