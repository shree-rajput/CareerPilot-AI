import React from "react";
import { ArrowLeft, CheckCircle, Target, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { matchApi } from "../api/features";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

export function MatchResultPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchApi.getOne(id)
      .then(data => setMatch(data.matchResult))
      .catch(() => alert("Failed to load match result"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-text-secondary font-medium">
      <Spinner size="lg" className="mb-4" />
      Loading match result...
    </div>
  );
  
  if (!match) return (
    <div className="bg-danger-bg text-danger p-6 rounded-xl border border-danger/20 font-medium max-w-xl mx-auto text-center mt-12">
      Match result not found.
    </div>
  );

  const getScoreColor = (score) => {
    if (score >= 75) return "text-success bg-success-bg border-success/20";
    if (score >= 50) return "text-warning bg-warning-bg border-warning/20";
    return "text-danger bg-danger-bg border-danger/20";
  };

  const getScoreText = (score) => {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-danger";
  };
  
  const getScoreBg = (score) => {
    if (score >= 75) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <Link to={`/applications/${match.applicationId}`} className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm self-start transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-primary/10">
        <ArrowLeft size={16} /> Back to Application
      </Link>

      <Card className="shadow-sm border-border overflow-hidden text-center">
        <CardContent className="p-12 flex flex-col items-center justify-center bg-gradient-to-b from-surface to-bg-secondary">
          <h1 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">
            Deterministic Match Score
          </h1>
          <div className="relative">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-border" />
              <circle 
                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                strokeDasharray={2 * Math.PI * 88} 
                strokeDashoffset={2 * Math.PI * 88 * (1 - match.overallScore / 100)} 
                className={getScoreText(match.overallScore)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-extrabold ${getScoreText(match.overallScore)}`}>
                {match.overallScore}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT: EVIDENCE */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm border-border border-l-4 border-l-success">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-success-bg p-1.5 rounded-md text-success border border-success/20">
                <CheckCircle size={18} />
              </div>
              <CardTitle className="text-lg m-0 text-success">Strong Matches</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {match.evidence.filter(e => e.classification === "strong").map((e, i) => (
                  <div key={i} className="bg-success-bg p-4 rounded-xl border border-success/20">
                    <strong className="block text-sm text-text mb-1">JD: {e.requirement}</strong>
                    <p className="text-sm text-success font-medium">Resume: "{e.resumeEvidence}"</p>
                  </div>
                ))}
                {match.evidence.filter(e => e.classification === "strong").length === 0 && (
                  <p className="text-text-secondary italic text-sm">None found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border border-l-4 border-l-warning">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-warning-bg p-1.5 rounded-md text-warning border border-warning/20">
                <Target size={18} />
              </div>
              <CardTitle className="text-lg m-0 text-warning">Partial Matches</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {match.evidence.filter(e => e.classification === "partial").map((e, i) => (
                  <div key={i} className="bg-warning-bg p-4 rounded-xl border border-warning/20">
                    <strong className="block text-sm text-text mb-1">JD: {e.requirement}</strong>
                    <p className="text-sm text-warning font-medium">Resume: "{e.resumeEvidence}"</p>
                  </div>
                ))}
                {match.evidence.filter(e => e.classification === "partial").length === 0 && (
                  <p className="text-text-secondary italic text-sm">None found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border border-l-4 border-l-danger">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6 flex flex-row items-center gap-3">
              <div className="bg-danger-bg p-1.5 rounded-md text-danger border border-danger/20">
                <XCircle size={18} />
              </div>
              <CardTitle className="text-lg m-0 text-danger">Missing Evidence</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-3">
                {match.evidence.filter(e => e.classification === "missing").map((e, i) => (
                  <div key={i} className="bg-danger-bg p-3 rounded-lg border border-danger/20">
                    <strong className="block text-sm text-danger">{e.requirement}</strong>
                  </div>
                ))}
                {match.evidence.filter(e => e.classification === "missing").length === 0 && (
                  <p className="text-text-secondary italic text-sm">None found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: EXPLANATION & CATEGORIES */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <CardTitle className="text-lg m-0">AI Explanation</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap bg-surface p-4 rounded-xl border border-border">
                {match.explanation || "No explanation available."}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <CardTitle className="text-lg m-0">Category Scores</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-5">
                {Object.entries(match.categoryScores).map(([key, score]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-text-secondary capitalize tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <strong className={`text-sm font-extrabold ${getScoreText(score)}`}>{score}%</strong>
                    </div>
                    <div className="h-2.5 w-full bg-border rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-1000 ${getScoreBg(score)}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
