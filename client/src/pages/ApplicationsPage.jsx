import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter, AlertCircle, BriefcaseBusiness } from "lucide-react";
import { applicationsApi } from "../api/applications";
import { toast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { LayoutGrid, List } from "lucide-react";
import { KanbanBoard } from "../components/applications/KanbanBoard";

const STATUSES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" }
];

export function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [viewMode, setViewMode] = useState("board"); // 'board' or 'table'

  useEffect(() => {
    loadApps();
  }, [search, statusFilter, sort]);

  async function handleStatusChange(appId, newStatus) {
    try {
      // Optimistically update the UI
      setApps(prev => prev.map(app => app._id === appId ? { ...app, status: newStatus } : app));
      await applicationsApi.update(appId, { status: newStatus });
      toast.success("Application status updated!");
    } catch (err) {
      toast.error("Failed to update status.");
      loadApps(); // Revert on failure
    }
  }

  async function loadApps() {
    try {
      const data = await applicationsApi.getAll({
        search,
        status: statusFilter,
        sort
      });
      setApps(data.applications);
    } finally {
      setLoading(false);
    }
  }

  const [form, setForm] = useState({ company: "", role: "", location: "", jd: "" });

  async function submitApp(e) {
    e.preventDefault();
    try {
      await applicationsApi.create({
        company: form.company,
        role: form.role,
        location: form.location,
        jobDescription: form.jd
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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">Applications</h1>
          <p className="text-text-secondary text-sm mt-1">Track and manage your job opportunities.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} className="mr-2" /> Add Application
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          <div className="flex w-full sm:w-auto gap-4">
            <div className="flex bg-surface border border-border rounded-lg p-1 mr-2">
              <button
                onClick={() => setViewMode("board")}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "board" ? "bg-bg shadow-sm text-primary" : "text-text-secondary hover:text-text"}`}
                title="Board View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "table" ? "bg-bg shadow-sm text-primary" : "text-text-secondary hover:text-text"}`}
                title="Table View"
              >
                <List size={18} />
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:w-40 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="flex-1 sm:w-48 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="createdAt">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="dateApplied">Date Applied (Newest)</option>
              <option value="dateAppliedAsc">Date Applied (Oldest)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {showAdd && (
        <Card className="animate-in fade-in zoom-in-95 duration-200 border-primary shadow-md">
          <CardContent className="p-6">
            <form onSubmit={submitApp} className="flex flex-col gap-5 max-w-2xl">
              <div>
                <h3 className="text-xl font-bold text-text">New Application</h3>
                <p className="text-sm text-text-secondary">Add details to generate insights and track progress.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input 
                  label="Company" 
                  required 
                  value={form.company} 
                  onChange={e => setForm({ ...form, company: e.target.value })} 
                />
                <Input 
                  label="Role" 
                  required 
                  value={form.role} 
                  onChange={e => setForm({ ...form, role: e.target.value })} 
                />
              </div>
              
              <Input 
                label="Location (Optional)" 
                value={form.location} 
                onChange={e => setForm({ ...form, location: e.target.value })} 
              />
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Job Description</label>
                <textarea
                  required
                  rows={6}
                  className="w-full bg-white border border-border rounded-lg p-3 text-text focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none transition-shadow text-sm"
                  value={form.jd}
                  onChange={e => setForm({ ...form, jd: e.target.value })}
                />
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <Button type="submit">Save & Analyze JD</Button>
                <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner size="lg" />
        </div>
      ) : viewMode === "board" ? (
        <KanbanBoard applications={apps} onStatusChange={handleStatusChange} loading={loading} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-secondary border-b border-border text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applied Date</th>
                  <th className="px-4 py-3 text-center">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                      <BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-border" />
                      <p className="font-medium text-base">No applications found.</p>
                      <p className="text-sm mt-1">Click 'Add Application' to get started.</p>
                    </td>
                  </tr>
                ) : (
                  apps.map(app => {
                    const score = app.matchResultId?.overallScore;
                    let scoreColor = "text-text-secondary";
                    if (score >= 75) scoreColor = "text-success font-bold";
                    else if (score >= 50) scoreColor = "text-warning font-bold";
                    else if (score) scoreColor = "text-danger font-bold";

                    return (
                      <tr 
                        key={app._id} 
                        onClick={() => navigate(`/applications/${app._id}`)}
                        className="hover:bg-bg cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-xs text-text group-hover:text-primary transition-colors">{app.role}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary font-medium">
                          {app.company}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="badge-pill bg-info-bg text-primary border border-blue-200 capitalize">
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary font-medium">
                          {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-xs">
                          {score ? (
                            <span className={scoreColor}>{score}%</span>
                          ) : (
                            <span className="text-text-secondary font-medium bg-bg-secondary px-2 py-0.5 rounded text-[11px]">N/A</span>
                          )}
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
    </div>
  );
}
