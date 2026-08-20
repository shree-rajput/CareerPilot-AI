import React from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applicationsApi } from "../api/applications";

const COLUMNS = [
  { id: "saved", title: "Saved" },
  { id: "applied", title: "Applied" },
  { id: "oa", title: "Assessment" },
  { id: "interview", title: "Interview" },
  { id: "offer", title: "Offer" },
  { id: "rejected", title: "Rejected" }
];

function SortableAppCard({ app, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app._id,
    data: { status: app.status }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: "white",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #dde4ef",
    cursor: "grab",
    marginBottom: "10px",
    boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.1)" : "none"
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>{app.role}</h4>
      <span style={{ fontSize: "0.85rem", color: "#5b6475" }}>{app.company}</span>
    </div>
  );
}

export function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    try {
      const data = await applicationsApi.getAll();
      setApps(data.applications);
    } finally {
      setLoading(false);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id; // Could be a column ID or another card ID

    // Find the item being dragged
    const activeApp = apps.find(a => a._id === activeId);
    if (!activeApp) return;

    // Determine target status
    let targetStatus = overId;
    if (!COLUMNS.find(c => c.id === overId)) {
      // Dropped on another card
      const overApp = apps.find(a => a._id === overId);
      if (overApp) targetStatus = overApp.status;
    }

    if (activeApp.status === targetStatus) {
      // Reordering within same column (just UI update if we cared about strict order)
      return;
    }

    // Optimistic UI update
    setApps(current => current.map(a =>
      a._id === activeId ? { ...a, status: targetStatus } : a
    ));

    // Persist
    try {
      await applicationsApi.update(activeId, { status: targetStatus });
    } catch {
      // Revert on failure
      loadApps();
    }
  }

  const [form, setForm] = useState({ company: "", role: "", jd: "" });

  async function submitApp(e) {
    e.preventDefault();
    try {
      await applicationsApi.create({
        company: form.company,
        role: form.role,
        jobDescription: form.jd
      });
      setShowAdd(false);
      setForm({ company: "", role: "", jd: "" });
      loadApps();
    } catch (err) {
      alert("Failed to save application.");
    }
  }

  if (loading) return <p>Loading board...</p>;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button className="primary-button" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Application
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #dde4ef", marginBottom: "24px" }}>
          <form onSubmit={submitApp} style={{ display: "grid", gap: "16px", maxWidth: "600px" }}>
            <h3 style={{ margin: 0 }}>New Application</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label>Company <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
              <label>Role <input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></label>
            </div>
            <label>Job Description
              <textarea
                required
                rows={6}
                style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
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

      {/* KANBAN BOARD */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "16px" }}>
          {COLUMNS.map(col => {
            const colApps = apps.filter(a => a.status === col.id);

            return (
              <div key={col.id} style={{ flex: "0 0 280px", background: "#eef2f6", borderRadius: "8px", padding: "12px", minHeight: "60vh" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem", color: "#5b6475", display: "flex", justifyContent: "space-between" }}>
                  {col.title}
                  <span style={{ background: "#dde4ef", padding: "2px 8px", borderRadius: "99px", fontSize: "0.8rem" }}>{colApps.length}</span>
                </h3>

                <SortableContext id={col.id} items={colApps.map(a => a._id)} strategy={verticalListSortingStrategy}>
                  <div style={{ minHeight: "100px" }}>
                    {colApps.map(app => (
                      <SortableAppCard
                        key={app._id}
                        app={app}
                        onClick={() => navigate(`/applications/${app._id}`)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </section>
  );
}
