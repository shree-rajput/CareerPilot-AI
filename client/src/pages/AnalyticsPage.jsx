import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { analyticsApi } from "../api/features";

export function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.getDashboard(),
      analyticsApi.getTrends(),
      analyticsApi.getDistribution()
    ]).then(([dStats, dTrends, dDist]) => {
      setStats(dStats.stats);
      setTrends(dTrends.trends);
      setDistribution(dDist.distribution);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (!stats) return <p>Failed to load analytics.</p>;

  const metricCards = [
    { label: "Total Applications", value: stats.total },
    { label: "Applied This Month", value: stats.thisMonth },
    { label: "Response Rate", value: `${stats.responseRate}%` },
    { label: "Interviews", value: stats.interviews },
    { label: "Offer Rate", value: `${stats.offerRate}%` },
    { label: "Avg Match Score", value: stats.averageMatchScore ? `${stats.averageMatchScore}%` : "--" }
  ];

  return (
    <section style={{ display: "grid", gap: "24px" }}>

      {/* Metric Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        {metricCards.map(m => (
          <div key={m.label} style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <span style={{ display: "block", color: "#5b6475", fontSize: "0.9rem", marginBottom: "8px" }}>{m.label}</span>
            <strong style={{ fontSize: "2rem", color: "#172033" }}>{m.value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Charts */}
        <div style={{ display: "grid", gap: "24px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 20px" }}>Application Volume (6 Months)</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1463ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1463ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#5b6475', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5b6475', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="applications" stroke="#1463ff" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
            <h3 style={{ margin: "0 0 20px" }}>Status Pipeline</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{ textTransform: "capitalize", fill: '#5b6475', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f5f7fb' }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" fill="#101828" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Skill Gaps Sidebar */}
        <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #dde4ef" }}>
          <h3 style={{ margin: "0 0 16px" }}>Top Skill Gaps</h3>
          <p style={{ margin: "0 0 20px", fontSize: "0.9rem", color: "#5b6475", lineHeight: 1.5 }}>
            These skills frequently appear in job descriptions you apply to, but are missing from your matched resumes.
          </p>

          <div style={{ display: "grid", gap: "12px" }}>
            {stats.topSkillGaps.map((gap, i) => (
              <div key={gap.skill} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#f5f7fb", borderRadius: "6px" }}>
                <div>
                  <span style={{ fontWeight: "bold", marginRight: "8px", color: "#5b6475" }}>#{i + 1}</span>
                  <strong>{gap.skill}</strong>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#b4233c", background: "#fff1f2", padding: "2px 8px", borderRadius: "99px" }}>
                  Missing {gap.count}x
                </span>
              </div>
            ))}
            {stats.topSkillGaps.length === 0 && <p style={{ color: "#5b6475", fontStyle: "italic" }}>No skill gaps identified yet.</p>}
          </div>
        </div>

      </div>
    </section>
  );
}
