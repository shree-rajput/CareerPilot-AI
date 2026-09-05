import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Code2,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  Video,
  FileCode,
  Check,
  XCircle,
  HelpCircle
} from "lucide-react";
import { interviewApi } from "../api/interview";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function InterviewReplayPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReplay();
  }, [sessionId]);

  const fetchReplay = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interviewApi.getReplay(sessionId);
      setSessionData(data.session || null);
      setTimeline(data.timeline || []);
    } catch (err) {
      console.error("Failed to load interview replay:", err);
      setError("Failed to load interview replay. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyBadge = (score) => {
    if (score === null || score === undefined) return "bg-surface-hover text-text-muted";
    if (score >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (score >= 60) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/interview-history")}
            className="p-2 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text hover:bg-surface-hover transition-colors"
            title="Back to History"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Play size={14} />
              <span>Chronological Interview Replay</span>
            </div>
            <h1 className="text-xl font-bold text-text tracking-tight mt-0.5">
              {sessionData?.targetRole || "Interview Session"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/interview/${sessionId}/report`)}
            className="text-xs flex items-center gap-1.5"
          >
            <span>Final Report</span>
            <ChevronRight size={13} />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/interview")}
            className="text-xs flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Practice Another</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-text-muted">
          <div className="spinner mx-auto mb-3" />
          <p className="text-xs font-medium">Reconstructing interview turns &amp; evaluations...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center text-danger border-danger/30">
          <p className="text-xs font-medium">{error}</p>
        </Card>
      ) : timeline.length === 0 ? (
        <Card className="p-12 text-center text-text-muted space-y-2">
          <HelpCircle size={28} className="mx-auto text-text-muted mb-2" />
          <h3 className="text-sm font-bold text-text">No Turns Recorded</h3>
          <p className="text-xs text-text-muted">This interview session does not contain answered questions or code submissions.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Turn Navigator Sidebar (Desktop) */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1 mb-2">
              Interview Turns ({timeline.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {timeline.map((turn, idx) => {
                const isActive = idx === activeTurnIndex;
                const isCoding = turn.type === "CODING";

                return (
                  <button
                    key={turn.id || idx}
                    onClick={() => setActiveTurnIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 ${isActive
                        ? "bg-primary-bg/60 border-primary text-text shadow-2xs"
                        : "bg-surface border-border hover:border-border-hover text-text-secondary"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {isCoding ? (
                          <Code2 size={13} className="text-accent-amber shrink-0" />
                        ) : (
                          <Mic size={13} className="text-primary shrink-0" />
                        )}
                        <span>Turn {idx + 1}</span>
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-text-muted px-1.5 py-0.2 rounded bg-bg-secondary border border-border">
                        {isCoding ? "Coding" : turn.questionType || turn.category || "Verbal"}
                      </span>
                    </div>

                    <p className="line-clamp-2 font-medium text-text text-[11px] leading-snug">
                      {turn.questionText}
                    </p>

                    {!isCoding && turn.evaluation && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getAccuracyBadge(turn.evaluation.technicalAccuracy)}`}>
                          Score: {turn.evaluation.technicalAccuracy !== null ? `${turn.evaluation.technicalAccuracy}%` : "N/A"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Turn Detailed Replay View */}
          <div className="lg:col-span-8 space-y-5">
            {(() => {
              const currentTurn = timeline[activeTurnIndex];
              if (!currentTurn) return null;

              const isCoding = currentTurn.type === "CODING";

              return (
                <div className="space-y-5">
                  {/* Turn Header Card */}
                  <Card className="p-5 bg-surface border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-primary-bg px-2.5 py-1 rounded-md border border-primary/20">
                          Turn {activeTurnIndex + 1} of {timeline.length}
                        </span>
                        <span className="text-xs font-semibold text-text-muted uppercase">
                          {isCoding ? "Coding Challenge" : currentTurn.questionType || currentTurn.category || "Technical Question"}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-text-muted uppercase px-2 py-0.5 bg-bg-secondary rounded border border-border">
                        Difficulty: {currentTurn.difficulty || "medium"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-text leading-snug">
                        {currentTurn.questionText}
                      </h3>
                      {isCoding && currentTurn.description && (
                        <p className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg border border-border whitespace-pre-line font-mono">
                          {currentTurn.description}
                        </p>
                      )}
                    </div>
                  </Card>


                  {/* Candidate Answer Card */}
                  <Card className="p-5 bg-surface border-border space-y-3">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                      {isCoding ? <FileCode size={14} className="text-accent-amber" /> : <Mic size={14} className="text-primary" />}
                      <span>Candidate Submission</span>
                    </h4>

                    {isCoding ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>Language: <strong className="text-text uppercase">{currentTurn.userAnswer?.language || "javascript"}</strong></span>
                          <span>Passed: <strong className="text-emerald-400">{currentTurn.executionSummary?.passedTests || 0} / {currentTurn.executionSummary?.totalTests || 0}</strong> test cases</span>
                        </div>
                        <pre className="bg-[#0f172a] text-[#f8fafc] p-4 rounded-lg text-xs font-mono overflow-x-auto border border-border">
                          <code>{currentTurn.userAnswer?.code || "// No code submitted"}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentTurn.userAnswer?.userAudioUrl && (
                          <div className="bg-bg-secondary p-3 rounded-lg border border-border flex items-center gap-3">
                            <Volume2 size={18} className="text-primary" />
                            <audio controls src={currentTurn.userAnswer.userAudioUrl} className="w-full h-8" />
                          </div>
                        )}

                        <div className="bg-bg-secondary p-3.5 rounded-lg border border-border">
                          <p className="text-xs text-text leading-relaxed font-medium">
                            "{currentTurn.userAnswer?.transcript || "No verbal transcript captured for this question."}"
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Evaluation & AI Feedback Card */}
                  <Card className="p-5 bg-surface border-border space-y-4">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      <span>Evaluation &amp; Feedback</span>
                    </h4>

                    {!isCoding && currentTurn.evaluation && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-bg-secondary rounded-lg border border-border text-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Technical Accuracy</span>
                          <span className={`text-base font-extrabold px-2 py-0.5 rounded border inline-block mt-1 ${getAccuracyBadge(currentTurn.evaluation.technicalAccuracy)}`}>
                            {currentTurn.evaluation.technicalAccuracy !== null ? `${currentTurn.evaluation.technicalAccuracy}%` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-bg-secondary rounded-lg border border-border text-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Communication</span>
                          <span className="text-base font-extrabold text-text inline-block mt-1">
                            {currentTurn.evaluation.communication !== null ? `${currentTurn.evaluation.communication}%` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-bg-secondary rounded-lg border border-border text-center col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Performance Band</span>
                          <span className="text-xs font-bold text-accent-cyan inline-block mt-1 uppercase">
                            {currentTurn.evaluation.correctness}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* What Was Done Well */}
                    {currentTurn.evaluation?.strengths?.length > 0 && (
                      <div className="space-y-1.5">
                        <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>What Was Done Well</span>
                        </h5>
                        <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 pl-1">
                          {currentTurn.evaluation.strengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* What Could Be Improved */}
                    {currentTurn.evaluation?.weaknesses?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle size={13} />
                          <span>Areas for Improvement</span>
                        </h5>
                        <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 pl-1">
                          {currentTurn.evaluation.weaknesses.map((wk, idx) => (
                            <li key={idx}>{wk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expected / Ideal Approach */}
                    {currentTurn.evaluation?.idealAnswer?.text && (
                      <div className="p-3.5 bg-primary-bg/40 border border-primary/20 rounded-lg space-y-1">
                        <h5 className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Sparkles size={13} />
                          <span>Expected Ideal Approach</span>
                        </h5>
                        <p className="text-xs text-text-secondary leading-relaxed font-medium">
                          {currentTurn.evaluation.idealAnswer.text}
                        </p>
                        {currentTurn.evaluation.idealAnswer.explanation && (
                          <p className="text-[11px] text-text-muted italic pt-0.5">
                            {currentTurn.evaluation.idealAnswer.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Confidence & Delivery Signals Card */}
                  {currentTurn.deliverySignals && !currentTurn.deliverySignals.unavailable && (
                    <Card className="p-5 bg-surface border-border space-y-3">
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                        <Volume2 size={14} className="text-accent-cyan" />
                        <span>Confidence Signals &amp; Delivery</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-2.5 bg-bg-secondary rounded-lg border border-border">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Speaking Pace</span>
                          <span className="text-xs font-extrabold text-text mt-0.5 inline-block">
                            {currentTurn.deliverySignals.speakingPace || 130} WPM
                          </span>
                        </div>
                        <div className="p-2.5 bg-bg-secondary rounded-lg border border-border">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Filler Words</span>
                          <span className="text-xs font-extrabold text-text mt-0.5 inline-block">
                            {currentTurn.deliverySignals.fillerWords || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-bg-secondary rounded-lg border border-border">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Long Pauses</span>
                          <span className="text-xs font-extrabold text-text mt-0.5 inline-block">
                            {currentTurn.deliverySignals.longPauses || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-bg-secondary rounded-lg border border-border">
                          <span className="text-[10px] font-bold text-text-muted uppercase block">Hesitation</span>
                          <span className="text-xs font-extrabold text-text mt-0.5 inline-block">
                            {currentTurn.deliverySignals.hesitationScore || 0}/100
                          </span>
                        </div>
                      </div>

                      {currentTurn.deliverySignals.suggestion && (
                        <p className="text-xs text-text-secondary bg-bg-secondary p-2.5 rounded-lg border border-border font-medium">
                          💡 <strong>Coaching Suggestion:</strong> {currentTurn.deliverySignals.suggestion}
                        </p>
                      )}
                    </Card>
                  )}

                  {/* Video Presence Signals Card */}
                  {currentTurn.presenceSignals && !currentTurn.presenceSignals.unavailable && (
                    <Card className="p-5 bg-surface border-border space-y-2">
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                        <Video size={14} className="text-emerald-400" />
                        <span>Interview Presence Heuristics</span>
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg border border-border">
                        <span>Gaze Direction: <strong className="text-text">{currentTurn.presenceSignals.gazeConsistency || "Consistent"}</strong></span>
                        <span>Posture: <strong className="text-text">{currentTurn.presenceSignals.postureNotes || "Upright"}</strong></span>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
