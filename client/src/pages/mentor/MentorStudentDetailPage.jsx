import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Briefcase, FileText, Video, Send } from "lucide-react";
import { http } from "../../api/http";
import { Button } from "../../components/ui/Button";

export function MentorStudentDetailPage() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [feedbackCategory, setFeedbackCategory] = useState("General");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentRes, appRes, intRes] = await Promise.all([
          http.get(`/mentor-portal/students/${studentId}`),
          http.get(`/mentor-portal/students/${studentId}/applications`),
          http.get(`/mentor-portal/students/${studentId}/interviews`)
        ]);
        
        setStudent(studentRes.data.data);
        setApplications(appRes.data.data);
        setInterviews(intRes.data.data);
      } catch (err) {
        console.error("Failed to load student details", err);
        setError(err.response?.data?.message || "Failed to load student details. You may not be assigned to this student.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackContent.trim()) return;
    
    setSubmittingFeedback(true);
    setFeedbackSuccess(false);
    try {
      await http.post(`/mentor-portal/students/${studentId}/feedback`, {
        category: feedbackCategory,
        content: feedbackContent
      });
      setFeedbackContent("");
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) return <div className="animate-pulse text-slate-500">Loading student profile...</div>;
  if (error) return <div className="text-red-500 font-semibold">{error}</div>;
  if (!student) return <div>Student not found.</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/mentor/students" className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
          <p className="text-slate-500 text-sm">{student.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-indigo-500"/> Profile
            </h2>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Target Roles</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {student.targetRoles?.length ? student.targetRoles.map(r => (
                    <span key={r.title} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">{r.title}</span>
                  )) : <span className="text-sm text-slate-500">Not set</span>}
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Target Companies</span>
                <p className="text-sm text-slate-700 mt-1">{student.targetCompanies?.join(", ") || "Not set"}</p>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Technical Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {student.technicalSkills?.slice(0, 8).map(s => (
                    <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">{s}</span>
                  )) || <span className="text-sm text-slate-500">Not set</span>}
                  {student.technicalSkills?.length > 8 && <span className="text-[10px] text-slate-400">+{student.technicalSkills.length - 8} more</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500"/> Readiness
            </h2>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-black text-slate-800">{student.readinessScore}</span>
              <span className="text-sm text-slate-500 font-semibold mb-1">/ 100</span>
            </div>
            
            {student.readinessBreakdown && (
              <div className="space-y-3">
                {['resume', 'technical', 'interview'].map(key => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="capitalize text-slate-600">{key}</span>
                      <span className="text-slate-800">{student.readinessBreakdown[key] || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${student.readinessBreakdown[key] || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Applications, Interviews, Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-500"/> Recent Applications
            </h2>
            {applications.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl text-center">No applications tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 3).map(app => (
                  <div key={app._id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{app.jobTitle}</h4>
                      <p className="text-xs text-slate-500">{app.company}</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Video size={18} className="text-indigo-500"/> Recent Interviews
            </h2>
            {interviews.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl text-center">No mock interviews completed yet.</p>
            ) : (
              <div className="space-y-3">
                {interviews.slice(0, 3).map(int => (
                  <div key={int._id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{int.jobRole || "General"} Interview</h4>
                      <p className="text-xs text-slate-500">{new Date(int.createdAt).toLocaleDateString()}</p>
                    </div>
                    {int.status === "completed" && int.report?.overallScore ? (
                      <span className="font-bold text-emerald-600 text-sm">{int.report.overallScore}/10</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-500">{int.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Send size={18} className="text-indigo-500"/> Provide Feedback
            </h2>
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-900/70 mb-1 uppercase tracking-wider">Category</label>
                <select 
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option>General</option>
                  <option>Resume</option>
                  <option>DSA</option>
                  <option>Technical Interview</option>
                  <option>HR Interview</option>
                  <option>Communication</option>
                  <option>Projects</option>
                  <option>Applications</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-indigo-900/70 mb-1 uppercase tracking-wider">Feedback Notes</label>
                <textarea 
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  required
                  rows={4}
                  placeholder="Share constructive feedback or action items..."
                  className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={submittingFeedback || !feedbackContent.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {submittingFeedback ? "Saving..." : "Save Feedback"}
                </Button>
                {feedbackSuccess && <span className="text-sm font-semibold text-emerald-600">Feedback saved successfully!</span>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
