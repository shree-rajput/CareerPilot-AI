import React, { useEffect, useState } from "react";
import { BriefcaseBusiness, Target, TrendingUp, AlertCircle, CheckCircle, ChevronRight, Bookmark, Send, Mic, Award, XCircle } from "lucide-react";
import { analyticsApi } from "../api/features";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    analyticsApi.getDashboard()
      .then((dashboardRes) => {
        setStats(dashboardRes.stats);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  }

  const { readiness, pipeline, primaryRole, priorities, recentApplications } = stats || {};

  const pipelineStages = [
    { label: "Saved", value: pipeline?.saved || 0, icon: Bookmark, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Applied", value: pipeline?.applied || 0, icon: Send, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Interviewing", value: pipeline?.interviewing || 0, icon: Mic, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Offered", value: pipeline?.offered || 0, icon: Award, color: "text-success", bg: "bg-success/10" },
    { label: "Rejected", value: pipeline?.rejected || 0, icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-danger-bg p-4 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Target Role & Readiness Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">Primary Target Role</span>
              <h2 className="text-3xl font-extrabold text-text mb-2">
                {primaryRole?.title || "Not Set"}
              </h2>
              {primaryRole?.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {primaryRole.techStack.map(tech => (
                    <span key={tech} className="bg-bg-secondary border border-border text-text px-3 py-1 rounded-full text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {!primaryRole && (
                <p className="text-text-secondary mt-2">Set a target role in your profile settings to get personalized guidance.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border flex flex-col justify-center items-center p-6 bg-gradient-to-br from-bg to-bg-secondary">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Readiness Score</span>
          <div className="text-5xl font-black text-primary drop-shadow-sm">
            {readiness?.score || 0}<span className="text-2xl text-text-secondary">/100</span>
          </div>
          <p className="text-sm text-text-secondary mt-3 text-center">Based on profile, resume, match rate, and pipeline.</p>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <div>
        <h3 className="text-xl font-extrabold text-text mb-4">Application Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.label} className="border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                  <div className={`p-3 rounded-xl ${stage.bg} ${stage.color}`}>
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="text-3xl font-black text-text mt-2">{stage.value}</div>
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{stage.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Best Actions */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="text-success" size={20} /> Next Best Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {priorities?.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {priorities.map((priority, i) => (
                  <Link key={i} to={priority.action} className="p-5 hover:bg-bg-secondary transition-colors flex items-center justify-between group">
                    <span className="text-text font-medium">{priority.text}</span>
                    <ChevronRight size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-secondary italic">
                You're all caught up! Keep applying and practicing.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <BriefcaseBusiness className="text-primary" size={20} /> Recent Applications
            </CardTitle>
            <Link to="/applications" className="text-sm text-primary font-bold hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {recentApplications?.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {recentApplications.map((app) => (
                  <div key={app._id} className="p-5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-text">{app.role}</h4>
                      <p className="text-sm text-text-secondary">{app.company}</p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-bg-secondary border border-border text-text">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-secondary italic">
                No recent applications found. Start applying!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
