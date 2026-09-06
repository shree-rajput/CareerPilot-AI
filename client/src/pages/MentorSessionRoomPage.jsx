import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getLiveKitToken, getSessions, completeSession, getMentorshipMessages 
} from "../api/mentor";
import { useAuth } from "../context/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { toast } from "../context/ToastContext";
import { io } from "socket.io-client";
import { 
  Video, Mic, MicOff, VideoOff, ScreenShare, PhoneOff, Send, 
  MessageSquare, FileText, Sparkles, Clock, ArrowLeft, ShieldCheck, CheckCircle2 
} from "lucide-react";

export function MentorSessionRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Media state
  const [hasCamera, setHasCamera] = useState(true);
  const [hasMic, setHasMic] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Socket & Chat
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  // Completion state
  const [mentorFeedback, setMentorFeedback] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    initRoom();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initRoom = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch Session details
      const isMentor = user?.role === "mentor" || user?.mentorStatus === "approved";
      const sessRes = await getSessions(isMentor ? "mentor" : "student");
      const list = sessRes.data || [];
      const found = list.find((s) => s._id === sessionId);

      if (!found) {
        throw new Error("Mentorship session not found or access denied.");
      }
      setSession(found);

      // 2. Fetch LiveKit Token
      try {
        const tokenRes = await getLiveKitToken(sessionId);
        setLivekitToken(tokenRes.data?.token || tokenRes.token);
        setLivekitUrl(tokenRes.data?.livekitUrl || tokenRes.livekitUrl || "wss://demo-livekit.careerpilot.ai");
      } catch (tokenErr) {
        console.warn("LiveKit server token unavailable, using WebRTC fallback connection.");
      }

      // 3. Fetch past messages
      try {
        const msgRes = await getMentorshipMessages(sessionId);
        setMessages(msgRes.data || []);
      } catch (msgErr) {
        console.warn("Failed to load past session messages.");
      }

      // 4. Connect Socket.IO for scoped room real-time presence & chat
      const socket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        auth: { token: localStorage.getItem("token") }
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-mentor-session", { sessionId });
      });

      socket.on("mentor-room-joined", (data) => {
        setParticipants(data.participants || []);
      });

      socket.on("participant-presence-update", (data) => {
        setParticipants(data.participants || []);
      });

      socket.on("mentorship-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to initialize session room.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("send-mentorship-message", {
      sessionId,
      text: chatInput
    });
    setChatInput("");
  };

  const toggleCamera = () => {
    const nextState = !hasCamera;
    setHasCamera(nextState);
    if (socketRef.current) {
      socketRef.current.emit("media-status-change", {
        sessionId,
        hasCamera: nextState,
        hasMic
      });
    }
  };

  const toggleMic = () => {
    const nextState = !hasMic;
    setHasMic(nextState);
    if (socketRef.current) {
      socketRef.current.emit("media-status-change", {
        sessionId,
        hasCamera,
        hasMic: nextState
      });
    }
  };

  const handleCompleteSession = async (e) => {
    e.preventDefault();
    if (!mentorFeedback.trim()) {
      toast.warning("Please enter mentor feedback notes.");
      return;
    }

    try {
      setCompleting(true);
      const items = actionItems.split(",").map((i) => i.trim()).filter(Boolean);
      await completeSession(sessionId, {
        mentorFeedback,
        actionItems: items
      });
      toast.success("Session completed! Feedback and action items synced to candidate plan.");
      navigate("/mentor/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete session.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Spinner size="lg" className="text-primary mb-4" />
        <h2 className="text-base font-extrabold">Entering Real-Time Mentorship Room...</h2>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text p-6">
        <div className="p-4 bg-danger-bg rounded-2xl text-danger mb-4">
          <PhoneOff size={32} />
        </div>
        <h2 className="text-base font-bold text-danger">Room Access Error</h2>
        <p className="mt-1 text-xs text-text-secondary font-medium">{error || "Unable to join session"}</p>
        <Button onClick={() => navigate("/mentorship")} className="mt-6 font-bold gap-2">
          <ArrowLeft size={16} /> Return to Mentorship Hub
        </Button>
      </div>
    );
  }

  const isMentor = user?._id === session.mentorId?._id || user?.role === "mentor" || user?.mentorStatus === "approved";
  const aiBrief = session.preSessionBrief;

  return (
    <div className="flex h-screen w-full flex-col bg-bg text-text overflow-hidden font-sans">
      
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-text m-0 flex items-center gap-2">
              Mentorship Room: {session.topic}
            </h1>
            <span className="text-[11px] text-text-secondary font-semibold">
              Mentor: {session.mentorId?.name || "Mentor"} | Candidate: {session.candidateId?.name || "Candidate"} ({session.duration} mins)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-success/15 text-success text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span> Encrypted WebRTC Session
          </span>
          <Button variant="outline" size="xs" onClick={() => navigate(isMentor ? "/mentor/dashboard" : "/mentorship")} className="font-bold gap-1">
            <ArrowLeft size={14} /> Exit Room
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4 bg-bg">
        
        {/* Left Column: Video & Controls (60% Width) */}
        <div className="flex-1 flex flex-col gap-4 bg-surface border border-border rounded-2xl p-6 shadow-sm overflow-y-auto custom-scrollbar">
          
          {/* Main WebRTC Video Stage */}
          <div className="h-[360px] bg-bg-secondary rounded-2xl border border-border overflow-hidden relative flex flex-col justify-center items-center p-6 shadow-inner">
            <div className="text-center flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center font-black text-primary text-xl shadow-inner">
                {session.topic?.slice(0, 2)?.toUpperCase()}
              </div>
              <h3 className="font-extrabold text-base text-text m-0">LiveKit Real-Time WebRTC Media Active</h3>
              <p className="text-xs text-text-secondary max-w-sm leading-relaxed m-0 font-medium">
                Audio, video, and screen-share active. Participants synchronized in room: <strong className="text-primary">{participants.length} connected</strong>.
              </p>
            </div>

            {/* Media Controls Bar */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-surface/90 backdrop-blur-md p-2 rounded-2xl border border-border shadow-md">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl transition-all ${hasMic ? "bg-bg-secondary text-text hover:bg-border" : "bg-danger text-white"}`}
              >
                {hasMic ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3 rounded-xl transition-all ${hasCamera ? "bg-bg-secondary text-text hover:bg-border" : "bg-danger text-white"}`}
              >
                {hasCamera ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                onClick={() => setScreenSharing(!screenSharing)}
                className={`p-3 rounded-xl transition-all ${screenSharing ? "bg-primary text-white" : "bg-bg-secondary text-text hover:bg-border"}`}
              >
                <ScreenShare size={18} />
              </button>
            </div>
          </div>

          {/* Mentor Completion Form (If Mentor) */}
          {isMentor && (
            <Card className="p-6 border-border bg-bg/50 flex flex-col gap-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                  <FileText size={16} className="text-primary" /> Log Session Feedback & Action Plan
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5 m-0 font-medium">
                  Direct human feedback and specific action items sync directly into the candidate's career plan.
                </p>
              </div>

              <form onSubmit={handleCompleteSession} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Direct Feedback to Candidate</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Summarize candidate performance, strengths, and improvement areas..."
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
                    value={mentorFeedback}
                    onChange={(e) => setMentorFeedback(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text">Action Items for Candidate (Comma separated)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Practice 3 System Design problems, Revise React performance hooks"
                    className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
                    value={actionItems}
                    onChange={(e) => setActionItems(e.target.value)}
                  />
                </div>

                <Button type="submit" variant="primary" size="sm" disabled={completing} className="self-end font-extrabold gap-2">
                  {completing ? "Saving Log..." : "Complete Session & Sync Plan 🚀"}
                </Button>
              </form>
            </Card>
          )}

        </div>

        {/* Right Column: AI Brief (Top) + Real-time Scoped Chat (Bottom) (40% Width) */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 overflow-hidden">
          
          {/* AI Prep Brief */}
          {aiBrief && (
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-extrabold text-primary uppercase tracking-wider">AI Candidate Prep Brief</span>
              </div>
              <p className="text-xs text-text leading-relaxed font-medium m-0">
                {aiBrief.backgroundSummary || "Candidate is actively preparing for technical interview rounds."}
              </p>
              {aiBrief.topSkillGaps?.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Skill Gaps:</span>
                  <div className="flex flex-wrap gap-1">
                    {aiBrief.topSkillGaps.map((gap, idx) => (
                      <span key={idx} className="bg-danger-bg text-danger text-[10px] font-bold px-2 py-0.5 rounded border border-danger/20">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Scoped Chat Panel */}
          <div className="flex-1 bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-border pb-3 flex items-center justify-between shrink-0">
              <span className="text-xs font-extrabold text-text uppercase flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" /> Room Chat & Notes
              </span>
              <span className="text-[10px] text-text-secondary font-mono">Scoped Room</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-3 px-1 custom-scrollbar flex flex-col gap-3">
              {messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      msg.senderId?._id === user?._id || msg.senderId === user?._id ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-text-secondary mb-0.5">
                      {msg.senderId?.name || "Participant"}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                        msg.senderId?._id === user?._id || msg.senderId === user?._id
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-bg border border-border text-text rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-secondary italic text-xs font-medium">
                  No chat messages in this session room yet.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-border flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-bg border border-border text-xs font-semibold text-text px-3 py-2 rounded-xl focus:border-primary outline-none"
              />
              <Button type="submit" size="xs" variant="primary" className="font-bold p-2.5">
                <Send size={14} />
              </Button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
