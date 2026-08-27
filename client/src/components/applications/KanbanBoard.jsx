import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness } from "lucide-react";
import { applicationsApi } from "../../api/applications";
import { Card, CardContent } from "../ui/Card";
import { Spinner } from "../ui/Spinner";

const STATUSES = [
  { id: "saved", label: "Saved", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { id: "applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "screening", label: "Screening", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "interview", label: "Interview", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: "offer", label: "Offer", color: "bg-green-50 text-green-700 border-green-200" },
  { id: "rejected", label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" }
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
          <BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-border" />
          <p className="font-medium text-base">No applications found.</p>
          <p className="text-sm mt-1">Click 'Add Application' to get started.</p>
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
            className="flex flex-col bg-surface border border-border rounded-xl w-72 shrink-0 max-h-[70vh]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            <div className={`px-4 py-3 border-b border-border font-bold text-sm flex justify-between items-center ${status.color.replace('border-', 'border-b-')}`}>
              <span>{status.label}</span>
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{columnApps.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]">
              {columnApps.map(app => {
                const score = app.matchResultId?.overallScore;
                let scoreColor = "text-text-secondary bg-bg-secondary";
                if (score >= 75) scoreColor = "text-success bg-success-bg border-success/20";
                else if (score >= 50) scoreColor = "text-warning bg-warning-bg border-warning/20";
                else if (score) scoreColor = "text-danger bg-danger-bg border-danger/20";

                return (
                  <div
                    key={app._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app._id)}
                    onClick={() => navigate(`/applications/${app._id}`)}
                    className="bg-bg border border-border p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group"
                  >
                    <div className="font-bold text-text text-sm mb-1 group-hover:text-primary transition-colors">{app.role}</div>
                    <div className="text-xs text-text-secondary font-medium mb-3">{app.company}</div>
                    
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-[10px] text-text-secondary">
                        {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : "No Date"}
                      </span>
                      {score ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                          {score}% Fit
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
