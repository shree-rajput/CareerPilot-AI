import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { analyticsApi } from "../api/features";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-text-secondary font-medium">
      <Spinner size="md" className="mb-2" />
      <span className="text-xs font-semibold">Loading analytics...</span>
    </div>
  );
  
  if (!stats) return (
    <div className="bg-danger-bg text-danger p-4 rounded-xl border border-danger-border text-xs font-semibold">
      Failed to load analytics. Please try refreshing.
    </div>
  );

  const metricCards = [
    { label: "Total Applications", value: stats.total },
    { label: "Applied This Month", value: stats.thisMonth },
    { label: "Response Rate", value: `${stats.responseRate}%` },
    { label: "Interviews", value: stats.interviews },
    { label: "Offer Rate", value: `${stats.offerRate}%` },
    { label: "Avg Match Score", value: stats.averageMatchScore ? `${stats.averageMatchScore}%` : "--" }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-xl border border-border">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-bg px-2 py-0.5 rounded border border-primary-border/40 mb-1 inline-block">
            Career Performance Intelligence
          </span>
          <h1 className="text-xl font-bold text-text m-0 tracking-tight">Analytics Dashboard</h1>
          <p className="text-xs text-text-secondary mt-0.5 m-0 font-medium">
            Pipeline metrics, conversion performance, and frequency gap trends.
          </p>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-3.5 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">{m.label}</span>
              <strong className="text-xl font-extrabold text-primary tracking-tight">{m.value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text">Application Volume (6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }} 
                      itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                      labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '2px' }}
                    />
                    <Area type="monotone" dataKey="applications" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 5, strokeWidth: 0, fill: '#2563eb' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-bold text-text">Application Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                    <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{ textTransform: "capitalize", fill: '#0f172a', fontSize: 11, fontWeight: 600 }} dx={-5} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }} 
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                      itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                      labelStyle={{ textTransform: 'capitalize', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Skill Gaps Sidebar */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-xs font-bold text-text">Target Role Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-text-secondary m-0 leading-relaxed font-medium">
              Most frequent missing keywords detected across your target job descriptions vs. master resume.
            </p>

            <div className="space-y-2">
              {stats.topSkillGaps.map((gap, i) => (
                <div key={gap.skill} className="flex justify-between items-center p-2.5 bg-surface border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-5 w-5 rounded bg-bg-secondary text-text-muted text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <strong className="text-xs font-bold text-text">{gap.skill}</strong>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Missing {gap.count}x
                  </span>
                </div>
              ))}
              {stats.topSkillGaps.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs font-bold text-text m-0">No gaps detected!</p>
                  <p className="text-[10px] text-text-muted mt-0.5 m-0">Your master resume covers your target JDs.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
