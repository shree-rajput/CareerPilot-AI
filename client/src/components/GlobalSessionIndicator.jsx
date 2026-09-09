import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MessageSquare, ArrowRight, XCircle, Clock, Radio } from "lucide-react";
import { useActiveSession } from "../context/ActiveSessionContext";
import { Button } from "./ui/Button";
import api from "../api/axios";

export function GlobalSessionIndicator() {
  const { activeSession, refreshActiveSession, clearActiveSession } = useActiveSession();
  const location = useLocation();
  const navigate = useNavigate();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ending, setEnding] = useState(false);

  // Timer logic
  useEffect(() => {
    if (!activeSession?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.startedAt).getTime();
    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startedAt]);

  if (!activeSession) return null;

  // Check if current route matches the active session route
  const currentPath = location.pathname;
  const isCurrentlyInSession = activeSession.route && currentPath.startsWith(activeSession.route);

  // Do not render the global floating banner if the candidate is already on the session page
  if (isCurrentlyInSession) return null;

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResume = () => {
    if (activeSession.route) {
      navigate(activeSession.route);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end your active session?")) return;
    setEnding(true);
    try {
      if (activeSession.type === "ai_interview" && activeSession.sessionId) {
        await api.post(`/interview/${activeSession.sessionId}/complete`);
      } else if (activeSession.type === "tech_discussion" && activeSession.roomId) {
        await api.post(`/tech-discussion/${activeSession.roomId}/end`);
      }
    } catch (err) {
      console.warn("Failed to complete session gracefully:", err);
    } finally {
      clearActiveSession();
      refreshActiveSession();
      setEnding(false);
    }
  };

  const isInterview = activeSession.type === "ai_interview";

  return (
    <div className="bg-gradient-to-r from-primary-bg via-surface to-primary-bg border-b border-primary-border/60 px-4 py-2.5 shadow-xs z-30 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
            {isInterview ? <Mic size={16} className="animate-pulse" /> : <MessageSquare size={16} className="animate-pulse" />}
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="text-xs font-bold text-text flex items-center gap-1.5">
              {activeSession.title || (isInterview ? "AI Interview Session" : "Tech Discussion Room")}
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-wider flex items-center gap-1">
                <Radio size={10} className="animate-pulse" /> Active
              </span>
              <span className="text-[11px] font-mono font-medium text-text-secondary flex items-center gap-1">
                <Clock size={12} className="text-text-muted" /> {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="xs"
            variant="primary"
            onClick={handleResume}
            className="flex items-center gap-1.5 font-bold shadow-2xs"
          >
            <span>Resume {isInterview ? "Interview" : "Room"}</span>
            <ArrowRight size={13} />
          </Button>

          <Button
            size="xs"
            variant="outline"
            onClick={handleEndSession}
            disabled={ending}
            className="flex items-center gap-1 text-danger border-danger/30 hover:bg-danger-bg text-[11px]"
          >
            <XCircle size={13} />
            <span>End</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
