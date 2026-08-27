import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
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
      <Spinner size="lg" className="mb-4" />
      Loading analytics...
    </div>
  );
  
  if (!stats) return (
    <div className="bg-danger-bg text-danger p-6 rounded-xl border border-danger/20 font-medium">
      Failed to load analytics. Please try again later.
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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-text tracking-tight">Analytics Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Track your job search performance and application pipeline.</p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((m, idx) => (
          <Card key={m.label} className="shadow-sm border-border">
            <CardContent className="p-5 flex flex-col justify-center items-center text-center sm:items-start sm:text-left h-full">
              <span className="block text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">{m.label}</span>
              <strong className="text-3xl font-extrabold text-primary">{m.value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Charts */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <CardTitle className="text-lg m-0">Application Volume (6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1463ff" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1463ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} 
                      itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                      labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="applications" stroke="#1463ff" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, strokeWidth: 0, fill: '#1463ff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
              <CardTitle className="text-lg m-0">Status Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{ textTransform: "capitalize", fill: '#1e293b', fontSize: 13, fontWeight: 600 }} dx={-10} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }} 
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                      itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                      labelStyle={{ textTransform: 'capitalize', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Bar dataKey="count" fill="#1463ff" radius={[0, 6, 6, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Gaps Sidebar */}
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-bg-secondary border-b border-border py-4 px-6">
            <CardTitle className="text-lg m-0">Top Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              These skills frequently appear in job descriptions you apply to, but are missing from your matched resumes.
            </p>

            <div className="flex flex-col gap-3">
              {stats.topSkillGaps.map((gap, i) => (
                <div key={gap.skill} className="flex justify-between items-center p-3 bg-surface border border-border rounded-xl hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-bg-secondary text-text-secondary text-xs font-bold">
                      {i + 1}
                    </span>
                    <strong className="text-text font-bold text-sm">{gap.skill}</strong>
                  </div>
                  <span className="text-xs font-bold text-danger bg-danger-bg px-2.5 py-1 rounded-full border border-danger/20 shadow-sm">
                    Missing {gap.count}x
                  </span>
                </div>
              ))}
              {stats.topSkillGaps.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-bg text-success mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <p className="text-text font-bold">No skill gaps identified!</p>
                  <p className="text-xs text-text-secondary mt-1">Your resumes match the JDs well.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
