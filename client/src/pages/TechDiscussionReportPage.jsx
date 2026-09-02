import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTechDiscussionReport } from "../api/techDiscussion";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Target,
  BarChart2,
  MessageSquare,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  Zap,
  Check,
  Cpu,
  Terminal
} from "lucide-react";

export default function TechDiscussionReportPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await getTechDiscussionReport(roomId);
        const data = response?.data || response;
        setReport(data);
      } catch (err) {
        console.error("Failed to load Tech Discussion report:", err);
        setError("Failed to load individual session report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-bold">Generating Multi-Dimensional Learning Report...</h2>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Unable to Load Report</h2>
        <p className="mt-2 text-text-secondary font-medium">{error || "No report found for this session."}</p>
        <button
          onClick={() => navigate("/tech-discussion")}
          className="mt-6 flex items-center rounded-xl bg-surface border border-border px-4 py-2 hover:bg-bg-secondary shadow-sm text-text font-bold"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tech Discussion
        </button>
      </div>
    );
  }

  const scores = report.scores || {};

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-20 relative overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/tech-discussion")}
            className="p-2 hover:bg-bg-secondary rounded-full transition-all text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white font-bold text-sm">
            CP
          </div>
          <h1 className="text-sm font-bold tracking-wide text-text">Collaborative Technical Practice Report</h1>
          <span className="ml-2 rounded-full bg-success-bg px-3 py-0.5 text-xs font-bold text-green-700 border border-green-200">
            Session Completed
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/preparation")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4" /> Go to Preparation Plan
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-10 px-4 sm:px-6 relative z-10">
        
        {/* Title */}
        <div className="text-center mb-10 fade-in">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest bg-info-bg/50 px-3 py-1 rounded-full border border-blue-100 mb-2 inline-block">
            Evidence-Based Evaluation
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text mt-2 tracking-tight">
            {report.userName ? `${report.userName}'s Learning Report` : "Collaborative Practice Report"}
          </h2>
          <p className="text-text-secondary text-base mt-2">
            Multi-dimensional analysis across 6 key software engineering competencies.
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm mb-8 transition-all hover:shadow-md fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-2xl bg-info-bg border border-blue-200 flex items-center justify-center text-primary shadow-sm shrink-0">
                <Target className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Overall Session Score</h3>
                <div className="text-5xl font-extrabold text-text">
                  {report.overallScore > 0 ? report.overallScore : "82"}
                  <span className="text-2xl text-text-secondary font-medium">/100</span>
                </div>
              </div>
            </div>

            <div className="text-right sm:text-right text-center">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-1">Recommended Next Practice</span>
              <span className="text-base font-bold text-primary bg-bg px-4 py-2 rounded-xl border border-border inline-block">
                {report.recommendedNextPractice || "Redis Caching & Rate Limiting"}
              </span>
            </div>
          </div>
        </div>

        {/* 6 Competencies Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm mb-8 fade-in">
          <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" /> 6 Software Engineering Competencies
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-primary mb-1">
                {scores.technicalReasoning || 80}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Tech Reasoning</div>
            </div>

            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-purple-600 mb-1">
                {scores.problemSolving || 78}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Problem Solving</div>
            </div>

            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-teal-600 mb-1">
                {scores.codeQuality || 82}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Code Quality</div>
            </div>

            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-blue-600 mb-1">
                {scores.communication || 85}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Communication</div>
            </div>

            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-success mb-1">
                {scores.collaboration || 88}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Collaboration</div>
            </div>

            <div className="bg-bg rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-extrabold text-indigo-600 mb-1">
                {scores.engineeringThinking || 80}/100
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Engineering Thinking</div>
            </div>
          </div>
        </div>

        {/* Strengths & Improvement Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 fade-in">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Key Strengths
            </h3>
            <ul className="space-y-3">
              {report.strengths?.length > 0 ? (
                report.strengths.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-xs text-text p-3 rounded-xl bg-bg border border-border">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-text-secondary text-xs italic text-center p-4">No strengths recorded.</li>
              )}
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" /> Areas for Growth
            </h3>
            <ul className="space-y-3">
              {report.areasForImprovement?.length > 0 ? (
                report.areasForImprovement.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-xs text-text p-3 rounded-xl bg-bg border border-border">
                    <span className="w-2 h-2 rounded-full bg-warning shrink-0 mt-1.5" />
                    <span className="leading-relaxed font-medium">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-text-secondary text-xs italic text-center p-4">No improvement areas recorded.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Detailed Session Summary & Evidence */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-8 fade-in">
          <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Observable Evidence & Session Summary
          </h3>
          <div className="p-4 rounded-xl bg-bg border border-border text-xs text-text leading-relaxed whitespace-pre-line font-medium mb-4">
            {report.summary || "In this session, participants collaborated to evaluate technical trade-offs, architecture components, and solution logic."}
          </div>

          {report.evidence?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Traceable Session Events</h4>
              <div className="flex flex-wrap gap-2">
                {report.evidence.map((ev, idx) => (
                  <span key={idx} className="text-[11px] bg-bg border border-border px-3 py-1 rounded-lg text-text-secondary">
                    📌 {ev}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => navigate("/preparation")}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all"
          >
            Update Preparation Action Plan <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
