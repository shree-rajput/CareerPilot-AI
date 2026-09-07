import React, { useEffect, useState } from "react";
import { Users, FileText, Video, TrendingUp } from "lucide-react";
import { http } from "../../api/http";
import { Link } from "react-router-dom";

export function MentorDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await http.get("/mentor-portal/dashboard");
        setStats(data.data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-slate-500 animate-pulse">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="text-red-500">Failed to load dashboard.</div>;
  }

  const statCards = [
    { label: "Active Mentees", value: stats.totalMentees, icon: Users, color: "bg-blue-500" },
    { label: "Applications (7d)", value: stats.recentApplications, icon: FileText, color: "bg-emerald-500" },
    { label: "Upcoming Interviews", value: stats.upcomingInterviews, icon: Video, color: "bg-purple-500" },
    { label: "Pending Reviews", value: "0", icon: TrendingUp, color: "bg-amber-500" }, // Placeholder for future feature
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Here's what is happening with your mentees today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-all hover:shadow-md">
              <div className={`p-3 rounded-xl ${card.color} text-white shadow-sm`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/mentor/students" className="block w-full p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 group transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700">View All Mentees</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Check progress and assign action items</p>
                </div>
                <Users className="text-slate-400 group-hover:text-indigo-500" />
              </div>
            </Link>
            <Link to="/mentor/feedback" className="block w-full p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 group transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-purple-700">Recent Feedback</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Review feedback you've left for students</p>
                </div>
                <FileText className="text-slate-400 group-hover:text-purple-500" />
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-center">
          <div>
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <TrendingUp className="text-slate-400" size={28} />
            </div>
            <h3 className="text-slate-800 font-bold">Activity Chart</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Once your mentees start applying to jobs and taking interviews, their activity will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
