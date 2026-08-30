import React, { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Target,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bookmark,
  Send,
  Mic,
  Award,
  XCircle,
  EyeOff,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Compass,
  Briefcase,
  MapPin,
  Zap,
  BarChart2
} from "lucide-react";
import { readinessApi, jobApi } from "../api/career";
import { analyticsApi } from "../api/features";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function DashboardPage() {
  const navigate = useNavigate();
  const [readinessData, setReadinessData] = useState(null);
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedBreakdown, setExpandedBreakdown] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [readinessRes, actionsRes, statsRes, jobsRes] = await Promise.all([
        readinessApi.getReadiness(),
        readinessApi.getActions(),
        analyticsApi.getDashboard().catch(() => ({ stats: null })),
        jobApi.getJobs({ savedOnly: true }).catch(() => ({ data: [] }))
      ]);

      if (readinessRes?.success) setReadinessData(readinessRes);
      if (actionsRes?.success) setActions(actionsRes.data);
      if (statsRes?.stats) setStats(statsRes.stats);

      // Process saved jobs for skill gap analysis
      const jobs = jobsRes?.data || [];
      setSavedJobs(jobs.slice(0, 3));

      // Build skill gap heatmap: count frequency of missing skills across all saved jobs
      const skillFrequency = {};
      jobs.forEach(job => {
        const allSkills = [
          ...(job.requiredSkills || []),
          ...(job.preferredSkills || [])
        ];
        allSkills.forEach(s => {
          if (s.skillName) {
            skillFrequency[s.skillName] = (skillFrequency[s.skillName] || 0) + 1;
          }
        });
      });
      const sorted = Object.entries(skillFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count, pct: Math.round((count / Math.max(jobs.length, 1)) * 100) }));
      setSkillGaps(sorted);

    } catch (err) {
      console.error(err);
      setError("Failed to load Career Command Center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDismiss = async (actionId) => {
    try {
      const res = await readinessApi.dismissAction(actionId);
      if (res?.success) {
        setActions(res.data);
        // Refresh score and history after action change
        const readinessRes = await readinessApi.getReadiness();
        if (readinessRes?.success) setReadinessData(readinessRes);
      }
    } catch (err) {
      console.error("Failed to dismiss action", err);
    }
  };

  const handleSnooze = async (actionId) => {
    try {
      const res = await readinessApi.snoozeAction(actionId, 24); // Snooze for 24 hours
      if (res?.success) {
        setActions(res.data);
      }
    } catch (err) {
      console.error("Failed to snooze action", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Spinner className="h-8 w-8 text-primary" />
        <span className="text-sm font-semibold text-text-secondary">Syncing Career Intelligence...</span>
      </div>
    );
  }

  const { readinessScore = 0, readinessBreakdown, readinessHistory = [] } = readinessData || {};
  const breakdownObj = readinessBreakdown || {};
  const { pipeline, primaryRole, recentApplications } = stats || {};

  const pipelineStages = [
    { label: "Saved", value: pipeline?.saved || 0, icon: Bookmark, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Applied", value: pipeline?.applied || 0, icon: Send, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Interview", value: pipeline?.interviewing || 0, icon: Mic, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Offer", value: pipeline?.offered || 0, icon: Award, color: "text-success", bg: "bg-success/10" },
    { label: "Rejected", value: pipeline?.rejected || 0, icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
  ];

  // SVG Gauge parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  // Breakdown mapping with custom colors and weighted values
  const breakdownLabels = [
    { key: "resume", label: "Resume / ATS Quality", weight: "15%" },
    { key: "technical", label: "Technical Competency", weight: "20%" },
    { key: "interview", label: "Interview Readiness", weight: "20%" },
    { key: "projects", label: "Project Portfolio", weight: "10%" },
    { key: "applications", label: "Application Health", weight: "10%" },
    { key: "preparation", label: "Daily Preparation Checklist", weight: "10%" },
    { key: "profile", label: "Career Profile", weight: "5%" },
    { key: "communication", label: "Communication Skills", weight: "5%" },
    { key: "careerStrategy", label: "Career Strategy & Mentorship", weight: "5%" }
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-16">
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-danger-bg p-4 border border-danger/20 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Career Placement Command Center</span>
          <h2 className="text-2xl sm:text-3xl font-black text-text m-0">
            {primaryRole?.title ? `${primaryRole.title} Track` : "Software Engineering Track"}
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-xl leading-relaxed m-0">
            Continuous gap analysis is active. Work on recommended priority tasks below to target open placements.
          </p>
        </div>

      </div>

      {/* Score and breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Circle Progress Gauge */}
        <Card className="shadow-sm border-border flex flex-col items-center justify-center p-6 bg-surface relative overflow-hidden group">
          <div className="absolute top-4 left-4">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest bg-bg-secondary px-2 py-0.5 rounded border border-border">Readiness Check</span>
          </div>

          <div className="relative flex items-center justify-center mt-6">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                className="text-bg-secondary"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
              <circle
                className="text-primary transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="72"
                cy="72"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-text leading-none">{readinessScore}%</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary mt-1">Ready</span>
            </div>
          </div>

          <p className="text-xs text-text-secondary text-center mt-6 max-w-[220px] leading-relaxed">
            Your readiness score tracks the strength of your profiles, submissions, and feedback.
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedBreakdown(!expandedBreakdown)}
            className="mt-4 font-bold text-xs text-primary gap-1 w-full hover:bg-bg-secondary"
          >
            <span>{expandedBreakdown ? "Hide Detail Breakdown" : "View Detail Breakdown"}</span>
            <ChevronRight className={`h-4 w-4 transform transition-transform ${expandedBreakdown ? "rotate-90" : ""}`} />
          </Button>
        </Card>

        {/* 9-Part Readiness Breakdown Panel */}
        <Card className={`lg:col-span-2 shadow-sm border-border transition-all duration-300 ${expandedBreakdown ? "opacity-100 h-auto" : "opacity-100"}`}>
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Compass size={16} className="text-primary" /> Readiness Metrics Breakdown
            </CardTitle>
            <span className="text-[10px] font-bold text-text-secondary">Weighted aggregate</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breakdownLabels.map((metric) => {
                const score = breakdownObj[metric.key] || 0;
                return (
                  <div key={metric.key} className="flex flex-col">
                    <div className="flex justify-between items-center text-xs font-semibold text-text mb-1">
                      <span className="truncate pr-2">{metric.label} <span className="text-[10px] text-text-secondary">({metric.weight})</span></span>
                      <span className="font-extrabold">{score}%</span>
                    </div>
                    <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden border border-border/20">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger"
                          }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Action Center */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-extrabold text-text flex items-center gap-2 m-0">
          <CheckCircle2 className="text-success h-5 w-5" /> Priority Next-Best Actions
        </h3>

        {actions.length === 0 ? (
          <Card className="border-border shadow-sm p-8 text-center bg-surface">
            <p className="text-sm text-text-secondary font-semibold italic m-0">
              🎉 You're all caught up! Keep submitting code and booking sessions to unlock open roles.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actions.map((action) => (
              <Card key={action.id} className="border-border shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all bg-surface overflow-hidden relative group">
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${action.priority === "HIGH" ? "bg-danger/10 text-danger border border-danger/20" :
                        action.priority === "MEDIUM" ? "bg-warning/10 text-warning border border-warning/20" :
                          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}>
                      {action.priority} Priority
                    </span>
                    <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                      +{action.pointsPotential} Score Pts
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-text m-0 group-hover:text-primary transition-colors">{action.title}</h4>
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed m-0 font-medium">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="bg-bg-secondary px-5 py-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleSnooze(action.id)}
                      title="Snooze for 24h"
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text hover:bg-border/30 transition-all bg-surface"
                    >
                      <Clock size={12} />
                    </button>
                    <button
                      onClick={() => handleDismiss(action.id)}
                      title="Dismiss permanently"
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-danger hover:bg-danger-bg transition-all bg-surface"
                    >
                      <EyeOff size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => navigate(action.ctaUrl)}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <span>{action.ctaText}</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Score History Timeline & Pipelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Historical score timeline */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Career Readiness Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
              {readinessHistory.length === 0 ? (
                <p className="text-xs text-text-secondary italic m-0">No historical activity logged yet.</p>
              ) : (
                readinessHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="flex flex-col relative group">
                    <span className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-primary group-hover:scale-110 transition-all shadow-sm"></span>
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-xs font-bold text-text">Readiness score updated to {entry.score}%</strong>
                      <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary mt-1">{entry.changeReason || "Calculated baseline score."}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic application pipelines status */}
        <Card className="shadow-sm border-border flex flex-col justify-between">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BriefcaseBusiness size={16} className="text-primary" /> Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              {pipelineStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.label} className="flex justify-between items-center bg-bg-secondary/40 border border-border/30 rounded-xl px-4 py-2.5 shadow-sm hover:bg-bg-secondary transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${stage.bg} ${stage.color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-text">{stage.label}</span>
                    </div>
                    <span className="text-sm font-extrabold text-text">{stage.value}</span>
                  </div>
                );
              })}
            </div>
            <Link
              to="/applications"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline border border-border/60 hover:border-primary/20 py-2 rounded-xl transition-all hover:bg-primary/5 mt-2 bg-surface"
            >
              <span>Manage Application Pipeline</span>
              <ArrowUpRight size={12} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── NEW: Saved Jobs + Skill Gap ── */}
      {(savedJobs.length > 0 || skillGaps.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* Top Saved Jobs */}
          {savedJobs.length > 0 && (
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold m-0 flex items-center gap-2">
                  <Bookmark size={16} className="text-blue-500" /> Saved Jobs
                </CardTitle>
                <Link to="/jobs?savedOnly=true" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {savedJobs.map(job => (
                  <Link to={`/jobs/${job._id}`} key={job._id}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl border border-border hover:border-primary/20 hover:bg-primary/5 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0">
                      <Briefcase size={14} className="text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text group-hover:text-primary truncate transition-colors">{job.title}</p>
                      <p className="text-xs text-text-secondary font-medium">{job.company}
                        {job.location && ` · ${job.location}`}
                        {job.remoteStatus && ` · ${job.remoteStatus}`}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-text-secondary shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Skill Gap Heatmap */}
          {skillGaps.length > 0 && (
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
                <CardTitle className="text-base font-bold m-0 flex items-center gap-2">
                  <BarChart2 size={16} className="text-violet-500" /> Skill Gap Heatmap
                </CardTitle>
                <p className="text-[11px] text-text-secondary mt-0.5">Most wanted skills across your saved jobs</p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2.5">
                {skillGaps.map(({ name, count, pct }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-text">{name}</span>
                      <span className="font-bold text-text-secondary">{count} job{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-text-secondary mt-2 italic">Skills in red appear across most of your saved jobs — prioritize these in your resume.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
