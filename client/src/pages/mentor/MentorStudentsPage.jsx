import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, ChevronRight } from "lucide-react";
import { http } from "../../api/http";

export function MentorStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data } = await http.get("/mentor-portal/students");
        setStudents(data.data);
      } catch (err) {
        console.error("Failed to load mentees", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Your Mentees</h1>
          <p className="text-slate-500 mt-1">Manage and track progress for students assigned to you.</p>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mentees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse">Loading mentees...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No mentees found</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            {search ? "No students match your search criteria." : "You haven't been assigned any mentees yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Target Role</th>
                  <th className="px-6 py-4">Readiness</th>
                  <th className="px-6 py-4">Assigned Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {student.avatar ? (
                            <img src={student.avatar} alt={student.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            student.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {student.targetRole}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${student.readinessScore > 70 ? 'bg-emerald-500' : student.readinessScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, student.readinessScore))}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{student.readinessScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(student.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/mentor/students/${student.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View Profile
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
