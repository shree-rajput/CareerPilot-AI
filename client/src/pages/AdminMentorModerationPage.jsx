import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  UserCheck,
  Award,
  Briefcase,
  FileText,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Send
} from "lucide-react";
import { api } from "../api/axios";

export function AdminMentorModerationPage() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, exceptions, appeals, reports, audit_logs
  const [overview, setOverview] = useState(null);
  const [exceptions, setExceptions] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Appeal resolution state
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [appealNotes, setAppealNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "overview" || activeTab === "exceptions") {
        const [ovRes, exRes] = await Promise.all([
          api.get("/admin/mentors/overview"),
          api.get("/admin/mentors/exceptions")
        ]);
        setOverview(ovRes.data?.data || null);
        setExceptions(exRes.data?.data || null);
      } else if (activeTab === "audit_logs") {
        const logRes = await api.get("/admin/mentors/audit-logs");
        setAuditLogs(logRes.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to load admin moderation data", err);
      setError("Failed to load admin moderation records.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAppeal = async (appealId, action) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/mentors/appeals/${appealId}/resolve`, {
        action,
        notes: appealNotes || `Appeal ${action}d by admin moderation team.`
      });
      setSelectedAppeal(null);
      setAppealNotes("");
      loadAdminData();
    } catch (err) {
      alert("Failed to resolve appeal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestrictMentor = async (mentorId) => {
    const reason = prompt("Enter rationale for restricting this mentor:");
    if (!reason) return;
    try {
      await api.post(`/admin/mentors/${mentorId}/restrict`, { reason });
      loadAdminData();
    } catch (err) {
      alert("Failed to restrict mentor.");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/20 mb-2">
              <ShieldCheck className="w-4 h-4" /> Admin Authorization Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Mentor Platform Moderation Hub</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Exception-based governance: Automated routine checks with admin intervention focused on exceptions & appeals.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { id: "overview", label: "Platform Overview" },
              { id: "exceptions", label: `Exception Queue (${overview?.exceptionQueueCount || 0})` },
              { id: "audit_logs", label: "Audit Logs" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === t.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PLATFORM OVERVIEW CARDS */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs mb-1">Total Mentors</div>
              <div className="text-2xl font-bold text-white">{overview.totalMentors}</div>
              <div className="text-[10px] text-slate-500 mt-1">{overview.activeMentors} active profiles</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs mb-1">Probationary Mentors</div>
              <div className="text-2xl font-bold text-amber-400">{overview.probationaryMentors}</div>
              <div className="text-[10px] text-slate-500 mt-1">Limited weekly capacity</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs mb-1">Verified / Trusted</div>
              <div className="text-2xl font-bold text-emerald-400">{overview.verifiedMentors + overview.trustedMentors}</div>
              <div className="text-[10px] text-slate-500 mt-1">{overview.trustedMentors} trusted level</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs mb-1">Exception Queue</div>
              <div className="text-2xl font-bold text-red-400">{overview.exceptionQueueCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Requires human review</div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW & EXCEPTION QUEUE */}
        {(activeTab === "overview" || activeTab === "exceptions") && (
          <div className="space-y-6">
            {/* PENDING APPEALS SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" /> Pending Mentor Appeals
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {exceptions?.appeals?.length || 0} Pending Review
                </span>
              </div>

              {exceptions?.appeals?.length > 0 ? (
                <div className="space-y-3">
                  {exceptions.appeals.map((app) => (
                    <div key={app._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm text-white">{app.mentorId?.name} ({app.mentorId?.email})</div>
                          <div className="text-xs text-amber-300 mt-0.5">Policy: {app.policyInvolved}</div>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>

                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded border border-slate-800/60">
                        "{app.appealStatement}"
                      </p>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setSelectedAppeal(app)}
                          className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Review & Decide Appeal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No pending mentor appeals in the exception queue.
                </div>
              )}
            </div>

            {/* RESTRICTED / SUSPENDED MENTORS SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-400" /> Restricted / Suspended Mentors
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {exceptions?.restrictedMentors?.length || 0} Flagged
                </span>
              </div>

              {exceptions?.restrictedMentors?.length > 0 ? (
                <div className="space-y-3">
                  {exceptions.restrictedMentors.map((m) => (
                    <div key={m._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm text-white">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.email} - Status: <span className="text-red-400 font-semibold">{m.mentorStatus}</span></div>
                      </div>

                      <button
                        onClick={() => handleRestrictMentor(m._id)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                      >
                        Update Restriction
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No restricted or suspended mentors currently flagged.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: IMMUTABLE AUDIT LOGS */}
        {activeTab === "audit_logs" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">Immutable Moderation Audit Trail</h2>
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span className="font-semibold text-indigo-400 uppercase">{log.actionType}</span>
                      <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-200">Target: {log.targetUserId?.name || "User"}</div>
                    <div className="text-slate-400">Reason: {log.reason}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">No moderation audit logs recorded yet.</div>
            )}
          </div>
        )}

        {/* APPEAL DECISION MODAL */}
        {selectedAppeal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Resolve Appeal for {selectedAppeal.mentorId?.name}</h3>
              <p className="text-xs text-slate-400">{selectedAppeal.appealStatement}</p>

              <textarea
                rows={3}
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Enter admin resolution notes..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => handleResolveAppeal(selectedAppeal._id, "approve")}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Approve Appeal (Restore to Probation)
                </button>
                <button
                  onClick={() => handleResolveAppeal(selectedAppeal._id, "reject")}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
                >
                  Reject Appeal (Maintain Suspension)
                </button>
              </div>
              <button
                onClick={() => setSelectedAppeal(null)}
                className="w-full py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
