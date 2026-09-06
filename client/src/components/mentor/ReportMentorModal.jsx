import React, { useState } from "react";
import { X, ShieldAlert, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { reportMentor } from "../../api/mentor";
import { toast } from "../../context/ToastContext";

export function ReportMentorModal({ mentorId, mentorName, sessionId, onClose, onSuccess }) {
  const [reasonCategory, setReasonCategory] = useState("conduct");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.warning("Please provide details for the safety report.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await reportMentor({
        mentorId,
        sessionId: sessionId || undefined,
        reasonCategory,
        description
      });
      toast.success("Report submitted. Our moderation team will investigate immediately.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit safety report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border bg-danger-bg/20">
          <div className="flex items-center gap-2 text-danger">
            <ShieldAlert size={20} />
            <h2 className="text-base font-black m-0">Report Mentor Concern</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-secondary hover:bg-border rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <p className="text-xs text-text-secondary m-0 leading-relaxed font-medium">
            Report safety, conduct, or identity concerns regarding <strong className="text-text">{mentorName || "this mentor"}</strong>. All reports are strictly confidential.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-bg text-danger border border-danger/20 rounded-lg text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text">Category</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="bg-bg border border-border text-xs font-bold text-text p-2.5 rounded-lg focus:border-primary outline-none"
            >
              <option value="conduct">Inappropriate Behavior / Conduct</option>
              <option value="no_show">No-Show / Unannounced Absence</option>
              <option value="identity">Misleading Identity / Employment Claim</option>
              <option value="spam">Spam / Commercial Solicitation</option>
              <option value="other">Other Violation</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text">Details & Description</label>
            <textarea
              rows={4}
              required
              placeholder="Describe what occurred with specific details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="bg-danger hover:bg-danger/90 text-white font-extrabold">
              {submitting ? "Submitting..." : "Submit Confidential Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
