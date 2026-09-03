import React from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { Badge } from "../ui/Badge";

const STATUSES = [
  { id: "saved", label: "Saved", headerBg: "bg-slate-100/80 text-slate-700 border-slate-200" },
  { id: "applied", label: "Applied", headerBg: "bg-blue-50/80 text-blue-700 border-blue-200" },
  { id: "screening", label: "Screening", headerBg: "bg-indigo-50/80 text-indigo-700 border-indigo-200" },
  { id: "interview", label: "Interview", headerBg: "bg-amber-50/80 text-amber-700 border-amber-200" },
  { id: "offer", label: "Offer", headerBg: "bg-emerald-50/80 text-emerald-700 border-emerald-200" },
  { id: "rejected", label: "Rejected", headerBg: "bg-rose-50/80 text-rose-700 border-rose-200" }
];

export function KanbanBoard({ applications, onStatusChange, loading }) {
  const navigate = useNavigate();

  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData("appId", appId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("appId");
    if (appId) {
      onStatusChange(appId, statusId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner size="lg" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-text-secondary">
          <div className="w-10 h-10 rounded-lg bg-bg-secondary text-text-muted flex items-center justify-center mx-auto mb-3">
            <BriefcaseBusiness size={20} />
          </div>
          <h3 className="font-bold text-sm text-text m-0">No job applications found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Start tracking job opportunities to monitor interview progression, resume match scores, and application history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
      {STATUSES.map(status => {
        const columnApps = applications.filter(app => app.status === status.id);
        
        return (
          <div 
            key={status.id}
            className="flex flex-col bg-surface border border-border rounded-xl w-72 shrink-0 max-h-[72vh] shadow-2xs"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column Header */}
            <div className={`px-3.5 py-2.5 border-b border-border font-bold text-xs flex justify-between items-center ${status.headerBg}`}>
              <span>{status.label}</span>
              <span className="bg-surface/80 px-2 py-0.5 rounded text-[10px] font-mono border border-border/40">
                {columnApps.length}
              </span>
            </div>
            
            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[140px]">
              {columnApps.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-[11px] text-text-muted italic border border-dashed border-border/60 rounded-lg">
                  Drag items here
                </div>
              ) : (
                columnApps.map(app => {
                  const score = app.matchResultId?.overallScore;

                  return (
                    <div
                      key={app._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app._id)}
                      onClick={() => navigate(`/applications/${app._id}`)}
                      className="bg-surface border border-border p-3 rounded-lg shadow-2xs cursor-grab active:cursor-grabbing hover:border-primary-border transition-all group"
                    >
                      <h4 className="font-bold text-text text-xs m-0 group-hover:text-primary transition-colors truncate">
                        {app.role}
                      </h4>
                      <p className="text-[11px] text-text-secondary font-medium mt-0.5 mb-2 truncate">
                        {app.company}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                        <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
                          <Calendar size={10} />
                          {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Draft"}
                        </span>

                        {score ? (
                          <Badge variant={score >= 75 ? "success" : score >= 50 ? "warning" : "danger"} size="xs">
                            {score}% Match
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
