import { ArrowLeft, CheckCircle, Target, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { matchApi } from "../api/features";

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

  if (loading) return <p>Loading match result...</p>;
  if (!match) return <p>Not found.</p>;

  const getScoreColor = (score) => {
    if (score >= 75) return "#00a884"; // green
    if (score >= 50) return "#f59e0b"; // yellow
    return "#b4233c"; // red
  };

  return (
    <section>
      <Link to={`/applications/${match.applicationId}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#5b6475", textDecoration: "none", marginBottom: "20px" }}>
        <ArrowLeft size={16} /> Back to Application
      </Link>

      <div style={{ background: "white", padding: "40px", borderRadius: "8px", border: "1px solid #dde4ef", marginBottom: "24px", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#5b6475", textTransform: "uppercase", letterSpacing: "1px" }}>Deterministic Match Score</h1>
        <div style={{ fontSize: "5rem", fontWeight: "900", color: getScoreColor(match.overallScore), lineHeight: 1 }}>
          {match.overallScore}%
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT: EVIDENCE */}
        <div style={{ display: "grid", gap: "24px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px", color: "#137547" }}>
              <CheckCircle size={20} /> Strong Matches
            </h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {match.evidence.filter(e => e.classification === "strong").map((e, i) => (
                <div key={i} style={{ padding: "12px", background: "#eaf8f0", borderRadius: "6px" }}>
                  <strong style={{ display: "block", marginBottom: "4px" }}>JD: {e.requirement}</strong>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#137547" }}>Resume: "{e.resumeEvidence}"</p>
                </div>
              ))}
              {match.evidence.filter(e => e.classification === "strong").length === 0 && <p style={{ color: "#5b6475" }}>None found.</p>}
            </div>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px", color: "#f59e0b" }}>
              <Target size={20} /> Partial Matches
            </h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {match.evidence.filter(e => e.classification === "partial").map((e, i) => (
                <div key={i} style={{ padding: "12px", background: "#fef3c7", borderRadius: "6px" }}>
                  <strong style={{ display: "block", marginBottom: "4px" }}>JD: {e.requirement}</strong>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#b45309" }}>Resume: "{e.resumeEvidence}"</p>
                </div>
              ))}
              {match.evidence.filter(e => e.classification === "partial").length === 0 && <p style={{ color: "#5b6475" }}>None found.</p>}
            </div>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px", color: "#b4233c" }}>
              <XCircle size={20} /> Missing Evidence
            </h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {match.evidence.filter(e => e.classification === "missing").map((e, i) => (
                <div key={i} style={{ padding: "12px", background: "#fff1f2", borderRadius: "6px", color: "#b4233c" }}>
                  <strong style={{ display: "block" }}>{e.requirement}</strong>
                </div>
              ))}
              {match.evidence.filter(e => e.classification === "missing").length === 0 && <p style={{ color: "#5b6475" }}>None found.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: EXPLANATION & CATEGORIES */}
        <div style={{ display: "grid", gap: "24px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px" }}>AI Explanation</h3>
            <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#30394c" }}>
              {match.explanation || "No explanation available."}
            </p>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 16px" }}>Category Scores</h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {Object.entries(match.categoryScores).map(([key, score]) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.9rem", textTransform: "capitalize" }}>
                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <strong>{score}%</strong>
                  </div>
                  <div style={{ height: "6px", background: "#dde4ef", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${score}%`, height: "100%", background: getScoreColor(score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
