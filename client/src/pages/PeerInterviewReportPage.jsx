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
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(null);

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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
        <h2 className="text-xl font-semibold">Loading Interview Report...</h2>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-red-400">Unable to load report</h2>
        <p className="mt-2 text-gray-400">{error || "No report data found for this interview."}</p>
        <button
          onClick={() => navigate("/peer-interview")}
          className="mt-6 flex items-center rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#111111]/80 backdrop-blur-md px-6 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/peer-interview")}
            className="p-2 hover:bg-white/10 rounded-full transition-all duration-300 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-white/10"></div>
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 font-bold border border-white/5">
            CP
          </div>
          <h1 className="text-sm font-bold tracking-wide">Interview Report</h1>
          <span className="ml-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            Completed
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-12 px-4 relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-3 drop-shadow-sm">
            AI Performance Summary
          </h2>
          <p className="text-gray-400 text-lg">Detailed breakdown of the candidate's interview session</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] hover:border-white/20 animate-in fade-in slide-in-from-left-4 duration-500 delay-100 fill-mode-both group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
            <div className="flex items-center gap-5 mb-4 relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Target className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-1">Overall Score</h3>
                <div className="text-4xl font-extrabold text-white">
                  {report.overallScore || 0}<span className="text-xl text-gray-500 font-medium">/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] hover:border-white/20 animate-in fade-in slide-in-from-right-4 duration-500 delay-100 fill-mode-both group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors"></div>
            <div className="flex items-center gap-5 mb-4 relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <BarChart2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-1">Recommendation</h3>
                <div className="text-4xl font-extrabold text-white capitalize drop-shadow-md">
                  {report.hireRecommendation || "Undecided"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl mb-8 transition-all duration-300 hover:border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            Performance Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 text-center transition-all duration-300 hover:bg-white/[0.02] hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">{report.scores?.technical || 0}/100</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Technical</div>
            </div>
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 text-center transition-all duration-300 hover:bg-white/[0.02] hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">{report.scores?.communication || 0}/100</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Communication</div>
            </div>
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 text-center transition-all duration-300 hover:bg-white/[0.02] hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">{report.scores?.problemSolving || 0}/100</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Problem Solving</div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
          <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-white/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-green-500/10 transition-colors"></div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              Strengths
            </h3>
            <ul className="space-y-4 relative z-10">
              {report.strengths?.length > 0 ? (
                report.strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-4 text-gray-300 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0"></div>
                    <span className="leading-relaxed text-sm font-medium">{str}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm italic p-4 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">No strengths recorded.</li>
              )}
            </ul>
          </div>

          <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-white/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/10 transition-colors"></div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              Areas for Improvement
            </h3>
            <ul className="space-y-4 relative z-10">
              {report.improvements?.length > 0 ? (
                report.improvements.map((imp, idx) => (
                  <li key={idx} className="flex gap-4 text-gray-300 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] shrink-0"></div>
                    <span className="leading-relaxed text-sm font-medium">{imp}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm italic p-4 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">No improvements recorded.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-[#111111]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-white/20 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
          <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            Detailed Feedback
          </h3>
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 relative z-10">
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm font-medium">
              {report.summary || "No summary provided."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
