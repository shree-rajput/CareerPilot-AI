import React from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  XCircle, 
  Sparkles, 
  FileText, 
  TrendingUp, 
  ListChecks, 
  RefreshCw, 
  MinusCircle,
  PlusCircle,
  BookOpen
} from "lucide-react";

export default function AnalysisDashboard({ matchResult, tailoringData, isCached }) {
  if (!matchResult) return null;

  const { overallScore, categoryScores, matchedSkills, partialSkills, missingSkills, evidence, explanation } = matchResult;
  const recommendations = tailoringData?.tailoring?.recommendations || tailoringData?.recommendations || [];

  return (
    <div
      style={{
        padding: "24px",
        display: "grid",
        gap: "28px",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", fontWeight: 700 }}>
          Match Analysis Dashboard
        </h2>
        {isCached && (
          <span
            style={{
              padding: "4px 8px",
              background: "#f1f5f9",
              color: "#64748b",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
          >
            Previously Analyzed (Cached)
          </span>
        )}
      </div>

      {/* Main Score Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        <ATSScoreCard score={overallScore} />
        <ScoreBreakdown categoryScores={categoryScores} />
      </div>

      {/* Skills Analysis */}
      <SkillsAnalysis 
        matched={matchedSkills} 
        partial={partialSkills} 
        missing={missingSkills} 
      />

      {/* AI Explanation */}
      <AIExplanation explanation={explanation} />

      {/* Evidence Panel */}
      <EvidencePanel evidence={evidence} />

      {/* Tailoring Recommendations */}
      <TailoringRecommendations recommendations={recommendations} />
    </div>
  );
}

/* ==========================================
   ATS SCORE CARD
   ========================================== */
function ATSScoreCard({ score }) {
  let color = "#ef4444"; // default red
  let rating = "Weak Match";
  
  if (score >= 85) {
    color = "#10b981"; // green
    rating = "Strong Match";
  } else if (score >= 70) {
    color = "#3b82f6"; // blue
    rating = "Good Match";
  } else if (score >= 50) {
    color = "#f59e0b"; // yellow
    rating = "Fair Match";
  }

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
        Overall ATS Match Score
      </span>
      
      <div style={{ position: "relative", width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Simple inline circular indicator */}
        <svg style={{ width: "120px", height: "120px", transform: "rotate(-90deg)" }}>
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="#e2e8f0"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="314"
            strokeDashoffset={314 - (314 * score) / 100}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{score}</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>/ 100</span>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "6px 12px",
          borderRadius: "99px",
          background: color + "15",
          color: color,
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        {rating}
      </div>
    </div>
  );
}

/* ==========================================
   SCORE BREAKDOWN
   ========================================== */
function ScoreBreakdown({ categoryScores }) {
  if (!categoryScores || Object.keys(categoryScores).length === 0) return null;

  // Format category keys to readable labels
  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: "0.88rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Score Breakdown
      </h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {Object.entries(categoryScores).map(([category, value]) => {
          const pct = Math.round(value <= 1 ? value * 100 : value);
          let barColor = "#3b82f6";
          if (pct >= 85) barColor = "#10b981";
          else if (pct < 50) barColor = "#ef4444";

          return (
            <div key={category}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#334155", marginBottom: "4px", fontWeight: 500 }}>
                <span>{formatLabel(category)}</span>
                <span>{pct}%</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   SKILLS ANALYSIS
   ========================================== */
function SkillsAnalysis({ matched = [], partial = [], missing = [] }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        display: "grid",
        gap: "20px",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <ListChecks size={18} color="#1463ff" /> Skills Match Analysis
      </h3>

      {/* Matched Skills */}
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#137547", display: "flex", alignItems: "center", gap: "6px", fontWeight: 650 }}>
          <CheckCircle2 size={15} /> Matched Skills ({matched.length})
        </h4>
        {matched.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>No fully matched skills identified.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {matched.map((skill) => (
              <span key={skill} style={{ padding: "4px 10px", background: "#ecfdf3", color: "#137547", borderRadius: "99px", fontSize: "0.78rem", fontWeight: 500 }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Partial Skills */}
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#b25e00", display: "flex", alignItems: "center", gap: "6px", fontWeight: 650 }}>
          <HelpCircle size={15} /> Partial Skills ({partial.length})
        </h4>
        {partial.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>No partially matched skills.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {partial.map((skill) => (
              <span key={skill} style={{ padding: "4px 10px", background: "#fffbeb", color: "#b25e00", borderRadius: "99px", fontSize: "0.78rem", fontWeight: 500 }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Missing Skills */}
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#b4233c", display: "flex", alignItems: "center", gap: "6px", fontWeight: 650 }}>
          <XCircle size={15} /> Missing Skills ({missing.length})
        </h4>
        {missing.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#137547" }}>✓ Zero missing skills! Perfect coverage.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {missing.map((skill) => (
              <span key={skill} style={{ padding: "4px 10px", background: "#fff1f2", color: "#b4233c", borderRadius: "99px", fontSize: "0.78rem", fontWeight: 500 }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   AI EXPLANATION
   ========================================== */
function AIExplanation({ explanation }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <Sparkles size={18} color="#1463ff" /> AI Match Explanation
      </h3>
      <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "#334155" }}>
        {explanation || "AI explanation is currently unavailable, but your match score is still valid."}
      </p>
    </div>
  );
}

/* ==========================================
   EVIDENCE PANEL
   ========================================== */
function EvidencePanel({ evidence = [] }) {
  if (evidence.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <FileText size={18} color="#1463ff" /> Semantic Matching Evidence
      </h3>
      <div style={{ display: "grid", gap: "16px" }}>
        {evidence.map((item, index) => {
          let badgeBg = "#fff1f2";
          let badgeColor = "#b4233c";
          if (item.classification === "strong") {
            badgeBg = "#ecfdf3";
            badgeColor = "#137547";
          } else if (item.classification === "partial") {
            badgeBg = "#fffbeb";
            badgeColor = "#b25e00";
          }

          return (
            <div
              key={index}
              style={{
                padding: "16px",
                border: "1px solid #f1f5f9",
                borderRadius: "8px",
                background: "#f8fafc",
                display: "grid",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                  JD Requirement: {item.requirement}
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {item.classification}
                </span>
              </div>
              
              {(item.resumeEvidence || item.resumeSection) && (
                <div style={{ fontSize: "0.82rem", color: "#475569", borderLeft: "2px solid #cbd5e1", paddingLeft: "10px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "#64748b", marginBottom: "2px" }}>
                    Resume Evidence ({item.resumeSection || "General"}):
                  </div>
                  <div style={{ fontStyle: "italic" }}>"{item.resumeEvidence}"</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   TAILORING RECOMMENDATIONS
   ========================================== */
function TailoringRecommendations({ recommendations = [] }) {
  if (recommendations.length === 0) return null;

  // Group recommendations by type
  const grouped = recommendations.reduce((acc, item) => {
    const type = item.type || "rephrase";
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const typeIcons = {
    rephrase: <RefreshCw size={15} color="#3b82f6" />,
    highlight: <Sparkles size={15} color="#10b981" />,
    reorder: <TrendingUp size={15} color="#f59e0b" />,
    remove: <MinusCircle size={15} color="#ef4444" />,
    add: <PlusCircle size={15} color="#a855f7" />,
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <BookOpen size={18} color="#1463ff" /> Tailoring Recommendations
      </h3>

      <div style={{ display: "grid", gap: "20px" }}>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 750, color: "#475569", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              {typeIcons[type] || <HelpCircle size={15} />}
              <span>{capitalize(type)} Suggestions</span>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1463ff", textTransform: "uppercase" }}>
                      Section: {item.section}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: "8px", fontSize: "0.82rem" }}>
                    <div>
                      <strong style={{ color: "#64748b" }}>Current:</strong>
                      <div style={{ marginTop: "2px", color: "#334155" }}>{item.original}</div>
                    </div>
                    <div>
                      <strong style={{ color: "#10b981" }}>Suggested:</strong>
                      <div style={{ marginTop: "2px", color: "#0f172a", fontWeight: 500 }}>{item.suggestion}</div>
                    </div>
                    <div style={{ borderTop: "1px dashed #f1f5f9", paddingTop: "6px", color: "#475569", fontSize: "0.8rem" }}>
                      <strong>Reason:</strong> {item.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
