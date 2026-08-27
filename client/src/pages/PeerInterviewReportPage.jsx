import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, Target, BarChart2, MessageSquare, Award } from "lucide-react";

export default function PeerInterviewReportPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await http.get(`/interview-rooms/${roomId}/report`);
        const data = response.data?.data;
        setReport(data);
      } catch (err) {
        console.error("Failed to load report:", err);
        setError("Failed to load the interview report. It may not exist or you don't have access.");
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
        <h2 className="text-xl font-bold">Loading Interview Report...</h2>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg text-text">
        <AlertCircle className="mb-4 h-12 w-12 text-danger" />
        <h2 className="text-xl font-bold text-danger">Unable to load report</h2>
        <p className="mt-2 text-text-secondary font-medium">{error || "No report data found for this interview."}</p>
        <button
          onClick={() => navigate("/peer-interview")}
          className="mt-6 flex items-center rounded-lg bg-surface border border-border px-4 py-2 hover:bg-bg-secondary shadow-sm transition-all text-text font-bold"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-20 relative overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/peer-interview")}
            className="p-2 hover:bg-bg-secondary rounded-full transition-all duration-300 text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-border"></div>
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-info-bg text-primary font-bold border border-blue-200">
            CP
          </div>
          <h1 className="text-sm font-bold tracking-wide text-text">Interview Report</h1>
          <span className="ml-2 rounded-full bg-success-bg px-3 py-1 text-xs font-bold text-green-700 border border-green-200 shadow-sm">
            Completed
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-12 px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-4xl font-extrabold text-text mb-3 tracking-tight">
            AI Performance Summary
          </h2>
          <p className="text-text-secondary text-lg">Detailed breakdown of the candidate's interview session</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-left-4 duration-500 delay-100 fill-mode-both">
            <div className="flex items-center gap-5 mb-4">
              <div className="h-14 w-14 rounded-xl bg-info-bg border border-blue-200 flex items-center justify-center text-primary shadow-sm">
                <Target className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-1">Overall Score</h3>
                <div className="text-4xl font-extrabold text-text">
                  {report.overallScore || 0}<span className="text-xl text-text-secondary font-medium">/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-right-4 duration-500 delay-100 fill-mode-both">
            <div className="flex items-center gap-5 mb-4">
              <div className="h-14 w-14 rounded-xl bg-success-bg border border-green-200 flex items-center justify-center text-success shadow-sm">
                <BarChart2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-1">Recommendation</h3>
                <div className="text-4xl font-extrabold text-text capitalize">
                  {report.hireRecommendation || "Undecided"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm mb-8 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-bg border border-yellow-200 shadow-sm">
              <Award className="h-5 w-5 text-warning" />
            </div>
            Performance Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-bg rounded-xl p-6 border border-border text-center shadow-sm">
              <div className="text-3xl font-extrabold text-primary mb-2">{report.scores?.technical || 0}/100</div>
              <div className="text-xs text-text-secondary uppercase tracking-widest font-bold">Technical</div>
            </div>
            <div className="bg-bg rounded-xl p-6 border border-border text-center shadow-sm">
              <div className="text-3xl font-extrabold text-purple-600 mb-2">{report.scores?.communication || 0}/100</div>
              <div className="text-xs text-text-secondary uppercase tracking-widest font-bold">Communication</div>
            </div>
            <div className="bg-bg rounded-xl p-6 border border-border text-center shadow-sm">
              <div className="text-3xl font-extrabold text-teal-600 mb-2">{report.scores?.problemSolving || 0}/100</div>
              <div className="text-xs text-text-secondary uppercase tracking-widest font-bold">Problem Solving</div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-bg border border-green-200 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              Strengths
            </h3>
            <ul className="space-y-4">
              {report.strengths?.length > 0 ? (
                report.strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-4 text-text p-4 rounded-xl bg-bg border border-border shadow-sm">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-success shrink-0"></div>
                    <span className="leading-relaxed text-sm font-medium">{str}</span>
                  </li>
                ))
              ) : (
                <li className="text-text-secondary text-sm italic p-4 text-center border border-dashed border-border rounded-xl bg-bg">No strengths recorded.</li>
              )}
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-bg border border-yellow-200 shadow-sm">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              Areas for Improvement
            </h3>
            <ul className="space-y-4">
              {report.improvements?.length > 0 ? (
                report.improvements.map((imp, idx) => (
                  <li key={idx} className="flex gap-4 text-text p-4 rounded-xl bg-bg border border-border shadow-sm">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-warning shrink-0"></div>
                    <span className="leading-relaxed text-sm font-medium">{imp}</span>
                  </li>
                ))
              ) : (
                <li className="text-text-secondary text-sm italic p-4 text-center border border-dashed border-border rounded-xl bg-bg">No improvements recorded.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-surface border border-border rounded-2xl p-8 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
          <h3 className="text-xl font-bold text-text mb-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info-bg border border-blue-200 shadow-sm">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            Detailed Feedback
          </h3>
          <div className="p-6 rounded-xl bg-bg border border-border shadow-sm">
            <p className="text-text leading-relaxed whitespace-pre-line text-sm font-medium">
              {report.summary || "No summary provided."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
