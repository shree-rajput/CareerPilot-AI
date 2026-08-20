import React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { applicationsApi } from "../api/applications";
import { matchApi } from "../api/features";
import { resumeApi } from "../api/resume";

export function ApplicationDetailPage() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [runningMatch, setRunningMatch] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  useEffect(() => {
    loadData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    try {
      const [appData, resumeData] = await Promise.all([
        applicationsApi.getOne(id),
        resumeApi.getAll()
      ]);
      setApp(appData.application);
      setResumes(resumeData.resumes);
      if (appData.application.matchResultId) {
        setMatchResult(appData.application.matchResultId); // populated object
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRunMatch() {
    if (!selectedResumeId) return alert("Select a resume first.");
    setRunningMatch(true);
    try {
      const data = await matchApi.runMatch(id, selectedResumeId);
      setMatchResult(data.matchResult);
      await loadData(); // refresh app state
    } catch (err) {
      alert(err.response?.data?.message || "Match failed.");
    } finally {
      setRunningMatch(false);
    }
  }

  if (loading) return <p>Loading application...</p>;
  if (!app) return <p>Not found.</p>;

  return (
    <section>
      <Link to="/applications" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#5b6475", textDecoration: "none", marginBottom: "20px" }}>
        <ArrowLeft size={16} /> Back to Board
      </Link>

      <div style={{ background: "white", padding: "30px", borderRadius: "8px", border: "1px solid #dde4ef", marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 8px" }}>{app.role}</h1>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#5b6475", fontWeight: "normal" }}>{app.company}</h2>
        <div style={{ marginTop: "16px", display: "inline-block", background: "#f5f7fb", padding: "6px 12px", borderRadius: "99px", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase" }}>
          Status: {app.status}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* JD Section */}
        <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
          <h3 style={{ margin: "0 0 16px" }}>Job Requirements</h3>
          {app.extractedJd ? (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ display: "block", marginBottom: "4px" }}>Required Skills:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {app.extractedJd.requiredSkills.map(s => <span key={s} style={{ background: "#eef2f6", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>{s}</span>)}
                </div>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: "4px" }}>Tools:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {app.extractedJd.tools.map(s => <span key={s} style={{ background: "#eef2f6", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>{s}</span>)}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#5b6475" }}>AI extraction pending or failed.</p>
          )}
        </div>

        {/* Semantic Match Section */}
        <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
          <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={20} color="#1463ff" /> Semantic Match Engine
          </h3>

          {matchResult ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "3rem", fontWeight: "900", color: matchResult.overallScore >= 75 ? "#00a884" : matchResult.overallScore >= 50 ? "#f59e0b" : "#b4233c" }}>
                  {matchResult.overallScore}%
                </div>
                <span style={{ color: "#5b6475", fontSize: "0.9rem" }}>Overall Match Score</span>
              </div>

              <Link to={`/match/${matchResult._id}`} className="primary-button" style={{ width: "100%", textDecoration: "none" }}>
                View Full Evidence & Explanation
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ color: "#5b6475", marginBottom: "16px", lineHeight: 1.5 }}>
                Run the match engine to compare your resume against the JD requirements using local semantic embeddings.
              </p>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <select
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                >
                  <option value="">Select a resume to match...</option>
                  {resumes.map(r => <option key={r._id} value={r._id}>{r.name} (v{r.version})</option>)}
                </select>
                <button
                  className="primary-button"
                  onClick={handleRunMatch}
                  disabled={runningMatch || !selectedResumeId}
                >
                  {runningMatch ? "Analyzing..." : "Run Match"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
