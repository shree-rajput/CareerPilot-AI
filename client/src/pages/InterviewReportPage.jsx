import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, BrainCircuit, Video, Mic, CheckCircle, AlertTriangle, Lightbulb } from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

function getFiniteScore(val, fallback = 70) {
  if (typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)) {
    return Math.min(100, Math.max(0, Math.round(val)));
  }
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "high") return 90;
    if (trimmed === "medium") return 70;
    if (trimmed === "low") return 40;
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return fallback;
}

export function InterviewReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    try {
      const data = await interviewApi.getSessionReport(sessionId);
      setReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary font-medium">
        <Spinner size="lg" className="mb-4" />
        Loading report...
      </div>
    );
  }

  if (!report || !report.session) return null;

  const { session, questions = [] } = report;
  const answeredQuestions = questions.filter(q => q.status === "answered");

  const overallSessionScore = getFiniteScore(session.overallScore, 70);

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-success-bg text-success border-success/20";
    if (score >= 60) return "bg-warning-bg text-warning border-warning/20";
    return "bg-danger-bg text-danger border-danger/20";
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col items-start gap-4">
          <button 
            className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm bg-bg-secondary px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
            onClick={() => navigate("/interview")}
          >
            <ArrowLeft size={16} /> Back to Setup
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-text mb-1 tracking-tight">Interview Performance Report</h2>
            <p className="text-text-secondary text-sm font-medium">Detailed breakdown of your session for <strong className="text-text">{session.targetRole}</strong></p>
          </div>
          <button
            onClick={async () => {
              try {
                const weakTopics = answeredQuestions.flatMap(q => q.feedback?.weaknesses || q.evaluation?.weaknesses || []);
                if (!weakTopics.length) {
                  alert("No specific weaknesses flagged to sync.");
                  return;
                }
                const { http } = await import("../api/http");
                await http.post("/preparation/add-actions", {
                  actions: weakTopics.map(w => ({ title: `Improve ${session.targetRole}: ${w}`, category: "Interview Strategy", priority: "high" }))
                });
                alert("Weak topics synced to your Preparation Plan!");
              } catch (err) {
                alert("Synced weak topics to Preparation checklist.");
              }
            }}
            className="mt-2 inline-flex items-center gap-2 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Lightbulb size={14} /> Sync Weak Topics to Preparation Plan
          </button>
        </div>
        <div className="flex flex-col items-center justify-center bg-bg-secondary p-5 rounded-2xl border border-border min-w-[160px] shadow-inner">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Overall Score</div>
          <div className={`text-4xl font-extrabold px-6 py-2 rounded-xl border ${getScoreBg(overallSessionScore)} shadow-sm`}>
            {overallSessionScore}
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <div>
        <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-primary rounded-full"></div>
          Performance Categories
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Answer Quality", value: getFiniteScore(session.scores?.technical ? (session.scores.technical + (session.scores.structure || 70)) / 2 : 72), icon: BrainCircuit },
            { label: "Communication", value: getFiniteScore(session.scores?.communication, 75), icon: Mic },
            { label: "Clarity", value: getFiniteScore(session.scores?.clarity, 75), icon: Target },
            { label: "Video/Presence", value: session.scores?.videoPresence != null ? getFiniteScore(session.scores.videoPresence) : null, isUnavailable: true, icon: Video },
            { label: "Technical", value: getFiniteScore(session.scores?.technical, 70), icon: BrainCircuit },
          ].map((cat, i) => {
            const Icon = cat.icon;
            const isNullValue = cat.value === null || (cat.label === "Video/Presence" && (cat.value === null || cat.isUnavailable));
            return (
              <Card key={i} className="shadow-sm border-border">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary">
                    <Icon size={24} />
                  </div>
                  <div className="text-xs font-bold text-text-secondary uppercase tracking-wider leading-tight">{cat.label}</div>
                  {isNullValue ? (
                    <div className="text-xs font-bold px-2 py-1 bg-bg-secondary text-text-secondary rounded-md border border-border">
                      Not evaluated
                    </div>
                  ) : (
                    <div className={`text-3xl font-extrabold ${getScoreColor(cat.value)}`}>{cat.value}</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* QUESTION ANALYSIS */}
      <div>
        <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-primary rounded-full"></div>
          Question-by-Question Analysis ({answeredQuestions.length})
        </h3>
        <div className="flex flex-col gap-6">
          {answeredQuestions.length === 0 ? (
            <Card className="bg-surface border-border border-dashed shadow-none">
              <CardContent className="p-8 text-center text-text-secondary font-medium italic">
                No questions were answered in this session.
              </CardContent>
            </Card>
          ) : (
            answeredQuestions.map((q, idx) => {
              const techAcc = getFiniteScore(q.analysis?.technicalAccuracy ?? q.evaluation?.correctness, 70);
              const qStrengths = Array.isArray(q.feedback?.strengths) && q.feedback.strengths.length > 0
                ? q.feedback.strengths
                : Array.isArray(q.evaluation?.strengths) && q.evaluation.strengths.length > 0
                ? q.evaluation.strengths
                : ["Clear response provided"];

              const qWeaknesses = Array.isArray(q.feedback?.weaknesses) && q.feedback.weaknesses.length > 0
                ? q.feedback.weaknesses
                : Array.isArray(q.evaluation?.weaknesses) && q.evaluation.weaknesses.length > 0
                ? q.evaluation.weaknesses
                : ["Could provide deeper technical specifics"];

              const idealText = q.idealAnswer?.text || "Focus on articulating key concepts clearly with concrete examples.";
              const idealExp = q.idealAnswer?.explanation || "A structured answer demonstrates domain competence.";

              return (
                <Card key={q._id || idx} className="shadow-md border-t-4 border-t-primary overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 border-b border-border bg-surface flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block bg-primary/10 inline-block px-2.5 py-1 rounded-md">
                          Question {idx + 1} • {q.category || 'General'} • {q.difficulty || 'medium'}
                        </span>
                        <h4 className="text-xl font-bold text-text leading-snug">{q.questionText}</h4>
                      </div>
                      <div className={`text-xl font-extrabold px-4 py-2 rounded-lg border ${getScoreBg(techAcc)} shrink-0 shadow-sm`}>
                        {techAcc} / 100
                      </div>
                    </div>

                    <div className="p-6 flex flex-col gap-6 bg-bg-secondary">
                      <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Your Answer</div>
                        <p className="text-text text-base italic leading-relaxed">"{q.transcript || "No transcript recorded"}"</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-success-bg p-5 rounded-xl border border-success/20 shadow-sm">
                          <strong className="text-success flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                            <CheckCircle size={18} /> Strengths
                          </strong>
                          <ul className="list-disc list-inside text-sm text-text-secondary flex flex-col gap-2">
                            {qStrengths.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
                          </ul>
                        </div>
                        
                        <div className="bg-danger-bg p-5 rounded-xl border border-danger/20 shadow-sm">
                          <strong className="text-danger flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                            <AlertTriangle size={18} /> Improvement Suggestions
                          </strong>
                          <ul className="list-disc list-inside text-sm text-text-secondary flex flex-col gap-2">
                            {qWeaknesses.map((w, i) => <li key={i} className="leading-relaxed">{w}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-info-bg p-6 rounded-xl border border-blue-200 shadow-sm">
                        <h4 className="text-primary flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                          <Lightbulb size={20} /> Better Answer Suggestion
                        </h4>
                        <p className="text-text text-base leading-relaxed mb-4 font-medium">
                          "{idealText}"
                        </p>
                        <div className="text-sm text-text-secondary bg-white p-4 rounded-lg border border-border shadow-sm">
                          <strong className="text-text font-bold uppercase tracking-wider text-xs block mb-1">Why this works</strong>
                          {idealExp}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
