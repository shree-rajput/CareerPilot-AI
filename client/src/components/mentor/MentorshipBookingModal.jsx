import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { getMentorSlots, bookSession } from "../../api/mentor";
import { toast } from "../../context/ToastContext";

export function MentorshipBookingModal({ mentor, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [duration, setDuration] = useState(30);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [topic, setTopic] = useState(mentor?.topics?.[0] || mentor?.mentorProfile?.topics?.[0] || "General Q&A");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mentorId = mentor?._id || mentor?.mentorId;

  useEffect(() => {
    if (mentorId && selectedDate) {
      fetchSlots();
    }
  }, [mentorId, selectedDate, duration]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      setError("");
      const res = await getMentorSlots(mentorId, selectedDate, duration);
      setSlots(res.data || []);
      setSelectedSlot(null);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.warning("Please select a time slot for your session.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await bookSession({
        mentorId,
        topic,
        description,
        duration: Number(duration),
        scheduledAt: selectedSlot.scheduledAt
      });
      toast.success("Mentorship session requested successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to book mentorship session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text m-0">Book Session with {mentor?.name}</h2>
              <span className="text-[11px] text-text-secondary font-semibold">
                {mentor?.role || mentor?.mentorProfile?.role} @ {mentor?.company || mentor?.mentorProfile?.company}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:bg-border rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-bg text-danger border border-danger/20 rounded-lg text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Date Picker & Duration selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text">Select Date</label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text">Session Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-bg border border-border text-xs font-bold text-text p-2.5 rounded-lg focus:border-primary outline-none"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          {/* Slots Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-text flex items-center justify-between">
              <span>Available Time Slots</span>
              <span className="text-[10px] text-text-secondary font-semibold">({slots.length} available)</span>
            </label>

            {loadingSlots ? (
              <div className="p-4 text-center text-xs text-text-secondary font-medium italic">
                Loading slots for {selectedDate}...
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                {slots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 rounded-lg border text-xs font-mono font-bold transition-all text-center ${
                      selectedSlot?.startTime === slot.startTime
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-bg border-border text-text hover:border-primary/50"
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-bg border border-dashed border-border rounded-xl text-center text-xs text-text-secondary font-medium">
                No slots available on this date. Try another day.
              </div>
            )}
          </div>

          {/* Mentorship Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text">Mentorship Topic</label>
            <input
              type="text"
              required
              placeholder="e.g. System Design Mock Interview"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none"
            />
          </div>

          {/* Goals / Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text">Session Goals & Questions</label>
            <textarea
              rows={3}
              required
              placeholder="Share what you hope to achieve during this 1:1 session..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-lg focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Submit Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !selectedSlot} className="font-extrabold gap-1.5">
              {submitting ? "Booking..." : "Request Session 🚀"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
