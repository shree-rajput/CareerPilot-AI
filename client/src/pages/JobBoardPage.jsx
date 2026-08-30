import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Building2, MapPin, Briefcase, Clock, BookmarkPlus,
  Bookmark, Target, Sparkles, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, SlidersHorizontal, X, Wifi, WifiOff, MonitorSmartphone,
  Loader2, ArrowRight, TrendingUp, Zap
} from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function getMatchColor(score) {
  if (score >= 80) return { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" };
  if (score >= 60) return { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/30" };
  return { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/30" };
}

function getVerdictStyle(verdict) {
  if (verdict === "APPLY") return { bg: "bg-emerald-500", text: "text-white", label: "APPLY" };
  if (verdict === "MAYBE") return { bg: "bg-amber-500", text: "text-white", label: "MAYBE" };
  if (verdict === "LOW_PRIORITY") return { bg: "bg-slate-400", text: "text-white", label: "LOW PRIORITY" };
  return { bg: "bg-slate-200", text: "text-slate-700", label: "ANALYZING..." };
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.cls}`}>
      {status === "remote" ? <Wifi size={9} /> : status === "hybrid" ? <MonitorSmartphone size={9} /> : <WifiOff size={9} />}
      {s.label}
    </span>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({ filters, onChange, onAddJob }) {
  return (
    <aside className="w-64 shrink-0 flex flex-col gap-4 sticky top-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <SlidersHorizontal size={12} /> Filters
        </span>
        <button
          onClick={() => onChange({ remoteStatus: "", employmentType: "", experienceLevel: "", savedOnly: false })}
          className="text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Remote Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Work Mode</label>
        {["", "remote", "hybrid", "onsite"].map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="remoteStatus"
              value={val}
              checked={filters.remoteStatus === val}
              onChange={() => onChange({ ...filters, remoteStatus: val })}
              className="accent-blue-500 w-3.5 h-3.5"
            />
            <span className="text-sm text-slate-700 group-hover:text-blue-600 font-medium transition-colors">
              {val === "" ? "All" : val.charAt(0).toUpperCase() + val.slice(1)}
            </span>
          </label>
        ))}
      </div>

      {/* Employment Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Job Type</label>
        {["", "Full-time", "Part-time", "Contract", "Internship"].map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="employmentType"
              value={val}
              checked={filters.employmentType === val}
              onChange={() => onChange({ ...filters, employmentType: val })}
              className="accent-blue-500 w-3.5 h-3.5"
            />
            <span className="text-sm text-slate-700 group-hover:text-blue-600 font-medium transition-colors">
              {val === "" ? "All" : val}
            </span>
          </label>
        ))}
      </div>

      {/* Experience Level */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Experience</label>
        {["", "Entry level", "Mid-Senior level", "Director", "Executive"].map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="experienceLevel"
              value={val}
              checked={filters.experienceLevel === val}
              onChange={() => onChange({ ...filters, experienceLevel: val })}
              className="accent-blue-500 w-3.5 h-3.5"
            />
            <span className="text-sm text-slate-700 group-hover:text-blue-600 font-medium transition-colors">
              {val === "" ? "All" : val}
            </span>
          </label>
        ))}
      </div>

      {/* Saved Jobs */}
      <div className="border-t border-slate-200 pt-3">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.savedOnly}
            onChange={e => onChange({ ...filters, savedOnly: e.target.checked })}
            className="accent-blue-500 w-3.5 h-3.5 rounded"
          />
          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 flex items-center gap-1.5 transition-colors">
            <Bookmark size={13} /> Saved Jobs Only
          </span>
        </label>
      </div>

      {/* Add Job CTA */}
      <button
        onClick={onAddJob}
        className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
      >
        <Plus size={15} /> Add Target Job
      </button>
    </aside>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, isSelected, onSelect, onSave }) {
  const matchColor = job.matchScore != null ? getMatchColor(job.matchScore) : null;

  return (
    <div
      onClick={() => onSelect(job)}
      className={`group relative bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isSelected
          ? "border-blue-500 shadow-md ring-2 ring-blue-500/20"
          : "border-slate-200 hover:border-slate-300"
        }`}
    >
      {/* Match score badge — top right */}
      {job.matchScore != null && (
        <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black border ${matchColor.bg} ${matchColor.text} ${matchColor.border}`}>
          <Target size={10} />
          {job.matchScore}%
        </div>
      )}

      <div className="p-4">
        {/* Company row */}
        <div className="flex items-center gap-2.5 mb-2 pr-16">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 truncate">{job.company}</p>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
              {job.title}
            </h3>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.location && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
              <MapPin size={9} /> {job.location}
            </span>
          )}
          {job.remoteStatus && <RemoteBadge status={job.remoteStatus} />}
          {job.employmentType && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              {job.employmentType}
            </span>
          )}
          {job.salaryDisplay && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {job.salaryDisplay}
            </span>
          )}
        </div>

        {/* Skills row */}
        {(job.matchedSkills?.length > 0 || job.missingSkills?.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {job.matchedSkills?.slice(0, 3).map(skill => (
              <span key={skill} className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 size={8} /> {skill}
              </span>
            ))}
            {job.missingSkills?.slice(0, 2).map(skill => (
              <span key={skill} className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <AlertCircle size={8} /> {skill}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            {job.requiredSkills?.length > 0 && (
              <span>{job.requiredSkills.length} skills</span>
            )}
            {job.createdAt && (
              <>
                <span className="text-slate-300">·</span>
                <span>{daysAgo(job.createdAt)}</span>
              </>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSave(job._id); }}
            className={`p-1.5 rounded-lg transition-all ${job.isSaved
                ? "text-blue-600 bg-blue-50"
                : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"
              }`}
            title={job.isSaved ? "Unsave" : "Save job"}
          >
            {job.isSaved ? <Bookmark size={13} fill="currentColor" /> : <BookmarkPlus size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Job Form ─────────────────────────────────────────────────────────────

function AddJobForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "", company: "", location: "", employmentType: "", experienceLevel: "",
    remoteStatus: "", salaryDisplay: "", url: "", description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await jobApi.createJob(form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Target Job</h2>
            <p className="text-xs text-slate-500 mt-0.5">AI will extract required skills from the description</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm font-medium px-3 py-2.5 rounded-xl border border-rose-200">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "title", label: "Job Title", required: true, placeholder: "Software Engineer" },
              { key: "company", label: "Company", required: true, placeholder: "Google" },
              { key: "location", label: "Location", placeholder: "Bangalore" },
              { key: "url", label: "Job URL", placeholder: "https://..." }
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">{f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                <input
                  type="text"
                  required={f.required}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">Work Mode</label>
              <select value={form.remoteStatus} onChange={e => setForm({ ...form, remoteStatus: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">Type</label>
              <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Any</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">Salary</label>
              <input type="text" placeholder="₹18L–₹32L"
                value={form.salaryDisplay}
                onChange={e => setForm({ ...form, salaryDisplay: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">Job Description <span className="text-rose-500">*</span></label>
            <textarea required rows={7} placeholder="Paste the full job description here for AI skill extraction..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analyzing..." : "Save & Analyze Job"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDetailDrawer({ job, onClose, onSave, navigate }) {
  const [matchData, setMatchData] = useState(null);
  const [shouldApplyData, setShouldApplyData] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadingShouldApply, setLoadingShouldApply] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (job) {
      setMatchData(null);
      setShouldApplyData(null);
      setActiveTab("overview");
    }
  }, [job?._id]);

  async function runMatch() {
    setLoadingMatch(true);
    try {
      const res = await jobApi.matchJob(job._id);
      setMatchData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMatch(false);
    }
  }

  async function runShouldApply() {
    setLoadingShouldApply(true);
    if (!matchData) await runMatch();
    try {
      const res = await jobApi.shouldApply(job._id);
      setShouldApplyData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingShouldApply(false);
    }
  }

  if (!job) return null;

  const verdictStyle = shouldApplyData ? getVerdictStyle(shouldApplyData.verdict) : null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Building2 size={13} className="text-white" />
              </div>
              <span className="text-xs font-bold text-blue-100">{job.company}</span>
            </div>
            <h2 className="text-base font-black text-white leading-tight">{job.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {job.location && (
                <span className="text-[10px] text-blue-100 flex items-center gap-1">
                  <MapPin size={9} /> {job.location}
                </span>
              )}
              {job.remoteStatus && <RemoteBadge status={job.remoteStatus} />}
              {job.salaryDisplay && (
                <span className="text-[10px] font-bold text-emerald-300">{job.salaryDisplay}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0">
            <X size={15} className="text-white" />
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => navigate(`/jobs/${job._id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-50 transition-all"
          >
            <ArrowRight size={12} /> Full Detail
          </button>
          <button
            onClick={() => onSave(job._id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${job.isSaved ? "bg-blue-900/50 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
          >
            {job.isSaved ? <Bookmark size={12} fill="currentColor" /> : <BookmarkPlus size={12} />}
            {job.isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {["overview", "match", "jd"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-slate-500 hover:text-slate-700"
              }`}>
            {tab === "jd" ? "Job Description" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-4 flex flex-col gap-4">
            {/* Skills Overview */}
            {job.requiredSkills?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map(s => (
                    <span key={s.skillName} className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {s.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {job.preferredSkills?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.preferredSkills.map(s => (
                    <span key={s.skillName} className="text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                      {s.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Should I Apply? */}
            <div className="border border-slate-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Zap size={12} className="text-amber-500" /> Should I Apply?
              </h4>

              {!shouldApplyData && !loadingShouldApply && (
                <button
                  onClick={runShouldApply}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-all"
                >
                  <Sparkles size={13} /> Get AI Recommendation
                </button>
              )}

              {loadingShouldApply && (
                <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-xs">
                  <Loader2 size={14} className="animate-spin" /> Analyzing your profile...
                </div>
              )}

              {shouldApplyData && (
                <div className="flex flex-col gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${verdictStyle.bg}`}>
                    <span className={`text-sm font-black ${verdictStyle.text}`}>{verdictStyle.label}</span>
                    <span className="text-xs text-slate-600 font-semibold">
                      {shouldApplyData.matchScore}% match
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{shouldApplyData.reasoning}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="font-bold text-slate-500">Effort</span>
                      <p className="font-black text-slate-900 mt-0.5">{shouldApplyData.effort}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="font-bold text-slate-500">Tailoring</span>
                      <p className={`font-black mt-0.5 ${shouldApplyData.tailoringRecommended ? "text-amber-600" : "text-emerald-600"}`}>
                        {shouldApplyData.tailoringRecommended ? "Recommended" : "Optional"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Apply Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/applications`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
              >
                Track Application
              </button>
              <button
                onClick={() => navigate(`/resume`)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Tailor Resume
              </button>
            </div>
          </div>
        )}

        {activeTab === "match" && (
          <div className="p-4 flex flex-col gap-4">
            {!matchData && !loadingMatch && (
              <button
                onClick={runMatch}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm"
              >
                <TrendingUp size={15} /> Run AI Match Analysis
              </button>
            )}

            {loadingMatch && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
                <Loader2 size={22} className="animate-spin text-blue-500" />
                <p className="text-xs font-semibold">Running semantic match pipeline...</p>
              </div>
            )}

            {matchData && (
              <div className="flex flex-col gap-4">
                {/* Overall score ring */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                      <circle cx="30" cy="30" r="24" fill="none"
                        stroke={matchData.overallScore >= 80 ? "#10b981" : matchData.overallScore >= 60 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="6"
                        strokeDasharray={`${(matchData.overallScore / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-black text-slate-900">{matchData.overallScore}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Overall Match</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {matchData.overallScore >= 80 ? "Strong fit — apply with confidence"
                        : matchData.overallScore >= 60 ? "Good fit — consider tailoring"
                          : "Partial fit — skill gaps exist"}
                    </p>
                    {matchData.resumeName && (
                      <p className="text-[10px] text-blue-600 font-semibold mt-1">vs. {matchData.resumeName}</p>
                    )}
                  </div>
                </div>

                {/* Skills breakdown */}
                {matchData.matchedSkills?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Strong Matches ({matchData.matchedSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {matchData.matchedSkills.map(s => (
                        <span key={s} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {matchData.partialSkills?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle size={10} /> Partial Matches ({matchData.partialSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {matchData.partialSkills.map(s => (
                        <span key={s} className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          ~ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {matchData.missingSkills?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <XCircle size={10} /> Missing ({matchData.missingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {matchData.missingSkills.map(s => (
                        <span key={s} className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                          ✗ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category scores */}
                {matchData.categoryScores && Object.keys(matchData.categoryScores).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Score Breakdown</h4>
                    <div className="flex flex-col gap-2">
                      {Object.entries(matchData.categoryScores).map(([cat, score]) => {
                        const pct = Math.round((score || 0) * 100);
                        return (
                          <div key={cat} className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-slate-600 capitalize">{cat.replace(/([A-Z])/g, " $1")}</span>
                              <span className="font-bold text-slate-900">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-400"}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "jd" && (
          <div className="p-4">
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-mono text-[11px] bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-[600px] overflow-y-auto">
              {job.description || "No description available."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function JobBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filters, setFilters] = useState({
    remoteStatus: "", employmentType: "", experienceLevel: "", savedOnly: false
  });
  const navigate = useNavigate();
  const searchTimer = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    loadJobs();
  }, [debouncedSearch, filters]);

  async function loadJobs() {
    setLoading(true);
    try {
      const res = await jobApi.getJobs({
        search: debouncedSearch,
        ...filters
      });
      const list = res.data || res || [];
      setJobs(list);
      // Auto-select first job
      if (list.length > 0 && !selectedJob) setSelectedJob(list[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(jobId) {
    try {
      const res = await jobApi.saveJob(jobId);
      setJobs(prev => prev.map(j => j._id === jobId
        ? { ...j, isSaved: res.data?.saved }
        : j
      ));
      if (selectedJob?._id === jobId) {
        setSelectedJob(prev => ({ ...prev, isSaved: res.data?.saved }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ── LEFT: Filters ── */}
      <div className="w-64 shrink-0 border-r border-slate-200 bg-white p-5 overflow-y-auto">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onAddJob={() => setShowAdd(true)}
        />
      </div>

      {/* ── CENTER: Job List ── */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        {/* Search */}
        <div className="p-3 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] font-bold text-slate-400">
              {loading ? "Loading..." : `${jobs.length} job${jobs.length !== 1 ? "s" : ""}`}
            </span>
            <button onClick={() => setShowAdd(true)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus size={10} /> Add Job
            </button>
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Spinner size="md" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Briefcase size={22} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No jobs found</p>
                <p className="text-xs text-slate-400 mt-1">Add target jobs to track matches</p>
              </div>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                <Plus size={12} /> Add Job
              </button>
            </div>
          ) : (
            jobs.map(job => (
              <JobCard
                key={job._id}
                job={job}
                isSelected={selectedJob?._id === job._id}
                onSelect={setSelectedJob}
                onSave={handleSave}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Job Detail Drawer ── */}
      <div className="flex-1 overflow-hidden">
        {selectedJob ? (
          <JobDetailDrawer
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onSave={handleSave}
            navigate={navigate}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Target size={28} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">Select a job to see details</p>
              <p className="text-sm text-slate-400 mt-1">AI match analysis and recommendations appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Job Modal */}
      {showAdd && (
        <AddJobForm
          onClose={() => setShowAdd(false)}
          onSuccess={() => { loadJobs(); }}
        />
      )}
    </div>
  );
}
