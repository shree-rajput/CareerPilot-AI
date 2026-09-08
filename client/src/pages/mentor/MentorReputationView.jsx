import React, { useState, useEffect } from "react";
import { Star, ShieldCheck, Award, TrendingUp, Users, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "../../api/axios";

export function MentorReputationView() {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReputation();
  }, []);

  const fetchReputation = async () => {
    try {
      const res = await api.get("/mentors/me/reputation");
      if (res.data?.success) {
        setReputation(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch reputation details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
        Loading multi-dimensional reputation metrics...
      </div>
    );
  }

  const trustLevel = reputation?.trustLevel || "probation";
  const completedSessions = reputation?.completedSessions || 0;
  const rating = reputation?.overallRating || 5.0;

  // Progression milestones
  const isVerifiedEligible = completedSessions >= 5 && rating >= 4.4;
  const isTrustedEligible = completedSessions >= 25 && rating >= 4.6;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Platform Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                trustLevel === "trusted"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : trustLevel === "verified"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : trustLevel === "restricted"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {trustLevel.toUpperCase()} MENTOR
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">Evidence-Based Reputation Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your trust rank accumulates progressively based on objective session outcomes, student feedback, and reliability.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            <div>
              <div className="text-2xl font-bold text-white leading-none">{rating.toFixed(1)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Bayesian Confidence Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Completed Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{completedSessions}</div>
          <div className="text-[10px] text-slate-500 mt-1">Out of {reputation?.totalSessions || 0} total</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Problem Resolution</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{reputation?.problemResolutionRate || 100}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Structured student feedback</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reliability Score</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{reputation?.reliabilityScore || 100}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Attendance & promptness</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Repeat Mentees</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{reputation?.repeatStudentsCount || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Booked multiple sessions</div>
        </div>
      </div>

      {/* Progressive Trust Progression Roadmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" /> Progressive Trust Tier Roadmap
        </h3>

        <div className="space-y-4">
          {/* Probation Tier */}
          <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  1. Probationary Mentor
                  {trustLevel === "probation" && <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">ACTIVE</span>}
                </div>
                <div className="text-xs text-slate-400">Passed capability assessment. Max 5 sessions/week limit.</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Verified Tier */}
          <div className={`p-4 rounded-xl border transition-all ${
            trustLevel === "verified" || trustLevel === "trusted"
              ? "bg-slate-950 border-emerald-500/40"
              : "bg-slate-950/40 border-slate-800 opacity-80"
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  2. Verified Mentor
                  {trustLevel === "verified" && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">ACTIVE</span>}
                </div>
                <div className="text-xs text-slate-400">Unlock higher weekly limits & verified badge.</div>
              </div>
              {completedSessions >= 5 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <span className="text-xs font-mono text-slate-500">{completedSessions}/5 Sessions</span>
              )}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{ width: `${Math.min(100, (completedSessions / 5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Trusted Tier */}
          <div className={`p-4 rounded-xl border transition-all ${
            trustLevel === "trusted"
              ? "bg-slate-950 border-purple-500/40"
              : "bg-slate-950/40 border-slate-800 opacity-80"
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  3. Trusted Mentor
                  {trustLevel === "trusted" && <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300">ACTIVE</span>}
                </div>
                <div className="text-xs text-slate-400">Top search placement, unlimited capacity & ambassador status.</div>
              </div>
              {completedSessions >= 25 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <span className="text-xs font-mono text-slate-500">{completedSessions}/25 Sessions</span>
              )}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${Math.min(100, (completedSessions / 25) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
