import React, { useState } from "react";
import { AlertTriangle, Send, CheckCircle2, ShieldAlert, FileText, ArrowRight } from "lucide-react";
import { api } from "../../api/axios";

export function MentorAppealsPage() {
  const [restrictionReason, setRestrictionReason] = useState("Automated Anomaly Audit / High Cancellation Rate");
  const [policyInvolved, setPolicyInvolved] = useState("Mentor Reliability & Attendance Policy");
  const [appealStatement, setAppealStatement] = useState("");
  const [supportingLinks, setSupportingLinks] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealStatement || appealStatement.trim().length < 20) {
      setError("Please write a detailed appeal statement (at least 20 characters).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/mentors/appeals", {
        restrictionReason,
        policyInvolved,
        appealStatement: appealStatement.trim(),
        supportingLinks: supportingLinks ? supportingLinks.split(",").map(l => l.trim()) : []
      });

      if (res.data?.success) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit appeal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Mentor Account Appeal Center</h1>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              If your account was restricted or suspended by platform safety audits, you have the right to present evidence and submit a formal appeal directly to our Admin Exception Queue.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Appeal Submitted to Admin Queue</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your appeal has been received. Our admin team will review your statement and supporting evidence. You will receive an in-app notification once a resolution is reached.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Restriction Rationale</label>
                <input
                  type="text"
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Policy / Guidelines Involved</label>
                <input
                  type="text"
                  value={policyInvolved}
                  onChange={(e) => setPolicyInvolved(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Appeal Statement & Rationale * (min 20 chars)
                </label>
                <textarea
                  rows={5}
                  value={appealStatement}
                  onChange={(e) => setAppealStatement(e.target.value)}
                  placeholder="Explain why you believe this restriction should be reviewed, outlining any relevant context or steps taken..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supporting Links / Proof (comma separated URLs)
                </label>
                <input
                  type="text"
                  value={supportingLinks}
                  onChange={(e) => setSupportingLinks(e.target.value)}
                  placeholder="e.g. https://github.com/proof, https://drive.google.com/doc"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> {loading ? "Submitting Appeal..." : "Submit Appeal to Admin Exception Queue"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
