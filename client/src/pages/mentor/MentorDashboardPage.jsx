import React, { useEffect, useState } from "react";
import {
  Users,
  Video,
  Star,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  ArrowRight,
  UserCheck,
  Check,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/axios";

export function MentorDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes Modal state
  const [activeSessionForNotes, setActiveSessionForNotes] = useState(null);
  const [notesData, setNotesData] = useState({
    topic: "",
    studentLevel: "Intermediate",
    problemsDiscussed: "",
    studentStruggles: "",
    recommendedPractice: "",
    nextSteps: "",
    actionItems: ""
  });
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/mentor-portal/dashboard");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load mentor dashboard stats", err);
      setError("Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (sessionId, status) => {
    try {
      await api.patch(`/mentors/sessions/${sessionId}/respond`, { status });
      fetchDashboard();
    } catch (err) {
      alert("Failed to update session request status.");
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!activeSessionForNotes) return;
    setSavingNotes(true);
    try {
      await api.post(`/mentors/sessions/${activeSessionForNotes.id}/notes`, {
        ...notesData,
        actionItems: notesData.actionItems ? notesData.actionItems.split("\n").filter(Boolean) : []
      });
      setActiveSessionForNotes(null);
      alert("Session notes saved & synced to student preparation plan!");
      fetchDashboard();
    } catch (err) {
      alert("Failed to save session notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
        Connecting to Mentor Command Center...
      </div>
    );
  }

  const reputationStatus = stats?.reputationStatus || "probation";
  const rating = stats?.rating || 5.0;
  const completedSessionsCount = stats?.completedSessionsCount || 0;
  const todaySchedule = stats?.todaySchedule || [];
  const pendingRequests = stats?.pendingRequests || [];

  return (
    <div className="space-y-8">
      {/* Header Banner with Trust Level */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 uppercase font-semibold">Platform Identity</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              reputationStatus === "trusted"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : reputationStatus === "verified"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}>
              {reputationStatus.toUpperCase()} MENTOR
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">What do you need to do today?</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capacity limit: {stats?.maxWeeklySessions || 5} sessions/week ({completedSessionsCount} sessions completed)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-lg font-bold text-white">{rating.toFixed(1)}</span>
            <span className="text-xs text-slate-500">({stats?.reviewsCount || 0} reviews)</span>
          </div>
          <Link
            to="/mentor/profile"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
          >
            My Profile
          </Link>
        </div>
      </div>

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Sessions</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{todaySchedule.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Mentees</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalMentees || 0}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reliability Score</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.reputation?.reliabilityScore || 100}%</div>
        </div>
      </div>

      {/* TODAY'S SCHEDULE & PENDING REQUESTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TODAY'S SCHEDULE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-400" /> Today's Mentoring Schedule
            </h2>
            <span className="text-xs text-slate-400 font-mono">{new Date().toLocaleDateString()}</span>
          </div>

          {todaySchedule.length > 0 ? (
            <div className="space-y-3">
              {todaySchedule.map((session) => (
                <div key={session.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-sm text-white">{session.topic}</div>
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {new Date(session.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({session.duration} min)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Student: {session.studentName} ({session.studentTargetRole})</p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={session.meetingUrl}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold text-center transition-all"
                    >
                      Enter Room 🚀
                    </Link>
                    <button
                      onClick={() => {
                        setActiveSessionForNotes(session);
                        setNotesData({ ...notesData, topic: session.topic });
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all"
                    >
                      Write Notes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No sessions scheduled for today.
            </div>
          )}
        </div>

        {/* PENDING STUDENT REQUESTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Pending Booking Requests
            </h2>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {pendingRequests.length} Pending
            </span>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm text-white">{req.topic}</div>
                      <div className="text-xs text-slate-400">Student: {req.studentName} ({req.studentTargetRole})</div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(req.scheduledAt).toLocaleDateString()}</span>
                  </div>

                  {req.description && (
                    <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      "{req.description}"
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleRespondToRequest(req.id, "accepted")}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept Request
                    </button>
                    <button
                      onClick={() => handleRespondToRequest(req.id, "rejected")}
                      className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No pending student booking requests.
            </div>
          )}
        </div>
      </div>

      {/* QUICK STRUCTURED SESSION NOTES MODAL */}
      {activeSessionForNotes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Log Structured Session Notes</h3>
            <p className="text-xs text-slate-400">
              Notes automatically sync actionable task items into student candidate's Preparation Plan.
            </p>

            <form onSubmit={handleSaveNotes} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Session Topic</label>
                <input
                  type="text"
                  value={notesData.topic}
                  onChange={(e) => setNotesData({ ...notesData, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Student Struggles / Blockers</label>
                <textarea
                  rows={2}
                  value={notesData.studentStruggles}
                  onChange={(e) => setNotesData({ ...notesData, studentStruggles: e.target.value })}
                  placeholder="e.g. Struggled with dynamic programming space optimization..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Action Items / Practice Tasks (1 per line)</label>
                <textarea
                  rows={3}
                  value={notesData.actionItems}
                  onChange={(e) => setNotesData({ ...notesData, actionItems: e.target.value })}
                  placeholder="Solve 3 LC Medium Binary Tree problems&#10;Optimize resume project bullet points"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSessionForNotes(null)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                >
                  {savingNotes ? "Saving..." : "Save & Sync Notes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
