import { BarChart3, BriefcaseBusiness, FileText, Mic, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { analyticsApi } from "../api/features";

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getDashboard()
      .then(res => setStats(res.stats))
      .catch(() => console.error("Failed to load dashboard stats"))
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label: "Applications", value: stats?.total ?? "--", icon: BriefcaseBusiness },
    { label: "Average Match", value: stats?.averageMatchScore ? `${stats.averageMatchScore}%` : "--", icon: TrendingUp },
    { label: "Interviews", value: stats?.interviews ?? "--", icon: Mic },
    { label: "Resume Versions", value: stats?.resumeVersions ?? "--", icon: FileText }
  ];

  return (
    <section className="page-grid">
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
          <span className="eyebrow">Phases 2-8 Deployed</span>
          <h2>System Operational</h2>
          <p>
            The Semantic Match Engine, Resume Intelligence, and Application Tracker are online. 
            Upload a resume and paste a JD to see the deterministic matching pipeline in action.
          </p>
        </div>
        <BarChart3 size={64} aria-hidden="true" />
      </section>
    </section>
  );
}
