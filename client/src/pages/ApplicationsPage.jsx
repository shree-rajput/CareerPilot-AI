import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  BriefcaseBusiness,
  AlertTriangle,
  Check,
  X,
  History,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react";
import { applicationsApi } from "../api/applications";
import { toast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Badge } from "../components/ui/Badge";
import { KanbanBoard } from "../components/applications/KanbanBoard";
import { http } from "../api/http";

const STATUSES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "stale", label: "Stale" },
];

export function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [viewMode, setViewMode] = useState("board");

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("applied");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Audit Trail modal state
  const [auditApp, setAuditApp] = useState(null);

  useEffect(() => {
    loadApps();
  }, [search, statusFilter, sort]);

  async function loadApps() {
    try {
      const data = await applicationsApi.getAll({
        search,
        status: statusFilter,
        sort,
      });
      setApps(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(appId, newStatus) {
    try {
      setApps((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
      );
      await applicationsApi.update(appId, { status: newStatus });
      toast.success("Application status updated!");
    } catch (err) {
      toast.error("Failed to update status.");
      loadApps();
    }
  }

  async function handleConfirmSuggestion(applicationId, suggestionId, action) {
    try {
      await http.post("/applications/confirm-suggestion", {
        applicationId,
        suggestionId,
        action,
      });
      toast.success(`Suggestion ${action}ed!`);
      loadApps();
    } catch (err) {
      toast.error("Failed to process suggestion.");
    }
  }

  async function handleBulkUpdate() {
    if (selectedIds.length === 0) return;
    try {
      setBulkUpdating(true);
      await http.post("/applications/bulk-status", {
        applicationIds: selectedIds,
        newStatus: bulkStatus,
      });
      toast.success(`Updated ${selectedIds.length} applications to ${bulkStatus}!`);
      setSelectedIds([]);
      loadApps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk update failed.");
    } finally {
      setBulkUpdating(false);
    }
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === apps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(apps.map((a) => a._id));
    }
  };

  // Pending Suggestions Queue
  const pendingSuggestions = [];
  apps.forEach((app) => {
    (app.pendingStatusSuggestions || []).forEach((sug) => {
      if (sug.status === "pending") {
        pendingSuggestions.push({ app, sug });
      }
    });
  });

  const [form, setForm] = useState({ company: "", role: "", location: "", jd: "" });

  async function submitApp(e) {
    e.preventDefault();
    try {
      await applicationsApi.create({
        company: form.company,
        role: form.role,
        location: form.location,
        jobDescription: form.jd,
      });
      toast.success("Application saved successfully!");
      setShowAdd(false);
      setForm({ company: "", role: "", location: "", jd: "" });
      loadApps();
    } catch (err) {
      toast.error("Failed to save application.");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Career Pipeline
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Applications Tracker</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Manage active role submissions, auto-stale suggestions, and status audit trails.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> Add Application
        </Button>
      </div>

      {/* PENDING SUGGESTIONS QUEUE BANNER */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-2">
          {pendingSuggestions.map(({ app, sug }) => (
            <div
              key={sug._id}
              className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-text">
                    Status Suggestion: Change <span className="text-primary">{app.company}</span> ({app.role}) to{" "}
                    <span className="uppercase font-black text-warning">{sug.suggestedStatus}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    Reason: {sug.reason} • Source: <span className="font-semibold">{sug.source}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleConfirmSuggestion(app._id, sug._id, "confirm")}
                  className="px-3 py-1.5 rounded-lg bg-warning text-bg font-bold text-xs hover:bg-warning/90 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check size={13} /> Confirm
                </button>
                <button
                  onClick={() => handleConfirmSuggestion(app._id, sug._id, "dismiss")}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-text hover:bg-bg-secondary font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X size={13} /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-surface border border-primary/40 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} Application{selectedIds.length > 1 ? "s" : ""} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-secondary uppercase">Set Status:</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-text cursor-pointer outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              {bulkUpdating ? <Spinner size="xs" /> : "Apply Bulk Change"}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text-secondary text-xs hover:bg-bg-secondary cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Controls */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <input
              type="text"
              placeholder="Search role or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="flex bg-bg-secondary border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("board")}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                  viewMode === "board" ? "bg-surface text-primary shadow-2xs" : "text-text-secondary hover:text-text"
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                  viewMode === "table" ? "bg-surface text-primary shadow-2xs" : "text-text-secondary hover:text-text"
                }`}
                title="Table View"
              >
                <List size={15} />
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="createdAt">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="dateApplied">Date Applied</option>
            </select>
          </div>
        </div>
      </Card>

      {/* New Application Form */}
      {showAdd && (
        <Card className="border-primary-border bg-primary-bg/10">
          <CardContent className="p-5">
            <form onSubmit={submitApp} className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-text m-0">Add New Application</h3>
                <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
                  Record role details to calculate ATS match percentage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
                <Input
                  label="Role Title"
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>

              <Input
                label="Location (Optional)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Job Description
                </label>
                <textarea
                  required
                  rows={5}
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs text-text placeholder-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  placeholder="Paste complete job description text..."
                  value={form.jd}
                  onChange={(e) => setForm({ ...form, jd: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm">
                  Save & Perform Match
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main View */}
      {loading ? (
        <div className="flex justify-center items-center h-36">
          <Spinner size="md" />
        </div>
      ) : viewMode === "board" ? (
        <KanbanBoard applications={apps} onStatusChange={handleStatusChange} loading={loading} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-secondary border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === apps.length}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applied Date</th>
                  <th className="px-4 py-3 text-right">Audit History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                      <BriefcaseBusiness className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                      <p className="font-bold text-xs text-text m-0">No applications registered</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Click 'Add Application' to log a new submission.</p>
                    </td>
                  </tr>
                ) : (
                  apps.map((app) => {
                    const isSelected = selectedIds.includes(app._id);

                    return (
                      <tr
                        key={app._id}
                        onClick={() => navigate(`/applications/${app._id}`)}
                        className={`hover:bg-bg-secondary/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelect(app._id, e)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-text">{app.role}</td>
                        <td className="px-4 py-3 text-text-secondary font-medium">{app.company}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              app.status === "offer"
                                ? "success"
                                : app.status === "rejected"
                                ? "danger"
                                : app.status === "stale"
                                ? "muted"
                                : app.status === "interview"
                                ? "warning"
                                : "primary"
                            }
                            size="xs"
                          >
                            {app.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-muted font-mono">
                          {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : "Draft"}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setAuditApp(app)}
                            className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-primary transition-colors cursor-pointer"
                            title="View Audit Trail"
                          >
                            <History size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AUDIT TRAIL MODAL */}
      {auditApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex justify-between items-center bg-bg-secondary">
              <div>
                <h3 className="text-sm font-bold text-text m-0">Audit Trail History</h3>
                <p className="text-[11px] text-text-secondary m-0 mt-0.5">
                  {auditApp.company} — {auditApp.role}
                </p>
              </div>
              <button
                onClick={() => setAuditApp(null)}
                className="p-1 rounded-lg hover:bg-surface text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {auditApp.statusHistory && auditApp.statusHistory.length > 0 ? (
                auditApp.statusHistory.map((item, idx) => {
                  const sourceBadges = {
                    manual: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    auto_stale: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    email: "bg-purple-500/10 text-purple-500 border-purple-500/20",
                    calendar: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    ai: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                  };

                  const badgeStyle = sourceBadges[item.changedBy] || "bg-gray-500/10 text-gray-500";

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border bg-bg-secondary flex items-start gap-3 text-xs"
                    >
                      <Clock size={15} className="text-text-secondary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-text uppercase">
                            {item.fromStatus ? `${item.fromStatus} → ` : ""}
                            {item.toStatus || item.status}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${badgeStyle}`}>
                            {item.changedBy || "manual"}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-text-secondary m-0 mt-1">{item.note}</p>
                        )}
                        <div className="text-[10px] text-text-muted mt-1 font-mono">
                          {new Date(item.timestamp || item.changedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-text-secondary italic text-center py-6">
                  No status audit history recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
