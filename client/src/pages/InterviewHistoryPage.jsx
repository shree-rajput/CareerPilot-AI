import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { interviewApi } from "../api/interview";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function InterviewHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [progression, setProgression] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchHistory();
  }, [roleFilter, typeFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interviewApi.getHistory({
        role: roleFilter,
        type: typeFilter,
        search: searchQuery
      });
      setSessions(data.sessions || []);
      setProgression(data.progression || null);
    } catch (err) {
      console.error("Failed to load interview history:", err);
      setError("Failed to load interview history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const startNewInterviewWithRole = (session) => {
    navigate(`/interview`, {
      state: {
        targetRole: session.targetRole,
        technologyStack: session.technologyStack,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        candidateExperience: session.candidateExperience || "fresher",
        jobDescription: session.jobDescription || ""
      }
    });
  };

  const getScoreBadgeColor = (score) => {
    if (!score || score === 0) return "bg-surface-hover text-text-muted border-border";
    if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (score >= 65) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles size={14} />
            <span>Practice &amp; Performance System</span>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Interview History &amp; Progress</h1>
          <p className="text-xs text-text-muted mt-1">
            Track your score progression over time, review turn-by-turn replays, and identify recurring weak spots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/preparation")}
            className="flex items-center gap-2 text-xs"
          >
            <BookOpen size={14} />
            <span>Targeted Practice Plan</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/interview")}
            className="flex items-center gap-2 text-xs"
          >
            <Play size={14} />
            <span>Start New Interview</span>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      {progression && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-surface border-border">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold mb-2">
              <span>Total Completed</span>
              <Award size={16} className="text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-text">
              {progression.totalCompleted} <span className="text-xs font-normal text-text-muted">sessions</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {progression.totalCompleted > 0 ? "Preserved with full turn history" : "No sessions completed yet"}
            </p>
          </Card>

          <Card className="p-4 bg-surface border-border">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold mb-2">
              <span>Average Overall Score</span>
              <BarChart2 size={16} className="text-accent-cyan" />
            </div>
            <div className="text-2xl font-extrabold text-text">
              {progression.averageScores?.overall || 0}%
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-text-muted">Tech: {progression.averageScores?.technical || 0}%</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">Comm: {progression.averageScores?.communication || 0}%</span>
            </div>
          </Card>

          <Card className="p-4 bg-surface border-border">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold mb-2">
              <span>Score Progression</span>
              <TrendingUp size={16} className={progression.isImproving ? "text-emerald-400" : "text-amber-400"} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${progression.isImproving ? "text-emerald-400" : "text-text"}`}>
                {progression.scoreDelta > 0 ? `+${progression.scoreDelta}%` : `${progression.scoreDelta}%`}
              </span>
              {progression.hasSufficientData && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progression.isImproving ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>
                  {progression.isImproving ? "Improving" : "Steady"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {progression.hasSufficientData ? "Compared to your initial session" : "Complete 2+ interviews to see trend"}
            </p>
          </Card>

          <Card className="p-4 bg-surface border-border flex flex-col justify-between">
            <div>
              <div className="text-text-muted text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                <span>Next Practice Focus</span>
              </div>
              <p className="text-xs font-medium text-text leading-snug line-clamp-2">
                {progression.recommendedNextStep}
              </p>
            </div>
            <button
              onClick={() => navigate("/preparation")}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 mt-2 text-left"
            >
              <span>Open Preparation Plan</span>
              <ArrowRight size={12} />
            </button>
          </Card>
        </div>
      )}

      {/* Recurring Weakness Alert Box */}
      {progression?.recurringWeaknesses?.length > 0 && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20 text-text">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Recurring Weak Areas Detected Across Repeated Sessions
              </h4>
              <p className="text-xs text-text-secondary">
                The AI Interviewer identified these concepts as recurring gaps in your recent answers:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {progression.recurringWeaknesses.map((item, idx) => (
                  <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2.5 py-1 rounded-md text-xs font-medium">
                    ⚠️ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search & Filter Bar */}
      <Card className="p-4 bg-surface border-border">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by role or tech stack (e.g. React, Node.js)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder-text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text outline-none"
            >
              <option value="">All Types</option>
              <option value="technical">Technical Only</option>
              <option value="mixed">Mixed (Tech + HR)</option>
              <option value="hr">Behavioral / HR</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text outline-none"
            >
              <option value="">All Roles</option>
              <option value="Software Engineer">Software Engineer</option>
              <option value="Frontend">Frontend Developer</option>
              <option value="Backend">Backend Developer</option>
              <option value="Fullstack">Fullstack Developer</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" className="text-xs">
              <Filter size={14} />
              <span>Filter</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Session History List */}
      {loading ? (
        <Card className="p-12 text-center text-text-muted">
          <div className="spinner mx-auto mb-3" />
          <p className="text-xs font-medium">Loading interview history &amp; turn-by-turn records...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center text-danger border-danger/30">
          <p className="text-xs font-medium">{error}</p>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary-bg text-primary flex items-center justify-center mx-auto text-xl font-bold">
            🎤
          </div>
          <h3 className="text-sm font-bold text-text">No Interview History Found</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            You haven't completed any AI mock interviews matching your current filter. Complete an interview to preserve full turn-by-turn replays and track your progress.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate("/interview")} className="text-xs mt-2">
            Start Your First Practice Session
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const scores = sess.scores || {};
            const isCompleted = sess.status === "completed";
            const dateStr = new Date(sess.completedAt || sess.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <Card key={sess._id} className="p-4 bg-surface border-border hover:border-border-hover transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text">{sess.targetRole}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-bg text-primary border border-primary/20">
                        {sess.candidateExperience || "Fresher (0-1 YOE)"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border">
                        {sess.interviewType || "mixed"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border">
                        {sess.difficulty || "medium"}
                      </span>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {sess.durationMinutes || 30} mins
                      </span>
                      <span>{sess.numberOfQuestions || 5} Questions</span>
                    </div>

                    {/* Tech Stack Pills */}
                    {sess.technologyStack?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {sess.technologyStack.slice(0, 6).map((tech, idx) => (
                          <span key={idx} className="text-[10px] font-medium bg-bg-secondary text-text-secondary px-2 py-0.5 rounded">
                            {tech}
                          </span>
                        ))}
                        {sess.technologyStack.length > 6 && (
                          <span className="text-[10px] text-text-muted font-medium py-0.5">
                            +{sess.technologyStack.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Score Badges & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t lg:border-t-0 border-border/60 pt-3 lg:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Overall</span>
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded border inline-block mt-0.5 ${getScoreBadgeColor(sess.overallScore)}`}>
                          {sess.overallScore !== null && sess.overallScore !== undefined ? `${sess.overallScore}%` : "N/A"}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Technical</span>
                        <span className="text-xs font-semibold text-text mt-0.5 inline-block">
                          {scores.technical !== null && scores.technical !== undefined ? `${scores.technical}%` : "N/A"}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Comm</span>
                        <span className="text-xs font-semibold text-text mt-0.5 inline-block">
                          {scores.communication !== null && scores.communication !== undefined ? `${scores.communication}%` : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {isCompleted ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/interview-replay/${sess._id}`)}
                            className="text-xs flex items-center gap-1.5"
                          >
                            <Play size={13} />
                            <span>Replay</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/interview/${sess._id}/report`)}
                            className="text-xs flex items-center gap-1.5"
                          >
                            <span>Report</span>
                            <ChevronRight size={13} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/interview/${sess._id}`)}
                          className="text-xs flex items-center gap-1.5"
                        >
                          <span>Resume Interview</span>
                          <ChevronRight size={13} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        title="Practice again with same role & setup"
                        onClick={() => startNewInterviewWithRole(sess)}
                        className="text-xs p-2 text-text-muted hover:text-text"
                      >
                        <RotateCcw size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
