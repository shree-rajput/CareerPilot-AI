import React, { useEffect, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { http } from "../../api/http";
import { Link } from "react-router-dom";

export function MentorFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const { data } = await http.get("/mentor-portal/feedback");
        setFeedbacks(data.data);
      } catch (err) {
        console.error("Failed to load feedback", err);
        setError("Failed to load your feedback history.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  if (loading) return <div className="animate-pulse text-slate-500">Loading feedback...</div>;
  if (error) return <div className="text-red-500 font-semibold">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Feedback History</h1>
        <p className="text-slate-500 mt-1">Review all the feedback and action items you've assigned to your mentees.</p>
      </div>

      {feedbacks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No feedback yet</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            You haven't left any feedback for your students. Visit a student's profile to add feedback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {feedbacks.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                    {item.studentAvatar ? (
                      <img src={item.studentAvatar} alt={item.studentName} className="w-full h-full object-cover" />
                    ) : (
                      item.studentName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{item.studentName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Link 
                  to={`/mentor/students/${item.studentId}`}
                  className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                  title="View Student Profile"
                >
                  <ArrowRight size={18} />
                </Link>
              </div>
              <p className="text-slate-700 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
