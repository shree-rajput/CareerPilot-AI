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
  ArrowUpRight,
  TrendingUp,
  Clock,
  Compass,
  Briefcase,
  BarChart2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { readinessApi, jobApi } from "../api/career";
import { analyticsApi } from "../api/features";
import { normalizeScore } from "../utils/scoreUtils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

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

      const jobs = jobsRes?.data || [];
      setSavedJobs(jobs.slice(0, 3));

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
        .slice(0, 6)
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
        const readinessRes = await readinessApi.getReadiness();
        if (readinessRes?.success) setReadinessData(readinessRes);
      }
    } catch (err) {
      console.error("Failed to dismiss action", err);
    }
  };

  const handleSnooze = async (actionId) => {
    try {
      const res = await readinessApi.snoozeAction(actionId, 24);
      if (res?.success) {
        setActions(res.data);
      }
    } catch (err) {
      console.error("Failed to snooze action", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner className="h-6 w-6 text-primary" />
        <span className="text-xs font-semibold text-text-secondary">Loading Career Intelligence...</span>
      </div>
    );
  }

  const { readinessScore = 0, readinessBreakdown, readinessHistory = [] } = readinessData || {};
  const breakdownObj = readinessBreakdown || {};
  const { pipeline, primaryRole } = stats || {};

  const pipelineStages = [
    { label: "Saved", value: pipeline?.saved || 0, icon: Bookmark, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Applied", value: pipeline?.applied || 0, icon: Send, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Interview", value: pipeline?.interviewing || 0, icon: Mic, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Offer", value: pipeline?.offered || 0, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Rejected", value: pipeline?.rejected || 0, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safeReadinessScore = normalizeScore(readinessScore);
  const strokeDashoffset = circumference - (safeReadinessScore / 100) * circumference;

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

  const primaryAction = actions.length > 0 ? actions[0] : null;
  const secondaryActions = actions.slice(1);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-danger-bg p-3.5 border border-danger-border/60 text-danger text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-medium m-0">{error}</p>
        </div>
      )}

      {/* Header Context Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40">
              Command Center
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs font-semibold text-text-secondary">
              {primaryRole?.title || "Software Engineering Track"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">
            Career Readiness Overview
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/resume")}>
            Resume Audit
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate("/interview")}>
            Practice Interview
          </Button>
        </div>
      </div>

      {/* Primary Highlight: Next Best Action */}
      {primaryAction && (
        <Card className="border-primary-border/60 bg-primary-bg/20">
          <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-primary text-white shrink-0 mt-0.5">
                <Sparkles size={18} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-surface px-2 py-0.5 rounded border border-primary-border/40">
                    Recommended Next Action
                  </span>
                  <Badge variant={primaryAction.priority === "HIGH" ? "danger" : "warning"} size="xs">
                    {primaryAction.priority} Priority
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-text m-0 tracking-tight">
                  {primaryAction.title}
                </h3>
                <p className="text-xs text-text-secondary m-0 max-w-2xl leading-relaxed">
                  <span className="font-semibold text-text">Why: </span>
                  {primaryAction.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSnooze(primaryAction.id)}
                className="text-text-secondary"
              >
                Snooze 24h
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(primaryAction.ctaUrl)}
              >
                <span>{primaryAction.ctaText || "Start Action"}</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Readiness Score Gauge & Metrics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Readiness Gauge Card */}
        <Card className="flex flex-col items-center justify-between p-5 bg-surface relative">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Readiness Score</span>
            <Badge variant="primary" size="xs">Overall</Badge>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                className="text-bg-secondary"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
              <circle
                className="text-primary transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-text tracking-tight">{safeReadinessScore}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-0.5">Readiness</span>
            </div>
          </div>

          <p className="text-xs text-text-secondary text-center max-w-[200px] leading-relaxed m-0">
            Calculated from ATS scores, interview assessments, and skill verification.
          </p>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => setExpandedBreakdown(!expandedBreakdown)}
            className="mt-3 text-xs text-primary gap-1 w-full"
          >
            <span>{expandedBreakdown ? "Hide Metrics Breakdown" : "View Metrics Breakdown"}</span>
            <ChevronRight className={`h-3.5 w-3.5 transform transition-transform ${expandedBreakdown ? "rotate-90" : ""}`} />
          </Button>
        </Card>

        {/* Breakdown Metrics Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
              <Compass size={15} className="text-primary" /> Metrics Breakdown
            </CardTitle>
            <span className="text-[10px] font-semibold text-text-muted">9 Assessment Factors</span>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {breakdownLabels.map((metric) => {
                const score = normalizeScore(breakdownObj[metric.key]);
                return (
                  <div key={metric.key} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs text-text font-medium">
                      <span className="truncate pr-2">{metric.label} <span className="text-[10px] text-text-muted">({metric.weight})</span></span>
                      <span className="font-bold text-text">{score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden border border-border/30">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score >= 80 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-rose-500"
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

      {/* Secondary Priority Actions */}
      {secondaryActions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2 m-0">
            <CheckCircle2 className="text-emerald-600 h-4 w-4" /> Priority Actions Checklist
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secondaryActions.map((action) => (
              <Card key={action.id} className="flex flex-col justify-between hover:border-border-hover transition-all">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant={action.priority === "HIGH" ? "danger" : "warning"} size="xs">
                      {action.priority}
                    </Badge>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      +{action.pointsPotential} Pts
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text m-0">{action.title}</h3>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed font-medium m-0 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="bg-bg-secondary/40 px-4 py-2.5 border-t border-border flex items-center justify-between gap-2 mt-auto">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSnooze(action.id)}
                      title="Snooze for 24h"
                      className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-secondary"
                    >
                      <Clock size={12} />
                    </button>
                    <button
                      onClick={() => handleDismiss(action.id)}
                      title="Dismiss permanently"
                      className="p-1 rounded text-text-muted hover:text-rose-600 hover:bg-rose-50"
                    >
                      <EyeOff size={12} />
                    </button>
                  </div>

                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => navigate(action.ctaUrl)}
                  >
                    <span>{action.ctaText}</span>
                    <ArrowUpRight size={12} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Application Pipeline & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Score History Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Readiness Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 relative pl-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
              {readinessHistory.length === 0 ? (
                <p className="text-xs text-text-muted italic m-0">No historical activity logged yet.</p>
              ) : (
                readinessHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="flex flex-col relative">
                    <span className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full border border-surface bg-primary shadow-2xs"></span>
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-xs font-semibold text-text">Readiness score updated to {normalizeScore(entry.score)}%</strong>
                      <span className="text-[10px] text-text-muted font-mono shrink-0">
                        {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-secondary mt-0.5">{entry.changeReason || "Calculated baseline score."}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Application Pipeline Status */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
              <BriefcaseBusiness size={15} className="text-primary" /> Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              {pipelineStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.label} className="flex justify-between items-center bg-bg-secondary/40 border border-border/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${stage.bg} ${stage.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-medium text-text">{stage.label}</span>
                    </div>
                    <span className="text-xs font-bold text-text">{stage.value}</span>
                  </div>
                );
              })}
            </div>
            <Link
              to="/applications"
              className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline py-1.5 rounded-lg border border-border hover:border-primary-border/60 transition-all mt-2 bg-surface"
            >
              <span>Manage Pipeline</span>
              <ArrowUpRight size={12} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Target Jobs & Skill Gap Analysis */}
      {(savedJobs.length > 0 || skillGaps.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {savedJobs.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                  <Bookmark size={15} className="text-primary" /> Saved Target Jobs
                </CardTitle>
                <Link to="/jobs" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight size={12} />
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {savedJobs.map(job => (
                  <Link to={`/jobs/${job._id}`} key={job._id}
                    className="flex items-center gap-3 p-2.5 bg-bg-secondary/40 rounded-lg border border-border/40 hover:border-border-hover transition-all group">
                    <div className="w-7 h-7 rounded-md bg-surface border border-border flex items-center justify-center shrink-0">
                      <Briefcase size={14} className="text-text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text group-hover:text-primary truncate m-0">{job.title}</p>
                      <p className="text-[11px] text-text-secondary m-0">{job.company} {job.location && `· ${job.location}`}</p>
                    </div>
                    <ChevronRight size={14} className="text-text-muted shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {skillGaps.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-xs font-bold text-text flex items-center gap-2">
                  <BarChart2 size={15} className="text-primary" /> Target Job Skill Gaps
                </CardTitle>
                <Link to="/preparation" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Resolve <ArrowUpRight size={12} />
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {skillGaps.map(({ name, count, pct }) => (
                  <div key={name} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-text truncate">{name}</span>
                        <span className="text-[10px] text-text-muted font-mono">{count} target job{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden border border-border/30">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      onClick={() => navigate("/preparation")} 
                      className="shrink-0 text-[11px] h-6"
                    >
                      Practice
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
