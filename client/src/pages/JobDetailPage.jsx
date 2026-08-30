import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Building2, MapPin, BriefcaseBusiness, ExternalLink,
  Calendar, Trash2, CheckCircle2, XCircle, AlertCircle, Target,
  Sparkles, Bookmark, BookmarkPlus, Zap, TrendingUp, Loader2,
  ChevronRight, Clock, DollarSign, Wifi, WifiOff, MonitorSmartphone,
  ArrowRight, Copy, Check
} from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMatchColor(score) {
  if (score >= 80) return { ring: "ring-emerald-500/30", bg: "from-emerald-50", bar: "bg-emerald-500", text: "text-emerald-600" };
  if (score >= 60) return { ring: "ring-amber-500/30", bg: "from-amber-50", bar: "bg-amber-500", text: "text-amber-600" };
  return { ring: "ring-rose-500/30", bg: "from-rose-50", bar: "bg-rose-500", text: "text-rose-500" };
}

function RemoteBadge({ status }) {
  const map = {
    remote: { label: "Remote", cls: "bg-sky-100 text-sky-700 border-sky-200" },
    hybrid: { label: "Hybrid", cls: "bg-violet-100 text-violet-700 border-violet-200" },
    onsite: { label: "On-site", cls: "bg-slate-100 text-slate-600 border-slate-200" }
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${s.cls}`}>
      {status === "remote" ? <Wifi size={11} /> : status === "hybrid" ? <MonitorSmartphone size={11} /> : <WifiOff size={11} />}
      {s.label}
    </span>
  );
}

function VerdictCard({ verdict, reasoning, effort, tailoringRecommended, matchScore }) {
  const styles = {
    APPLY: { bg: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: <CheckCircle2 size={18} />, label: "Strong Fit — Apply" },
    MAYBE: { bg: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-300", icon: <AlertCircle size={18} />, label: "Possible Fit — Prepare First" },
    LOW_PRIORITY: { bg: "bg-slate-500", badge: "bg-slate-100 text-slate-700 border-slate-300", icon: <XCircle size={18} />, label: "Low Priority" },
    UNKNOWN: { bg: "bg-blue-500", badge: "bg-blue-100 text-blue-800 border-blue-200", icon: <Sparkles size={18} />, label: "Add Resume to Get Verdict" }
  };
  const s = styles[verdict] || styles.UNKNOWN;

  return (
    <div className={`rounded-2xl overflow-hidden border border-white/20 shadow-lg ${s.bg}`}>
      <div className="p-4 flex items-center gap-3">
        <span className="text-white">{s.icon}</span>
        <div>
          <p className="text-white font-black text-base">{s.label}</p>
          <p className="text-white/70 text-xs font-semibold">{matchScore != null ? `${matchScore}% profile match` : ""}</p>
        </div>
      </div>
      {reasoning && (
        <div className="bg-white/10 px-4 py-3">
          <p className="text-white/90 text-xs leading-relaxed">{reasoning}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-bold text-white/60 uppercase">Effort: <span className="text-white">{effort}</span></span>
            {tailoringRecommended && (
              <span className="text-[10px] font-bold text-amber-200 flex items-center gap-1">
                <Sparkles size={9} /> Tailoring Recommended
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, size = 100, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const c = getMatchColor(score);
  const fill = (score / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}
        strokeWidth={strokeWidth}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // AI feature states
  const [matchData, setMatchData] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [shouldApplyData, setShouldApplyData] = useState(null);
  const [loadingShouldApply, setLoadingShouldApply] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedJD, setCopiedJD] = useState(false);

  useEffect(() => { loadJob(); }, [id]);

  async function loadJob() {
    try {
      const res = await jobApi.getJobById(id);
      setJob(res.data || res);
    } catch (err) {
      console.error(err);
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Remove this tracked job?")) return;
    setDeleting(true);
    try {
      await jobApi.deactivateJob(id);
      navigate("/jobs");
    } catch {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSavingJob(true);
    try {
      const res = await jobApi.saveJob(id);
      setJob(prev => ({ ...prev, isSaved: res.data?.saved }));
    } finally {
      setSavingJob(false);
    }
  }

  async function runMatch() {
    setLoadingMatch(true);
    try {
      const res = await jobApi.matchJob(id);
      setMatchData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMatch(false);
    }
  }

  async function runShouldApply() {
    setLoadingShouldApply(true);
    try {
      const res = await jobApi.shouldApply(id);
      setShouldApplyData(res.data);
      if (!matchData) {
        const matchRes = await jobApi.matchJob(id);
        setMatchData(matchRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingShouldApply(false);
    }
  }

  function copyJD() {
    navigator.clipboard.writeText(job.description || "");
    setCopiedJD(true);
    setTimeout(() => setCopiedJD(false), 2000);
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Spinner size="lg" />
    </div>
  );

  if (!job) return null;

  const matchColor = matchData ? getMatchColor(matchData.overallScore) : null;

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Back */}
      <div className="py-4">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={15} /> Back to Job Board
        </Link>
      </div>

      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 mb-6 shadow-xl relative overflow-hidden">
        {/* bg texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/30 -translate-y-24 translate-x-24" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/20 translate-y-16 -translate-x-16" />
        </div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="text-sm font-bold text-blue-200">{job.company}</span>
            </div>

            <h1 className="text-2xl font-black text-white leading-tight mb-3">{job.title}</h1>

            <div className="flex flex-wrap items-center gap-3">
              {job.location && (
                <span className="text-sm text-blue-100 flex items-center gap-1.5 font-semibold">
                  <MapPin size={13} /> {job.location}
                </span>
              )}
              {job.remoteStatus && <RemoteBadge status={job.remoteStatus} />}
              {job.employmentType && (
                <span className="text-xs font-bold text-blue-100 bg-white/15 px-2.5 py-1 rounded-lg">
                  {job.employmentType}
                </span>
              )}
              {job.salaryDisplay && (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {job.salaryDisplay}
                </span>
              )}
              <span className="text-xs text-blue-200 flex items-center gap-1">
                <Calendar size={11} /> Added {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-bold px-3 py-2 rounded-xl transition-all border border-white/20">
                <ExternalLink size={14} /> View Posting
              </a>
            )}
            <button onClick={handleSave} disabled={savingJob}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl transition-all border ${job.isSaved
                  ? "bg-blue-900/50 text-white border-white/20"
                  : "bg-white/15 hover:bg-white/25 text-white border-white/20"
                }`}>
              {job.isSaved ? <Bookmark size={14} fill="currentColor" /> : <BookmarkPlus size={14} />}
              {job.isSaved ? "Saved" : "Save"}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 text-sm font-bold px-3 py-2 rounded-xl transition-all border border-rose-500/30">
              <Trash2 size={14} /> {deleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — AI Intelligence */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* Should I Apply? Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Zap size={15} className="text-amber-500" /> Should I Apply?
              </h3>
              {shouldApplyData && (
                <button onClick={runShouldApply} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">
                  Refresh
                </button>
              )}
            </div>

            <div className="p-4">
              {!shouldApplyData && !loadingShouldApply && (
                <div className="flex flex-col items-center gap-3 py-3">
                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    AI analyzes your resume against this role's requirements and gives you a verdict.
                  </p>
                  <button
                    onClick={runShouldApply}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
                  >
                    <Sparkles size={14} /> Analyze My Fit
                  </button>
                </div>
              )}

              {loadingShouldApply && (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="font-semibold">Analyzing your profile...</span>
                </div>
              )}

              {shouldApplyData && (
                <VerdictCard {...shouldApplyData} />
              )}
            </div>
          </div>

          {/* AI Match Score Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Target size={15} className="text-blue-500" /> Match Analysis
              </h3>
            </div>

            <div className="p-4">
              {!matchData && !loadingMatch && (
                <button
                  onClick={runMatch}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  <TrendingUp size={14} /> Run Match Analysis
                </button>
              )}

              {loadingMatch && (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="font-semibold">Running semantic pipeline...</span>
                </div>
              )}

              {matchData && (
                <div className="flex flex-col gap-4">
                  {/* Score ring */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
                      <ScoreRing score={matchData.overallScore} size={72} strokeWidth={7} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-black ${matchColor.text}`}>
                          {matchData.overallScore}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Overall Match</p>
                      <p className="text-xs text-slate-500">
                        {matchData.matchedSkills?.length || 0} matched · {matchData.missingSkills?.length || 0} missing
                      </p>
                      {matchData.resumeName && (
                        <p className="text-[10px] text-blue-600 font-semibold mt-1">vs. {matchData.resumeName}</p>
                      )}
                    </div>
                  </div>

                  {/* Category bars */}
                  {matchData.categoryScores && (
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                      {Object.entries(matchData.categoryScores).map(([cat, val]) => {
                        const pct = Math.round((val || 0) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="font-semibold text-slate-600 capitalize">
                                {cat.replace(/([A-Z])/g, " $1")}
                              </span>
                              <span className="font-bold text-slate-900">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Link to="/applications"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm">
              Track Application <ArrowRight size={14} />
            </Link>
            <Link to="/resume"
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold py-3 rounded-xl text-sm transition-all">
              <Sparkles size={14} className="text-blue-500" /> Tailor Resume for This Role
            </Link>
          </div>
        </div>

        {/* Right column — Skills + JD */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Skills Intelligence */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-500" /> Skills Intelligence
              </h3>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Required Skills with match status */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills?.length > 0 ? job.requiredSkills.map(s => {
                    const isMatched = matchData?.matchedSkills?.includes(s.skillName);
                    const isPartial = matchData?.partialSkills?.includes(s.skillName);
                    const isMissing = matchData?.missingSkills?.includes(s.skillName);
                    return (
                      <span key={s.skillName}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border transition-all ${isMatched ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isPartial ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isMissing ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                        {isMatched ? <CheckCircle2 size={10} /> : isPartial ? <AlertCircle size={10} /> : isMissing ? <XCircle size={10} /> : null}
                        {s.skillName}
                      </span>
                    );
                  }) : <span className="text-sm text-slate-400 italic">No required skills extracted</span>}
                </div>
                {matchData && (
                  <div className="flex items-center gap-4 mt-2.5 text-[10px] font-bold text-slate-400">
                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={9} /> {matchData.matchedSkills?.length || 0} matched</span>
                    <span className="text-amber-600 flex items-center gap-1"><AlertCircle size={9} /> {matchData.partialSkills?.length || 0} partial</span>
                    <span className="text-rose-500 flex items-center gap-1"><XCircle size={9} /> {matchData.missingSkills?.length || 0} missing</span>
                  </div>
                )}
              </div>

              {/* Preferred Skills */}
              {job.preferredSkills?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Preferred Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map(s => (
                      <span key={s.skillName}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-xl">
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Soft Skills */}
              {job.softSkills?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Soft Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.softSkills.map(s => (
                      <span key={s.skillName}
                        className="inline-flex items-center text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-xl">
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Job Description</h3>
              <button onClick={copyJD}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                {copiedJD ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedJD ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="p-5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
              {job.description || "No description provided."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
