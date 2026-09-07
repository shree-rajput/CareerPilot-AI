import React from "react";
import { BarChart, TrendingUp } from "lucide-react";

export function MentorAnalyticsPage() {
  // Currently a placeholder as we don't have deep mentor analytics endpoints yet.
  // We can expand this once we have more data tracking.

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mentorship Analytics</h1>
        <p className="text-slate-500 mt-1">Track the impact you are having on your students' careers.</p>
      </div>

      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
          <BarChart size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Analytics Coming Soon</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          We are gathering data to provide you with insights on your mentees' placement rates, 
          interview performance improvements, and time-to-offer metrics.
        </p>
        
        <div className="mt-8 flex gap-4 w-full max-w-sm">
          <div className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
            <TrendingUp size={20} className="text-emerald-500 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">Placement Rate</h4>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
          <div className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
            <BarChart size={20} className="text-indigo-500 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">Avg Readiness</h4>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
