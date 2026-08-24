import React, { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, MapPin, Link as LinkIcon, History, Edit3, Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { applicationsApi } from "../api/applications";
import { matchApi, tailoringApi } from "../api/features";
import { resumeApi } from "../api/resume";

const STATUSES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" }
];

export function ApplicationDetailPage() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [runningMatch, setRunningMatch] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceError, setIntelligenceError] = useState("");

  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [tailoringData, setTailoringData] = useState(null);
  const [loadingTailoring, setLoadingTailoring] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [appData, resumeData] = await Promise.all([
        applicationsApi.getOne(id),
        resumeApi.getAll()
      ]);
      const app = appData.application;
      setApp(app);
      setResumes(resumeData.resumes);
      setNotes(app.notes || "");
      if (app.resumeVersionId) setSelectedResumeId(app.resumeVersionId);
      if (app.matchResultId) {
        setMatchResult(app.matchResultId);
      }
      try {
        const intelligenceData = await applicationsApi.getIntelligence(id);
        setIntelligence(intelligenceData.intelligence);
        setIntelligenceError("");
      } catch {
        setIntelligence(null);
        setIntelligenceError("Application intelligence is unavailable for this record.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    try {
      const data = await applicationsApi.update(id, { status: newStatus });
      setApp(data.application);
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  async function saveNotes() {
    setIsSavingNotes(true);
    try {
      await applicationsApi.update(id, { notes });
    } catch (err) {
      alert("Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleRunMatch() {
    if (!selectedResumeId) return alert("Select a resume first.");
    setRunningMatch(true);
    try {
      await applicationsApi.update(id, { resumeVersionId: selectedResumeId });
      const data = await matchApi.runMatch(id, selectedResumeId);
      setMatchResult(data.matchResult);
      await loadData(); // refresh app state
    } catch (err) {
      alert(err.response?.data?.message || "Match failed.");
    } finally {
      setRunningMatch(false);
    }
  }

  async function fetchTailoring() {
    if (!selectedResumeId) return alert("Select a resume first.");
    setLoadingTailoring(true);
    try {
      const result = await tailoringApi.getRecommendations(id, selectedResumeId);
      if (result.success) {
        // Handle format from new ATS response. (result.data.tailoring.recommendations or string)
        setTailoringData(result.data?.tailoring?.recommendations || "No specific recommendations provided.");
      }
    } catch (err) {
      alert("Failed to fetch tailoring recommendations.");
    } finally {
      setLoadingTailoring(false);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>{app.role}</h1>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.2rem", color: "#5b6475", fontWeight: "normal" }}>{app.company}</h2>
            <div style={{ display: "flex", gap: "16px", color: "#5b6475", fontSize: "0.9rem" }}>
              {app.location && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={16}/> {app.location}</span>
              )}
              {app.jobUrl && (
                <a href={app.jobUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "4px", color: "#1463ff", textDecoration: "none" }}><LinkIcon size={16}/> Job Link</a>
              )}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#5b6475", marginBottom: "6px", fontWeight: 600 }}>Status</label>
            <select
              value={app.status}
              onChange={handleStatusChange}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", fontWeight: 600, textTransform: "capitalize" }}
            >
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Notes Section */}
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}><Edit3 size={18}/> Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add interview notes, recruiter contacts, or next steps here..."
              style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", minHeight: "100px", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button onClick={saveNotes} disabled={isSavingNotes} className="primary-button" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <Save size={16}/> {isSavingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>

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
          
          {/* Resume Tailoring Section */}
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={20} color="#1463ff" /> Resume Tailoring Recommendations
            </h3>
            {!matchResult ? (
              <p style={{ color: "#5b6475" }}>Run the match engine first to get tailoring recommendations.</p>
            ) : !tailoringData ? (
              <button className="secondary-button" onClick={fetchTailoring} disabled={loadingTailoring}>
                {loadingTailoring ? "Generating..." : "Generate Tailoring Recommendations"}
              </button>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {Array.isArray(tailoringData) ? tailoringData.map((rec, i) => (
                  <div key={i} style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px" }}>
                    <strong style={{ display: "block", marginBottom: "8px", color: "#1e293b" }}>{rec.suggestion || rec.title || "Suggestion"}</strong>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>{rec.rationale || rec.description || JSON.stringify(rec)}</p>
                  </div>
                )) : (
                  <p style={{ whiteSpace: "pre-wrap", color: "#475569" }}>{typeof tailoringData === 'string' ? tailoringData : JSON.stringify(tailoringData, null, 2)}</p>
                )}
              </div>
            )}
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Semantic Match Section */}
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={20} color="#1463ff" /> Semantic Match Engine
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#5b6475", marginBottom: "6px", fontWeight: 600 }}>Selected Resume</label>
              <select
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                value={selectedResumeId}
                onChange={e => setSelectedResumeId(e.target.value)}
              >
                <option value="">Select a resume to match...</option>
                {resumes.map(r => <option key={r._id} value={r._id}>{r.name} (v{r.version})</option>)}
              </select>
            </div>

            {matchResult ? (
              <div>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ fontSize: "3rem", fontWeight: "900", color: matchResult.overallScore >= 75 ? "#00a884" : matchResult.overallScore >= 50 ? "#f59e0b" : "#b4233c" }}>
                    {matchResult.overallScore}%
                  </div>
                  <span style={{ color: "#5b6475", fontSize: "0.9rem" }}>Overall Match Score</span>
                </div>
                <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
                  <button className="primary-button" onClick={handleRunMatch} disabled={runningMatch || !selectedResumeId} style={{ width: "100%", background: "white", color: "#1463ff", border: "1px solid #1463ff" }}>
                    {runningMatch ? "Analyzing..." : "Re-run Match"}
                  </button>
                  <Link to={`/match/${matchResult._id}`} className="primary-button" style={{ width: "100%", textDecoration: "none", textAlign: "center", boxSizing: "border-box" }}>
                    View Full Evidence & Explanation
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: "#5b6475", marginBottom: "16px", lineHeight: 1.5 }}>
                  Run the match engine to compare your resume against the JD requirements using local semantic embeddings.
                </p>
                <button
                  className="primary-button"
                  style={{ width: "100%" }}
                  onClick={handleRunMatch}
                  disabled={runningMatch || !selectedResumeId}
                >
                  {runningMatch ? "Analyzing..." : "Run Match"}
                </button>
              </div>
            )}
          </div>

          {/* Timeline Section */}
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}><History size={18} /> Timeline</h3>
            <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid #eef2f6" }}>
              {app.statusHistory.map((sh, idx) => (
                <div key={idx} style={{ marginBottom: idx === app.statusHistory.length - 1 ? 0 : "16px", position: "relative" }}>
                  <div style={{ position: "absolute", left: "-23px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#1463ff", border: "2px solid white" }}></div>
                  <strong style={{ display: "block", textTransform: "capitalize", color: "#1e293b" }}>{sh.status}</strong>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{new Date(sh.changedAt).toLocaleString()}</span>
                  {sh.note && <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#475569" }}>{sh.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Existing Intelligent Assistant UI below */}
      <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef", marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={20} color="#1463ff" /> Intelligent Application Assistant
        </h3>

        {intelligenceError && <div className="error-banner">{intelligenceError}</div>}

        {intelligence ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginBottom: "18px" }}>
                <div style={{ background: "#f5f7fb", borderRadius: "8px", padding: "14px" }}>
                  <span style={{ color: "#5b6475", fontSize: "0.85rem", fontWeight: 700 }}>Suitability</span>
                  <strong style={{ display: "block", marginTop: "6px", textTransform: "capitalize" }}>{intelligence.suitability}</strong>
                </div>
                <div style={{ background: "#f5f7fb", borderRadius: "8px", padding: "14px" }}>
                  <span style={{ color: "#5b6475", fontSize: "0.85rem", fontWeight: 700 }}>Match</span>
                  <strong style={{ display: "block", marginTop: "6px" }}>
                    {intelligence.matchPercentage === null ? "Run match" : `${intelligence.matchPercentage}%`}
                  </strong>
                </div>
              </div>

              <strong>Personalized advice</strong>
              <p style={{ color: "#5b6475", lineHeight: 1.6 }}>{intelligence.personalizedAdvice}</p>

              <strong>Missing keywords</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                {intelligence.missingKeywords.slice(0, 8).map((keyword) => (
                  <span key={keyword} style={{ background: "#fff1f2", color: "#b4233c", padding: "5px 9px", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700 }}>
                    {keyword}
                  </span>
                ))}
                {intelligence.missingKeywords.length === 0 && <span style={{ color: "#5b6475" }}>No missing keywords detected from current match evidence.</span>}
              </div>
            </div>

            <div>
              <strong>Relevant projects from your resume</strong>
              <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                {intelligence.relevantProjects.map((project) => (
                  <div key={`${project.name}-${project.description}`} style={{ background: "#f5f7fb", borderRadius: "8px", padding: "12px" }}>
                    <strong>{project.name}</strong>
                    <p style={{ margin: "6px 0", color: "#5b6475" }}>{project.description || "No description available."}</p>
                    <small>{(project.technologies || []).join(", ")}</small>
                  </div>
                ))}
                {intelligence.relevantProjects.length === 0 && (
                  <p style={{ color: "#5b6475" }}>No resume project clearly matches this JD yet. Do not fabricate one; improve your resume only with real evidence.</p>
                )}
              </div>

              <strong style={{ display: "block", marginTop: "16px" }}>Resume suggestions</strong>
              <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                {intelligence.resumeImprovementSuggestions.slice(0, 4).map((item) => (
                  <p key={item.skill} style={{ margin: 0, color: "#5b6475" }}>
                    <strong style={{ color: "#172033" }}>{item.skill}:</strong> {item.suggestion}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          !intelligenceError && <p style={{ color: "#5b6475" }}>Loading application intelligence...</p>
        )}
      </div>
    </section>
  );
}
