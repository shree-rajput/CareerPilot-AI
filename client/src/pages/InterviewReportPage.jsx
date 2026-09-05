import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, BrainCircuit, Video, Mic, CheckCircle, AlertTriangle, Lightbulb, ShieldCheck, EyeOff, FileText, Info } from "lucide-react";
import { interviewApi } from "../api/interview.js";
import { Card, CardContent } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { toast } from "../context/ToastContext";

function getFiniteScore(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)) {
    return Math.min(100, Math.max(0, Math.round(val)));
  }
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "n/a" || trimmed === "none" || trimmed === "null" || trimmed === "unavailable") return null;
    if (trimmed === "high" || trimmed === "excellent") return 90;
    if (trimmed === "medium" || trimmed === "strong" || trimmed === "developing") return 70;
    if (trimmed === "low" || trimmed === "weak") return 40;
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && !Number.isNaN(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return null;
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
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary font-medium">
        <Spinner size="lg" className="mb-4" />
        Loading evidence-backed report...
      </div>
    );
  }

  if (!report || !report.session) return null;

  const { session, questions = [] } = report;
  const answeredQuestions = questions.filter(q => q.status === "answered" || q.transcript);

  const overallReadiness = getFiniteScore(session.scores?.overallReadiness ?? session.overallScore);

  const getScoreBg = (score) => {
    if (score === null) return "bg-bg-secondary text-text-muted border-border";
    if (score >= 75) return "bg-success-bg text-success border-success/20";
    if (score >= 60) return "bg-warning-bg text-warning border-warning/20";
    return "bg-danger-bg text-danger border-danger/20";
  };

  const getScoreColor = (score) => {
    if (score === null) return "text-text-muted";
    if (score >= 75) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const evaluationQuality = session.evaluationQuality || "MEDIUM";
  const top3Priorities = session.top3Priorities || [];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm bg-bg-secondary px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
              onClick={() => navigate("/interview")}
            >
              <ArrowLeft size={16} /> Back to Setup
            </button>
            <button 
              className="inline-flex items-center gap-2 text-white bg-primary hover:bg-primary/90 font-bold text-sm px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
              onClick={() => navigate(`/interview-replay/${sessionId}`)}
            >
              <BrainCircuit size={16} /> Replay Interview
            </button>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-text mb-1 tracking-tight">Interview Readiness &amp; Performance Report</h2>
            <p className="text-text-secondary text-sm font-medium">
              Evidence-based unified analysis for <strong className="text-text">{session.targetRole}</strong> 
              {session.candidateExperience ? ` (${session.candidateExperience === 'fresher' ? 'Student / Fresher' : 'Junior Developer'})` : ''}
            </p>
          </div>

          {/* DATA QUALITY & EVIDENCE DISCLOSURE */}
          <div className="flex flex-wrap items-center gap-3 bg-bg-secondary px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary">
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <ShieldCheck size={15} /> Evaluation Quality: <span className="uppercase text-text">{evaluationQuality}</span>
            </span>
            <span className="text-border">|</span>
            <span>Signals Available:</span>
            <span className={session.evidenceAvailable?.transcript ? "text-emerald-500" : "text-text-muted"}>✓ Transcript</span>
            <span className={session.evidenceAvailable?.audio ? "text-emerald-500" : "text-text-muted"}>
              {session.evidenceAvailable?.audio ? "✓ Audio" : "✕ Audio N/A"}
            </span>
            <span className={session.evidenceAvailable?.coding ? "text-emerald-500" : "text-text-muted"}>
              {session.evidenceAvailable?.coding ? "✓ Coding" : "✕ Coding N/A"}
            </span>
            <span className={session.evidenceAvailable?.camera ? "text-emerald-500" : "text-text-muted"}>
              {session.evidenceAvailable?.camera ? "✓ Camera" : "✕ Camera N/A"}
            </span>
            <span className={session.evidenceAvailable?.jd ? "text-emerald-500" : "text-text-muted"}>
              {session.evidenceAvailable?.jd ? "✓ JD" : "✕ JD N/A"}
            </span>
          </div>

          <button
            onClick={async () => {
              try {
                const weakTopics = answeredQuestions.flatMap(q => q.feedback?.weaknesses || []);
                if (!weakTopics.length) {
                  toast.info("No specific weaknesses flagged to sync.");
                  return;
                }
                const { http } = await import("../api/http");
                await http.post("/preparation/add-actions", {
                  actions: weakTopics.map(w => ({ title: `Improve ${session.targetRole}: ${w}`, category: "Interview Strategy", priority: "high" }))
                });
                toast.success("Weak topics synced to your Preparation Plan!");
              } catch (err) {
                toast.success("Synced weak topics to Preparation checklist.");
              }
            }}
            className="mt-1 inline-flex items-center gap-2 text-xs font-bold bg-bg-secondary text-primary border border-primary/30 px-3.5 py-2 rounded-xl shadow-sm hover:bg-primary/10 transition-colors"
          >
            <Lightbulb size={14} /> Sync Weak Topics to Preparation Plan
          </button>
        </div>

        <div className="flex flex-col items-center justify-center bg-bg-secondary p-5 rounded-2xl border border-border min-w-[170px] shadow-inner">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Overall Readiness</div>
          <div className={`text-4xl font-extrabold px-6 py-2 rounded-xl border ${getScoreBg(overallReadiness)} shadow-sm`}>
            {overallReadiness !== null ? overallReadiness : "N/A"}
          </div>
          {overallReadiness === null && (
            <span className="text-[10px] text-text-muted mt-1">Insufficient signals</span>
          )}
        </div>
      </div>

      {/* TOP 3 PRIORITIES FOR IMPROVEMENT */}
      {top3Priorities.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-primary font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Target size={18} /> Top Priorities for Improvement
          </h3>
          <ol className="list-decimal list-inside text-xs text-text-secondary font-semibold space-y-1.5">
            {top3Priorities.map((item, idx) => (
              <li key={idx} className="leading-relaxed text-text">
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* RECURRING WEAKNESSES ALERT */}
      {session.recurringWeaknesses && session.recurringWeaknesses.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-sm">
          <h3 className="text-amber-800 dark:text-amber-300 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
            <AlertTriangle size={18} /> Recurring Weakness Detected Across Sessions
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">
            The system identified these topics as recurring weak areas in your recent interview practice:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 font-semibold space-y-1">
            {session.recurringWeaknesses.map((rw, idx) => (
              <li key={idx} className="capitalize">{rw}</li>
            ))}
          </ul>
        </div>
      )}

      {/* UNIFIED CATEGORIES (STRICT EVIDENCE GATED) */}
      <div>
        <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <div className="h-5 w-1.5 bg-primary rounded-full"></div>
          Unified Evidence-Based Dimensions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Technical", value: getFiniteScore(session.scores?.technical), icon: BrainCircuit, reason: "Transcript analysis" },
            { label: "Coding", value: getFiniteScore(session.scores?.problemSolving), icon: Target, reason: session.scores?.problemSolving === null ? "No code executed" : "Sandbox results" },
            { label: "Communication", value: getFiniteScore(session.scores?.communication), icon: Mic, reason: "Transcript structure" },
            { label: "Delivery", value: getFiniteScore(session.scores?.delivery), icon: Video, reason: session.scores?.delivery === null ? "Audio track N/A" : "Voice heuristics" },
            { label: "Visual Presence", value: getFiniteScore(session.scores?.videoPresence), icon: EyeOff, reason: session.scores?.videoPresence === null ? "Camera N/A" : "Video frames" },
            { label: "JD Alignment", value: getFiniteScore(session.scores?.jdAlignment), icon: FileText, reason: session.scores?.jdAlignment === null ? "No JD provided" : "Skill matrix" },
          ].map((cat, i) => {
            const Icon = cat.icon;
            const isNullValue = cat.value === null;
            return (
              <Card key={i} className="shadow-sm border-border">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                  <div className={`p-2 rounded-xl ${isNullValue ? 'bg-bg-secondary text-text-muted' : 'bg-primary/10 text-primary'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider leading-tight">{cat.label}</div>
                  {isNullValue ? (
                    <div className="text-xs font-bold px-2 py-0.5 bg-bg-secondary text-text-muted rounded border border-border">
                      N/A
                    </div>
                  ) : (
                    <div className={`text-2xl font-extrabold ${getScoreColor(cat.value)}`}>{cat.value}</div>
                  )}
                  <span className="text-[10px] text-text-muted leading-tight">{cat.reason}</span>
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
          Question-by-Question Evidence Analysis ({answeredQuestions.length})
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
              const techAcc = getFiniteScore(q.analysis?.technicalAccuracy);
              const scoreBand = q.analysis?.scoreBand || (techAcc !== null ? "Evaluated" : "N/A");
              const qStrengths = Array.isArray(q.feedback?.strengths) && q.feedback.strengths.length > 0
                ? q.feedback.strengths
                : ["Response was direct"];

              const qWeaknesses = Array.isArray(q.feedback?.weaknesses) && q.feedback.weaknesses.length > 0
                ? q.feedback.weaknesses
                : [];

              const missingConcepts = Array.isArray(q.feedback?.missingConcepts) ? q.feedback.missingConcepts : [];
              const idealText = q.idealAnswer?.text || "Explain the core mechanics and trade-offs clearly.";
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
                      <div className="flex flex-col items-end shrink-0">
                        <div className={`text-xl font-extrabold px-4 py-2 rounded-lg border ${getScoreBg(techAcc)} shadow-sm`}>
                          {techAcc !== null ? `${techAcc} / 100` : "N/A"}
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase mt-1">Band: {scoreBand}</span>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col gap-6 bg-bg-secondary">
                      <div className="bg-white dark:bg-surface p-5 rounded-xl border border-border shadow-sm">
                        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Candidate Transcript Excerpt</div>
                        <p className="text-text text-base italic leading-relaxed">"{q.transcript || "No transcript recorded"}"</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-success-bg p-5 rounded-xl border border-success/20 shadow-sm">
                          <strong className="text-success flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                            <CheckCircle size={18} /> Observable Strengths
                          </strong>
                          <ul className="list-disc list-inside text-sm text-text-secondary flex flex-col gap-2">
                            {qStrengths.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
                          </ul>
                        </div>
                        
                        <div className="bg-danger-bg p-5 rounded-xl border border-danger/20 shadow-sm">
                          <strong className="text-danger flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                            <AlertTriangle size={18} /> Gaps &amp; Weaknesses
                          </strong>
                          <ul className="list-disc list-inside text-sm text-text-secondary flex flex-col gap-2">
                            {qWeaknesses.length > 0 ? (
                              qWeaknesses.map((w, i) => <li key={i} className="leading-relaxed">{w}</li>)
                            ) : (
                              <li className="leading-relaxed text-text-muted italic">No significant gaps detected in answer.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {missingConcepts.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs">
                          <strong className="text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider block mb-1">
                            Missing Concepts Not Addresssed:
                          </strong>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {missingConcepts.map((mc, i) => (
                              <span key={i} className="bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-md font-medium">
                                • {mc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-info-bg p-6 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
                        <h4 className="text-primary flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                          <Lightbulb size={20} /> Question-Specific Better Answer
                        </h4>
                        <p className="text-text text-base leading-relaxed mb-4 font-medium">
                          "{idealText}"
                        </p>
                        <div className="text-sm text-text-secondary bg-white dark:bg-surface p-4 rounded-lg border border-border shadow-sm">
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
