import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Clock, Target, BrainCircuit } from "lucide-react";
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
    <div className="content-layout">
      <div className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }} onClick={() => navigate("/interview")}>
            <ArrowLeft size={16} /> Back to Setup
          </button>
          <h2>Interview Performance Report</h2>
          <p>Detailed breakdown of your session for {session.targetRole}</p>
        </div>
        <div className="score-badge" style={{ fontSize: "2rem", padding: "1rem 2rem", backgroundColor: session.overallScore >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)', color: session.overallScore >= 70 ? 'var(--success-color)' : 'var(--warning-color)' }}>
          {Math.round(session.overallScore)}%
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Technical</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{Math.round(session.scores?.technical || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Communication</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{Math.round(session.scores?.communication || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Clarity</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{Math.round(session.scores?.clarity || 0)}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>Structure</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{Math.round(session.scores?.structure || 0)}</div>
        </div>
      </div>

      <h3 style={{ marginBottom: "1rem" }}>Question Breakdown ({answeredQuestions.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {answeredQuestions.length === 0 ? (
          <p className="text-secondary">No questions were answered in this session.</p>
        ) : (
          answeredQuestions.map((q, idx) => (
            <div key={q._id} className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <span className="eyebrow">Question {idx + 1} • {q.category}</span>
                  <h4 style={{ fontSize: "1.1rem", marginTop: "0.5rem" }}>{q.questionText}</h4>
                </div>
                <div className="score-badge">
                  {q.analysis.technicalAccuracy} / 100
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                <strong>Transcript: </strong> "{q.transcript}"
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <strong style={{ color: "var(--success-color)", display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Strengths</strong>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                    {q.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <strong style={{ color: "var(--danger-color)", display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Improvements</strong>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                    {q.feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
