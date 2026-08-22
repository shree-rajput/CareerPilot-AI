import React from "react";
import { BarChart3, BriefcaseBusiness, FileText, Lightbulb, Mic, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { analyticsApi } from "../api/features";

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      analyticsApi.getDashboard(),
      analyticsApi.getCareerIntelligence()
    ])
      .then(([dashboardRes, intelligenceRes]) => {
        setStats(dashboardRes.stats);
        setIntelligence(intelligenceRes.intelligence);
      })
      .catch(() => setError("Failed to load dashboard intelligence."))
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label: "Applications", value: stats?.total ?? "--", icon: BriefcaseBusiness },
    { label: "Average Match", value: stats?.averageMatchScore ? `${stats.averageMatchScore}%` : "--", icon: TrendingUp },
    { label: "Interviews", value: stats?.interviews ?? "--", icon: Mic },
    { label: "Career Readiness", value: intelligence ? `${intelligence.readinessScore}%` : "--", icon: Target }
  ];

  return (
    <section className="page-grid">
      {error && <div className="error-banner">{error}</div>}

      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="metric-card" key={metric.label}>
              <Icon size={20} aria-hidden="true" />
              <span>{metric.label}</span>
              <strong>{loading ? "..." : metric.value}</strong>
            </article>
          );
        })}
      </div>

      <section className="content-band">
        <div>
          <span className="eyebrow">Your next best action</span>
          <h2>{loading ? "Calculating..." : intelligence?.nextAction?.title || "Build your career profile"}</h2>
          <p>
            {loading
              ? "Reading your resumes, applications, matches, and interviews."
              : intelligence?.nextAction?.reason || "Upload a resume and add a target job to unlock personalized guidance."}
          </p>
        </div>
        <Lightbulb size={64} aria-hidden="true" />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
        <section className="content-band" style={{ alignItems: "flex-start" }}>
          <div style={{ width: "100%" }}>
            <span className="eyebrow">Skill Signals</span>
            <h2>Strong Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
              {(intelligence?.strongSkills || []).map((skill) => (
                <span key={skill} style={{ background: "#eaf8f0", color: "#137547", padding: "6px 10px", borderRadius: "999px", fontWeight: 700, fontSize: "0.85rem" }}>
                  {skill}
                </span>
              ))}
              {!loading && intelligence?.strongSkills?.length === 0 && (
                <p style={{ color: "#5b6475" }}>No strong skill signals yet. Add a structured resume or run job matches.</p>
              )}
            </div>
          </div>
        </section>

        <section className="content-band" style={{ alignItems: "flex-start" }}>
          <div style={{ width: "100%" }}>
            <span className="eyebrow">Learning Priorities</span>
            <h2>Weak or Missing Skills</h2>
            <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
              {(intelligence?.weakSkills || []).slice(0, 4).map((gap) => (
                <div key={gap.skill} style={{ background: "#f5f7fb", borderRadius: "8px", padding: "12px" }}>
                  <strong>{gap.skill}</strong>
                  <span style={{ marginLeft: "8px", color: gap.priority === "high" ? "#b4233c" : "#8a5a00", fontSize: "0.85rem", fontWeight: 800 }}>
                    {gap.priority}
                  </span>
                  <p style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>{gap.whyItMatters}</p>
                </div>
              ))}
              {!loading && intelligence?.weakSkills?.length === 0 && (
                <p style={{ color: "#5b6475" }}>No weak skill signals yet. CareerPilot will calculate these after matches or interviews.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="content-band" style={{ alignItems: "flex-start" }}>
        <div style={{ width: "100%" }}>
          <span className="eyebrow">Personalized Roadmap</span>
          <h2>Placement Preparation Path</h2>
          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            {(intelligence?.roadmap || []).map((item) => (
              <div key={`${item.phase}-${item.title}`} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "14px", background: "#f5f7fb", borderRadius: "8px", padding: "14px" }}>
                <strong>Phase {item.phase}</strong>
                <div>
                  <strong>{item.title}</strong>
                  <p style={{ margin: "6px 0", color: "#5b6475" }}>{item.action}</p>
                  <small>{item.focus.join(", ")}</small>
                </div>
              </div>
            ))}
            {!loading && intelligence?.roadmap?.length === 0 && (
              <p style={{ color: "#5b6475" }}>Add applications and run matches to generate a role-specific roadmap.</p>
            )}
          </div>
        </div>
        <BarChart3 size={56} aria-hidden="true" />
      </section>
    </section>
  );
}
