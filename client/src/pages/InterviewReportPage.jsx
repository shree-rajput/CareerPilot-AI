import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, BrainCircuit, Video, Mic, CheckCircle, AlertTriangle } from "lucide-react";
import { interviewApi } from "../api/interview.js";

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
      <div className="content-layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <p className="text-secondary">Loading report...</p>
      </div>
    );
  }

  if (!report || !report.session) return null;

  const { session, questions } = report;
  const answeredQuestions = questions.filter(q => q.status === "answered");

  return (
    <div className="content-layout" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem", marginBottom: "1.5rem", borderRadius: "30px" }} onClick={() => navigate("/interview")}>
            <ArrowLeft size={18} /> Back to Setup
          </button>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Interview Performance Report</h2>
          <p className="text-secondary" style={{ fontSize: "1.1rem" }}>Detailed breakdown of your session for <strong>{session.targetRole}</strong></p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Overall Score</div>
          <div className="score-badge" style={{ 
            fontSize: "3rem", 
            padding: "1rem 2rem", 
            borderRadius: "16px",
            backgroundColor: session.overallScore >= 75 ? 'var(--success-bg)' : session.overallScore >= 60 ? 'var(--warning-bg)' : 'var(--danger-bg)', 
            color: session.overallScore >= 75 ? 'var(--success-color)' : session.overallScore >= 60 ? 'var(--warning-color)' : 'var(--danger-color)' 
          }}>
            {Math.round(session.overallScore)}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: "1.5rem" }}>Performance Categories</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <BrainCircuit size={24} style={{ margin: "0 auto", color: "var(--primary-color)" }} />
          <div className="eyebrow">Answer Quality</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{Math.round((session.scores?.technical + session.scores?.structure) / 2 || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Mic size={24} style={{ margin: "0 auto", color: "var(--primary-color)" }} />
          <div className="eyebrow">Communication</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{Math.round(session.scores?.communication || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Target size={24} style={{ margin: "0 auto", color: "var(--primary-color)" }} />
          <div className="eyebrow">Clarity</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{Math.round(session.scores?.clarity || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Video size={24} style={{ margin: "0 auto", color: "var(--primary-color)" }} />
          <div className="eyebrow">Video/Presence</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{Math.round(session.scores?.videoPresence || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <BrainCircuit size={24} style={{ margin: "0 auto", color: "var(--primary-color)" }} />
          <div className="eyebrow">Technical</div>
          <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{Math.round(session.scores?.technical || 0)}</div>
        </div>
      </div>

      <h3 style={{ marginBottom: "1.5rem" }}>Question-by-Question Analysis ({answeredQuestions.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {answeredQuestions.length === 0 ? (
          <p className="text-secondary card">No questions were answered in this session.</p>
        ) : (
          answeredQuestions.map((q, idx) => (
            <div key={q._id} className="card" style={{ padding: "2rem", borderTop: "4px solid var(--primary-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div style={{ paddingRight: "2rem" }}>
                  <span className="eyebrow" style={{ color: "var(--primary-color)" }}>Question {idx + 1} • {q.category} • {q.difficulty}</span>
                  <h4 style={{ fontSize: "1.25rem", marginTop: "0.75rem", lineHeight: "1.4" }}>{q.questionText}</h4>
                </div>
                <div className="score-badge" style={{ fontSize: "1.25rem", padding: "0.5rem 1rem" }}>
                  {q.analysis.technicalAccuracy} / 100
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1.25rem", borderRadius: "8px", color: "var(--text-secondary)", marginBottom: "2rem", fontStyle: "italic", lineHeight: "1.6" }}>
                <strong>Your Answer: </strong> "{q.transcript}"
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ backgroundColor: "rgba(34, 197, 94, 0.05)", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                  <strong style={{ color: "var(--success-color)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <CheckCircle size={18} /> Strengths
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: "1.5" }}>
                    {q.feedback.strengths.map((s, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{s}</li>)}
                  </ul>
                </div>
                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", padding: "1.25rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <strong style={{ color: "var(--danger-color)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <AlertTriangle size={18} /> Improvement Suggestions
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: "1.5" }}>
                    {q.feedback.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{w}</li>)}
                  </ul>
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(59, 130, 246, 0.05)", padding: "1.5rem", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <h4 style={{ color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", margin: 0 }}>
                  <BrainCircuit size={20} /> Better Answer Suggestion
                </h4>
                <p style={{ lineHeight: "1.6", marginBottom: "1rem", color: "var(--text-color)" }}>
                  "{q.idealAnswer?.text}"
                </p>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", backgroundColor: "rgba(0,0,0,0.05)", padding: "1rem", borderRadius: "6px" }}>
                  <strong>Why this works: </strong> {q.idealAnswer?.explanation}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
