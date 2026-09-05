import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTechDiscussionHistory } from "../api/techDiscussion";
import {
  Code2,
  Clock,
  Users,
  Calendar,
  Award,
  ChevronRight,
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Filter
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function TechDiscussionHistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getTechDiscussionHistory(page, 20)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setHistory(data.history || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        console.error("Failed to load Tech Discussion history:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page]);

  const filteredHistory = history.filter((item) => {
    if (filterCategory === "all") return true;
    return item.category === filterCategory;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent Session";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDuration = (mins, secs) => {
    if (mins) return `${mins} mins`;
    if (secs) return `${Math.ceil(secs / 60)} mins`;
    return "30 mins";
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/tech-discussion")}
            className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-text transition-colors"
            title="Back to Tech Discussion Setup"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
              Session Portfolio
            </span>
            <h1 className="text-xl font-bold text-text m-0 tracking-tight">Tech Discussion History</h1>
            <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
              Review your previous live practice sessions, technical questions attempted, code submissions, and multi-dimensional evaluations.
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/tech-discussion")}
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Code2 className="w-4 h-4" /> New Practice Room
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter Mode:</span>
          {["all", "coding", "interview", "architecture"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all capitalize ${
                filterCategory === cat
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-surface text-text-secondary hover:text-text border border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="text-xs font-medium text-text-secondary">
          Showing {filteredHistory.length} of {total} sessions
        </span>
      </div>

      {/* History List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-semibold text-text-secondary">Loading session history...</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <Card className="p-8 text-center bg-surface border border-border">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text">No Practice Sessions Recorded Yet</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Start your first collaborative coding or technical interview session to record evidence-based performance insights.
            </p>
            <Button onClick={() => navigate("/tech-discussion")} size="sm" className="mt-2">
              Start Practice Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((session) => (
            <Card key={session.roomId} className="hover:border-primary-border/60 transition-all shadow-2xs">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {session.category}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bg border border-border text-text-secondary">
                      {session.difficulty}
                    </span>
                    <span className="text-[10px] font-medium text-text-secondary flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-secondary" /> {formatDate(session.startedAt)}
                    </span>
                    <span className="text-[10px] font-medium text-text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-secondary" /> {formatDuration(session.durationMinutes, session.durationSeconds)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-text m-0">{session.title}</h3>

                  {/* Participants Snapshot */}
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-text">Peers:</span>
                    <div className="flex items-center gap-1.5">
                      {session.participants?.map((p, idx) => (
                        <span key={idx} className="bg-bg border border-border px-2 py-0.5 rounded-md text-[11px] font-medium text-text">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Questions & Submissions summary */}
                  <div className="flex items-center gap-4 text-[11px] text-text-secondary pt-1">
                    <span>
                      📋 Questions Attempted: <strong className="text-text">{session.questionSequence || 1}</strong>
                    </span>
                    <span>
                      ✅ Questions Solved: <strong className="text-success">{session.completedQuestions || 0}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success-bg px-2.5 py-1 rounded-full border border-green-200">
                    Completed
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      onClick={() => navigate(`/tech-discussion/${session.roomId}`)}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-enter Session
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
