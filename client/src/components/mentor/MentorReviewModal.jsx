import React, { useState } from "react";
import { X, Star, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { rateSession } from "../../api/mentor";
import { toast } from "../../context/ToastContext";

export function MentorReviewModal({ sessionId, mentorName, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!review.trim()) {
      toast.warning("Please leave a written review.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await rateSession(sessionId, { rating: Number(rating), review });
      toast.success("Thank you! Review submitted successfully.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border bg-bg-secondary">
          <div>
            <h2 className="text-base font-extrabold text-text m-0">Leave a Review</h2>
            <span className="text-[11px] text-text-secondary font-semibold">Session with {mentorName || "Mentor"}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-secondary hover:bg-border rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-bg text-danger border border-danger/20 rounded-lg text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex flex-col gap-2 items-center py-2">
            <span className="text-xs font-bold text-text-secondary uppercase">Rating</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={star <= rating ? "text-warning fill-warning" : "text-border"}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-extrabold text-text mt-1">
              {rating === 5 ? "5/5 - Outstanding" : rating === 4 ? "4/5 - Very Good" : rating === 3 ? "3/5 - Good" : rating === 2 ? "2/5 - Fair" : "1/5 - Poor"}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text">Written Feedback</label>
            <textarea
              rows={4}
              required
              placeholder="Describe your mentorship experience, quality of advice, and actionable feedback..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="font-extrabold">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
