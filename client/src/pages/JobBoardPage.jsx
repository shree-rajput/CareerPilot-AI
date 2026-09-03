import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Building2, MapPin, BookmarkPlus,
  Bookmark, SlidersHorizontal, X, Trash2,
  CheckCircle2, XCircle, AlertCircle, Sparkles, ArrowRight
} from "lucide-react";
import { jobApi } from "../api/career";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
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

function FilterSidebar({ filters, onChange, onAddJob }) {
  return (
    <aside className="w-64 shrink-0 flex flex-col gap-4 sticky top-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal size={12} /> Filter Roles
        </span>
        <button
          onClick={() => onChange({ remoteStatus: "", employmentType: "", experienceLevel: "", savedOnly: false })}
          className="text-[10px] font-semibold text-primary hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text-secondary">Work Mode</label>
        {["", "remote", "hybrid", "onsite"].map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text hover:text-primary">
            <input
              type="radio"
              name="remoteStatus"
              value={val}
              checked={filters.remoteStatus === val}
              onChange={() => onChange({ ...filters, remoteStatus: val })}
              className="accent-primary w-3.5 h-3.5"
            />
            <span>{val === "" ? "All Modes" : val.charAt(0).toUpperCase() + val.slice(1)}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text-secondary">Job Type</label>
        {["", "Full-time", "Part-time", "Contract", "Internship"].map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text hover:text-primary">
            <input
              type="radio"
              name="employmentType"
              value={val}
              checked={filters.employmentType === val}
              onChange={() => onChange({ ...filters, employmentType: val })}
              className="accent-primary w-3.5 h-3.5"
            />
            <span>{val === "" ? "All Types" : val}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-border pt-3">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text hover:text-primary">
          <input
            type="checkbox"
            checked={filters.savedOnly}
            onChange={e => onChange({ ...filters, savedOnly: e.target.checked })}
            className="accent-primary w-3.5 h-3.5 rounded"
          />
          <span className="flex items-center gap-1.5">
            <Bookmark size={12} /> Saved Jobs Only
          </span>
        </label>
      </div>

      <Button
        onClick={onAddJob}
        variant="primary"
        size="sm"
        className="w-full mt-2"
      >
        <Plus size={14} /> Add Target Job
      </Button>
    </aside>
  );
}

function JobCard({ job, onSelect, onSave, onDelete }) {
  const normScore = job.matchScore != null ? normalizeScore(job.matchScore) : null;

  return (
    <div
      onClick={() => onSelect(job)}
      className="group relative bg-surface rounded-xl border border-border p-4 cursor-pointer transition-all duration-150 hover:border-border/80 hover:shadow-xs flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-bg-secondary border border-border flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-text-muted truncate m-0">{job.company}</p>
              <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors leading-tight line-clamp-1 m-0">
                {job.title}
              </h3>
            </div>
          </div>

          {normScore != null && (
            <Badge variant={normScore >= 80 ? "success" : normScore >= 60 ? "warning" : "secondary"} size="xs" className="shrink-0 font-bold">
              {normScore}% Fit
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 my-2.5">
          {job.location && (
            <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
              <MapPin size={10} /> {job.location}
            </span>
          )}
          {job.remoteStatus && <RemoteBadge status={job.remoteStatus} />}
          {job.salaryDisplay && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
              {job.salaryDisplay}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-[11px] text-text-muted mt-2">
        <span>{job.requiredSkills?.length || 0} skills required</span>

        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); onSave(job._id); }}
            title={job.isSaved ? "Saved" : "Save Job"}
            className={`p-1.5 rounded-md transition-colors ${job.isSaved ? "text-primary bg-primary-bg" : "text-text-muted hover:text-text hover:bg-bg-secondary"}`}
          >
            {job.isSaved ? <Bookmark size={13} fill="currentColor" /> : <BookmarkPlus size={13} />}
          </button>
          
          <button
            onClick={e => { e.stopPropagation(); onDelete(job); }}
            title="Delete Job"
            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddJobForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "", company: "", location: "", employmentType: "", experienceLevel: "",
    remoteStatus: "", salaryDisplay: "", url: "", description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!form.title?.trim() || !form.company?.trim() || !form.description?.trim()) {
      setError("Please provide Job Title, Company Name, and Job Description.");
      return;
    }
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-text m-0">Add Target Job</h2>
            <p className="text-[11px] text-text-secondary m-0">AI will parse skills from job description</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-secondary rounded-lg text-text-muted hover:text-text">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          {error && (
            <div className="text-xs text-danger bg-danger-bg p-2.5 rounded-lg border border-danger-border">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Job Title *</label>
              <input
                type="text" required placeholder="Senior Frontend Engineer"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg h-8 px-2.5 text-xs text-text focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Company *</label>
              <input
                type="text" required placeholder="Acme Inc."
                value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg h-8 px-2.5 text-xs text-text focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Work Mode</label>
              <select value={form.remoteStatus} onChange={e => setForm({ ...form, remoteStatus: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs text-text outline-none">
                <option value="">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Type</label>
              <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg h-8 px-2 text-xs text-text outline-none">
                <option value="">Any</option>
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Salary</label>
              <input type="text" placeholder="$140k - $160k" value={form.salaryDisplay} onChange={e => setForm({ ...form, salaryDisplay: e.target.value })}
                className="w-full bg-surface border border-border rounded-lg h-8 px-2.5 text-xs text-text outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-secondary mb-1">Job Description *</label>
            <textarea required rows={5} placeholder="Paste job description..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-text focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" size="sm" isLoading={loading}>
              Save Target Job
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function JobBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [filters, setFilters] = useState({
    remoteStatus: "", employmentType: "", experienceLevel: "", savedOnly: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, [search, filters]);

  async function loadJobs() {
    setLoading(true);
    try {
      const res = await jobApi.getJobs({
        search,
        ...filters
      });
      const list = res.data || res || [];
      setJobs(list);
    } catch (err) {
      console.error("[JobBoardPage] Load jobs error:", err);
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
    } catch (err) {
      console.error("[JobBoardPage] Save job error:", err);
    }
  }

  async function confirmDeleteJob(jobId) {
    try {
      await jobApi.deleteJob(jobId);
      setJobs(prev => prev.filter(j => j._id !== jobId));
      setJobToDelete(null);
    } catch (err) {
      console.error("[JobBoardPage] Delete job error:", err);
      alert(err?.response?.data?.message || "Failed to delete job.");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Target Job Directory
            </span>
          </div>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Job Board & Fit Engine</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Explore target placements, extract required skills, and calculate profile fit.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Target Job
        </Button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onAddJob={() => setShowAdd(true)}
        />

        {/* Job List */}
        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search job title or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:border-primary outline-none"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner size="md" />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-8 text-center text-text-secondary">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="text-xs font-bold text-text m-0">No target jobs found</p>
              <p className="text-[11px] text-text-muted mt-0.5">Adjust your filters or click "Add Target Job" to ingest an opportunity.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobs.map(job => (
                <JobCard
                  key={job._id}
                  job={job}
                  onSelect={(j) => navigate(`/jobs/${j._id}`)}
                  onSave={handleSave}
                  onDelete={(j) => setJobToDelete(j)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddJobForm onClose={() => setShowAdd(false)} onSuccess={loadJobs} />}

      <DeleteJobModal
        job={jobToDelete}
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
      />
    </div>
  );
}
