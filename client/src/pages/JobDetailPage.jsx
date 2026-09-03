import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Building2, MapPin, ExternalLink,
  Calendar, Trash2, CheckCircle2, XCircle, AlertCircle, Target,
  Sparkles, Bookmark, BookmarkPlus, Zap, TrendingUp, Loader2,
  Copy, Check
} from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { DeleteJobModal } from "../components/jobs/DeleteJobModal";

export function normalizeScore(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return 0;
  const num = Number(val);
  if (num <= 1 && num > 0) return Math.round(num * 100);
  return Math.min(100, Math.max(0, Math.round(num)));
}

function RemoteBadge({ status }) {
  const map = {
    remote: { label: "Remote", variant: "primary" },
    hybrid: { label: "Hybrid", variant: "info" },
    onsite: { label: "On-site", variant: "secondary" }
  };
  const s = map[status];
  if (!s) return null;
  return (
    <Badge variant={s.variant} size="xs">
      {s.label}
    </Badge>
  );
}

function VerdictCard({ verdict, reasoning, effort, tailoringRecommended, matchScore }) {
  const normScore = matchScore != null ? normalizeScore(matchScore) : null;

  const styles = {
    APPLY: {
      border: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
      icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />,
      label: "Strong Fit — Recommended to Apply"
    },
    MAYBE: {
      border: "border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
      icon: <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />,
      label: "Possible Fit — Resume Tailoring Advised"
    },
    LOW_PRIORITY: {
      border: "border-border bg-bg-secondary/40",
      badge: "bg-bg-secondary text-text-secondary",
      icon: <XCircle size={16} className="text-text-muted" />,
      label: "Low Priority — Address Skill Gaps First"
    },
    UNKNOWN: {
      border: "border-border bg-bg-secondary/30",
      badge: "bg-bg-secondary text-text-secondary",
      icon: <Sparkles size={16} className="text-primary" />,
      label: "Upload Resume to Get Verdict"
    }
  };
  const s = styles[verdict] || styles.UNKNOWN;

  return (
    <div className={`rounded-xl border p-4 space-y-2.5 transition-all ${s.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {s.icon}
          <span className="text-xs font-bold text-text">{s.label}</span>
        </div>
        {normScore != null && (
          <span className="text-xs font-bold text-text-muted">
            {normScore}% fit
          </span>
        )}
      </div>

      {reasoning && (
        <p className="text-xs text-text-secondary leading-relaxed m-0">
          {reasoning}
        </p>
      )}

      {(effort || tailoringRecommended) && (
        <div className="flex items-center gap-3 pt-1 text-[10px] font-semibold text-text-muted">
          {effort && <span>Preparation Effort: <strong className="text-text">{effort}</strong></span>}
          {tailoringRecommended && (
            <span className="text-primary font-bold flex items-center gap-1">
              <Sparkles size={10} /> Tailoring Recommended
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, size = 64, strokeWidth = 6 }) {
  const normScore = normalizeScore(score);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (normScore / 100) * circ;

  const strokeColor = normScore >= 80 ? "#059669" : normScore >= 60 ? "#d97706" : "#dc2626";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color, #e2e8f0)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round" />
    </svg>
  );
}

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // AI feature states
  const [matchData, setMatchData] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const [shouldApplyData, setShouldApplyData] = useState(null);
  const [loadingShouldApply, setLoadingShouldApply] = useState(false);
  const [shouldApplyError, setShouldApplyError] = useState(null);

  const [savingJob, setSavingJob] = useState(false);
  const [copiedJD, setCopiedJD] = useState(false);

  useEffect(() => { loadJob(); }, [id]);

  async function loadJob() {
    try {
      const res = await jobApi.getJobById(id);
      setJob(res.data || res);
    } catch (err) {
      console.error("[JobDetailPage] Load job error:", err);
      navigate("/jobs");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDelete() {
    try {
      await jobApi.deleteJob(id);
      setShowDeleteModal(false);
      navigate("/jobs");
    } catch (err) {
      console.error("[JobDetailPage] Delete error:", err);
      alert(err?.response?.data?.message || "Failed to delete job.");
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
    setMatchError(null);
    try {
      const res = await jobApi.matchJob(id);
      setMatchData(res.data);
    } catch (e) {
      console.error("[JobDetailPage] Run match error:", e);
      setMatchError(e?.response?.data?.message || "AI analysis is temporarily unavailable.");
    } finally {
      setLoadingMatch(false);
    }
  }

  async function runShouldApply() {
    setLoadingShouldApply(true);
    setShouldApplyError(null);
    try {
      const res = await jobApi.shouldApply(id);
      setShouldApplyData(res.data);
      if (!matchData) {
        const matchRes = await jobApi.matchJob(id);
        setMatchData(matchRes.data);
      }
    } catch (e) {
      console.error("[JobDetailPage] Should apply error:", e);
      setShouldApplyError(e?.response?.data?.message || "AI analysis is temporarily unavailable.");
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

  const normScore = matchData?.overallScore != null ? normalizeScore(matchData.overallScore) : null;

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Navigation */}
      <div className="py-2">
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Job Board
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-surface rounded-xl border border-border p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-bg-secondary border border-border flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-text-secondary" />
              </div>
              <span className="text-sm font-bold text-text-secondary">{job.company}</span>
            </div>

            <h1 className="text-2xl font-bold text-text leading-tight m-0">{job.title}</h1>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {job.location && (
                <span className="text-xs text-text-muted flex items-center gap-1 font-medium">
                  <MapPin size={12} /> {job.location}
                </span>
              )}
              {job.remoteStatus && <RemoteBadge status={job.remoteStatus} />}
              {job.employmentType && (
                <Badge variant="secondary" size="xs font-semibold">
                  {job.employmentType}
                </Badge>
              )}
              {job.salaryDisplay && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                  {job.salaryDisplay}
                </span>
              )}
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Calendar size={12} /> Added {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-bg-secondary hover:bg-border/60 text-text text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-border">
                <ExternalLink size={13} /> View Posting
              </a>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              isLoading={savingJob}
            >
              {job.isSaved ? <Bookmark size={13} fill="currentColor" className="text-primary" /> : <BookmarkPlus size={13} />}
              {job.isSaved ? "Saved" : "Save"}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={13} /> Delete Job
            </Button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — AI Fit Analysis */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* Verdict Card */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Zap size={14} className="text-amber-500" /> Should I Apply?
              </h3>
              {shouldApplyData && (
                <button onClick={runShouldApply} className="text-[10px] font-semibold text-primary hover:underline">
                  Refresh
                </button>
              )}
            </div>

            {!shouldApplyData && !loadingShouldApply && (
              <div className="space-y-3 py-1">
                <p className="text-xs text-text-secondary leading-relaxed m-0">
                  AI analyzes your candidate profile against this job description to provide a clear verdict.
                </p>
                {shouldApplyError ? (
                  <div className="p-2.5 rounded-lg text-xs bg-danger-bg text-danger border border-danger-border">
                    {shouldApplyError}
                    <button onClick={runShouldApply} className="block mt-1 font-bold underline">Retry</button>
                  </div>
                ) : (
                  <Button onClick={runShouldApply} size="sm" className="w-full">
                    <Sparkles size={14} /> Analyze Fit Verdict
                  </Button>
                )}
              </div>
            )}

            {loadingShouldApply && (
              <div className="flex items-center justify-center gap-2 py-6 text-text-muted text-xs">
                <Loader2 size={15} className="animate-spin text-primary" />
                <span className="font-medium">Evaluating profile fit...</span>
              </div>
            )}

            {shouldApplyData && (
              <VerdictCard {...shouldApplyData} />
            )}
          </div>

          {/* Match Analysis Card */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Target size={14} className="text-primary" /> Match Breakdown
              </h3>
            </div>

            {!matchData && !loadingMatch && (
              <div className="space-y-2">
                {matchError ? (
                  <div className="p-2.5 rounded-lg text-xs bg-danger-bg text-danger border border-danger-border">
                    {matchError}
                    <button onClick={runMatch} className="block mt-1 font-bold underline">Retry</button>
                  </div>
                ) : (
                  <Button onClick={runMatch} variant="outline" size="sm" className="w-full">
                    <TrendingUp size={14} /> Run Match Engine
                  </Button>
                )}
              </div>
            )}

            {loadingMatch && (
              <div className="flex items-center justify-center gap-2 py-6 text-text-muted text-xs">
                <Loader2 size={15} className="animate-spin text-primary" />
                <span className="font-medium">Running semantic match...</span>
              </div>
            )}

            {matchData && normScore != null && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0 flex items-center justify-center" style={{ width: 64, height: 64 }}>
                    <ScoreRing score={normScore} size={64} strokeWidth={6} />
                    <span className="absolute text-xs font-bold text-text">
                      {normScore}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text m-0">Overall Match Score</p>
                    <p className="text-[11px] text-text-muted m-0">
                      {matchData.matchedSkills?.length || 0} matched · {matchData.missingSkills?.length || 0} missing
                    </p>
                  </div>
                </div>

                {matchData.categoryScores && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {Object.entries(matchData.categoryScores).map(([cat, val]) => {
                      const pct = normalizeScore(val);
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="font-medium text-text-secondary capitalize">
                              {cat.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span className="font-bold text-text">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-danger"}`}
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

        {/* Right column — Required Skills & JD */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Required Skills */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
            <div className="border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 m-0">
                <CheckCircle2 size={14} className="text-primary" /> Extracted Skill Intelligence
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills?.length > 0 ? job.requiredSkills.map(s => {
                    const skillLower = (s.skillName || "").toLowerCase().trim();
                    const isMatched = matchData?.matchedSkills?.some(m => (m || "").toLowerCase().trim() === skillLower);
                    const isPartial = !isMatched && matchData?.partialSkills?.some(m => (m || "").toLowerCase().trim() === skillLower);
                    const isMissing = !isMatched && !isPartial && matchData?.missingSkills?.some(m => (m || "").toLowerCase().trim() === skillLower);

                    return (
                      <span
                        key={s.skillName}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                          isMatched ? "bg-success-bg text-success border-success-border"
                          : isPartial ? "bg-warning-bg text-warning border-warning-border"
                          : isMissing ? "bg-danger-bg text-danger border-danger-border"
                          : "bg-bg-secondary text-text-secondary border-border"
                        }`}
                      >
                        {isMatched ? <CheckCircle2 size={11} /> : isPartial ? <AlertCircle size={11} /> : isMissing ? <XCircle size={11} /> : null}
                        {s.skillName}
                      </span>
                    );
                  }) : (
                    <span className="text-xs text-text-muted italic">No required skills extracted</span>
                  )}
                </div>
              </div>

              {job.preferredSkills?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Preferred Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.preferredSkills.map(s => (
                      <span key={s.skillName} className="text-xs font-medium bg-bg-secondary text-text-secondary border border-border px-2.5 py-0.5 rounded-md">
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider m-0">Job Description</h3>
              <button
                onClick={copyJD}
                className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text transition-colors"
              >
                {copiedJD ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                {copiedJD ? "Copied" : "Copy JD"}
              </button>
            </div>

            <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
              {job.description || "No description provided."}
            </div>
          </div>
        </div>
      </div>

      <DeleteJobModal
        job={job}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
