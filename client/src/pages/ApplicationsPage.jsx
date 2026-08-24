import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { applicationsApi } from "../api/applications";

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

  useEffect(() => {
    loadApps();
  }, [search, statusFilter, sort]);

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
      setShowAdd(false);
      setForm({ company: "", role: "", location: "", jd: "" });
      loadApps();
    } catch (err) {
      alert("Failed to save application.");
    }
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Applications</h1>
        <button className="primary-button" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Application
        </button>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", background: "white", padding: "16px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "#f5f7fb", padding: "8px 12px", borderRadius: "6px" }}>
          <Search size={18} color="#5b6475" />
          <input
            type="text"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", width: "100%", outline: "none" }}
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white" }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white" }}
        >
          <option value="createdAt">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="dateApplied">Date Applied (Newest)</option>
          <option value="dateAppliedAsc">Date Applied (Oldest)</option>
        </select>
      </div>

      {showAdd && (
        <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #dde4ef", marginBottom: "24px" }}>
          <form onSubmit={submitApp} style={{ display: "grid", gap: "16px", maxWidth: "600px" }}>
            <h3 style={{ margin: 0 }}>New Application</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label>Company <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "4px" }} /></label>
              <label>Role <input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "4px" }} /></label>
            </div>
            <label>Location (Optional)
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
            </label>
            <label>Job Description
              <textarea
                required
                rows={6}
                style={{ width: "100%", padding: "12px", marginTop: "4px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                value={form.jd}
                onChange={e => setForm({ ...form, jd: e.target.value })}
              />
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="submit" className="primary-button">Save & Analyze JD</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "none", border: 0, cursor: "pointer", color: "#5b6475", fontWeight: "bold" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading applications...</p>
      ) : (
        <div style={{ background: "white", borderRadius: "8px", border: "1px solid #dde4ef", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f5f7fb", borderBottom: "1px solid #dde4ef" }}>
              <tr>
                <th style={{ padding: "12px 16px", color: "#5b6475", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "12px 16px", color: "#5b6475", fontWeight: 600 }}>Company</th>
                <th style={{ padding: "12px 16px", color: "#5b6475", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "12px 16px", color: "#5b6475", fontWeight: 600 }}>Applied Date</th>
                <th style={{ padding: "12px 16px", color: "#5b6475", fontWeight: 600 }}>ATS Score</th>
              </tr>
            </thead>
            <tbody>
              {apps.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#5b6475" }}>No applications found.</td></tr>
              ) : (
                apps.map(app => (
                  <tr key={app._id} onClick={() => navigate(`/applications/${app._id}`)} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#1e293b" }}>{app.role}</td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>{app.company}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#eef2f6", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem", textTransform: "capitalize" }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>
                      {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {app.matchResultId ? (
                        <span style={{ fontWeight: 600, color: app.matchResultId.overallScore >= 75 ? "#00a884" : app.matchResultId.overallScore >= 50 ? "#f59e0b" : "#b4233c" }}>
                          {app.matchResultId.overallScore}%
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
