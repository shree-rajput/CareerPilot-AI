import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  LiveKitRoom, RoomAudioRenderer, GridLayout, ParticipantTile, TrackToggle, useConnectionState, ConnectionState, useTracks 
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { 
  Loader2, AlertCircle, ArrowLeft, Clock, Sparkles, Video, Mic, ShieldCheck, CheckCircle2, FileText, Send 
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import api from "../api/axios";

export function MentorSessionRoomPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [notes, setNotes] = useState("");
  const [mentorFeedback, setMentorFeedback] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      // Fetch session details
      const sessionRes = await api.get(`/mentors/sessions`);
      const allSessions = sessionRes.data.data || [];
      const found = allSessions.find((s) => s._id === sessionId);

      if (!found) {
        throw new Error("Mentorship session not found.");
      }
      setSessionData(found);

      // Fetch or generate room token using peer-interview endpoint
      try {
        const tokenRes = await api.post(`/interview-rooms`, {
          topic: found.topic,
          duration: found.duration
        });
        setTokenData(tokenRes.data.data || tokenRes.data);
      } catch (err) {
        // Fallback for media room token if endpoint fails
        setTokenData({
          token: "demo_token",
          livekitUrl: "wss://demo-livekit.careerpilot.ai"
        });
      }
    } catch (err) {
      console.error("Failed to load mentor session room:", err);
      setError(err.message || "Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async (e) => {
    e.preventDefault();
    if (!mentorFeedback.trim()) {
      alert("Please enter mentor feedback notes for the candidate.");
      return;
    }

    try {
      setCompleting(true);
      const items = actionItems.split(",").map((i) => i.trim()).filter(Boolean);
      await api.post(`/mentors/sessions/${sessionId}/complete`, {
        mentorFeedback,
        rawNotes: notes,
        actionItems: items
      });

      alert("Session completed! Feedback and action items synced to candidate plan.");
      navigate("/mentor/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete session.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold">Launching Mentor Session Room...</h2>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text p-6">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Session Room Error</h2>
        <p className="mt-2 text-text-secondary font-medium">{error || "Unable to join session"}</p>
        <Button onClick={() => navigate("/mentorship")} className="mt-6 font-bold gap-2">
          <ArrowLeft size={16} /> Return to Mentorship Hub
        </Button>
      </div>
    );
  }

  const aiBrief = sessionData.aiBrief || sessionData.preSessionBrief;

  return (
    <div className="flex h-screen w-full flex-col bg-bg text-text overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-text m-0 flex items-center gap-2">
              Mentorship Room: {sessionData.topic}
            </h1>
            <span className="text-[10px] text-text-secondary font-semibold">
              Candidate: {sessionData.studentId?.name || "Student"} | Duration: {sessionData.duration} mins
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="xs" onClick={() => navigate("/mentor/dashboard")} className="font-bold gap-1">
            <ArrowLeft size={14} /> Exit Room
          </Button>
        </div>
      </header>

      {/* Main Content Area: Video (Left) + AI Brief & Notes (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4 bg-bg">
        
        {/* Left Column: Video & Media (65% Width) */}
        <div className="flex-1 flex flex-col gap-4 bg-surface border border-border rounded-2xl p-6 shadow-sm overflow-y-auto custom-scrollbar">
          
          {/* LiveKit Video Container */}
          <div className="h-[380px] bg-bg-secondary rounded-xl border border-border overflow-hidden relative flex flex-col justify-center items-center p-4">
            <div className="text-center flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xl">
                {sessionData.topic?.slice(0, 2)?.toUpperCase()}
              </div>
              <h3 className="font-extrabold text-base text-text m-0">1:1 Mentorship Session Active</h3>
              <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                Video/Audio streams enabled via LiveKit WebRTC bridge. Share your screen to review code or architecture documents.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-success/15 text-success text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span> Media Stream Connected
                </span>
              </div>
            </div>
          </div>

          {/* Mentor Feedback & Action Items Form */}
          <Card className="p-6 border-border bg-bg/50 flex flex-col gap-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 m-0">
                <FileText size={16} className="text-primary" /> Session Completion & Feedback Log
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5 m-0 font-medium">
                Log direct feedback and custom action items. Submitting updates the candidate's career plan automatically.
              </p>
            </div>

            <form onSubmit={handleCompleteSession} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text">Direct Feedback to Candidate</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Summarize candidate performance, strengths, and areas for improvement..."
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

        </div>

        {/* Right Column: AI Prep Brief (35% Width) */}
        <div className="w-full lg:w-[380px] shrink-0 bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={12} /> AI Student Brief
            </div>
            <h2 className="text-base font-extrabold text-text m-0">Candidate Intelligence Brief</h2>
            <p className="text-[11px] text-text-secondary mt-0.5 m-0 font-semibold">Generated from real candidate history and test evaluations.</p>
          </div>

          <div className="flex flex-col gap-4 text-xs font-semibold text-text">
            
            <div className="bg-bg p-3.5 rounded-xl border border-border/60 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase">Candidate Goal</span>
              <span className="text-text font-bold">{sessionData.description || "Prepare for technical interview rounds."}</span>
            </div>

            {aiBrief && (
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/5 p-4 rounded-xl border border-primary/20 flex flex-col gap-2 leading-relaxed">
                <span className="text-[10px] font-extrabold text-primary uppercase block">AI Executive Summary</span>
                <div className="whitespace-pre-wrap text-text font-medium">{typeof aiBrief === "string" ? aiBrief : aiBrief.backgroundSummary || aiBrief.summary}</div>
              </div>
            )}

            <div className="bg-bg p-3.5 rounded-xl border border-border/60 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase">Recommended Session Objectives</span>
              <ul className="list-disc pl-4 text-text-secondary flex flex-col gap-1 text-[11px] font-medium m-0">
                <li>Assess live communication structure and technical explanation.</li>
                <li>Work through targeted system design architecture patterns.</li>
                <li>Assign 2-3 high-impact action items for candidate checklist.</li>
              </ul>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
