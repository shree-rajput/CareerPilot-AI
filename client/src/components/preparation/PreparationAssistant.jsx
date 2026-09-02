import React, { useState } from "react";
import { MessageSquare, Bell, CalendarClock, Send, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { toast } from "../../context/ToastContext";
import api from "../../api/axios";

export function PreparationAssistant({ activePlan }) {
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [studyHours, setStudyHours] = useState(2);
  const [emailTime, setEmailTime] = useState("09:00");

  const handleSchedule = async () => {
    if (!activePlan) return;
    setLoadingSchedule(true);
    try {
      // Mocking an API call to schedule the study plan and email reminders
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would hit: 
      // await api.post('/career/preparation/schedule', { planId: activePlan._id, studyHours, emailTime })
      
      setScheduled(true);
      toast.success("Schedule & reminder set successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule plan.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="icon-box-sm bg-primary/10 text-primary">
          <Sparkles size={16} />
        </div>
        <div>
          <h3 className="font-bold text-xs text-text m-0">CareerCopilot</h3>
          <p className="text-[10px] text-text-secondary m-0">Study Planner & Assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        
        {/* Assistant Message */}
        <div className="bg-bg-secondary p-3 rounded-lg rounded-tl-none border border-border max-w-[90%] text-xs text-text leading-relaxed">
          <p>Hi! I'm your CareerCopilot.</p>
          {!activePlan ? (
             <p className="mt-2">Generate a plan first, and I will help you schedule your study hours and set up reminders so you stay on track.</p>
          ) : (
             <p className="mt-2">I see you have an active plan for today! Let's schedule your study hours and set up an email reminder.</p>
          )}
        </div>

        {/* Schedule Controls */}
        {activePlan && !scheduled && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-4 animate-in fade-in">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block flex items-center gap-1">
                <CalendarClock size={12} /> Daily Study Hours
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  value={studyHours} 
                  onChange={(e) => setStudyHours(e.target.value)}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold text-text w-12 text-right">{studyHours} hrs</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block flex items-center gap-1">
                <Bell size={12} /> Daily Reminder Email
              </label>
              <input 
                type="time" 
                value={emailTime}
                onChange={(e) => setEmailTime(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 h-8 text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <Button onClick={handleSchedule} disabled={loadingSchedule} className="w-full mt-2" size="sm">
              {loadingSchedule ? <Spinner size="xs" className="mr-2" /> : "Set Schedule & Reminders"}
            </Button>
          </div>
        )}

        {scheduled && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
            <CheckCircle size={18} className="text-success shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-text m-0">Schedule Active</h4>
              <p className="text-xs text-text-secondary mt-1">
                Allocated {studyHours} hours of study. You will receive an email reminder every day at {emailTime}.
              </p>
            </div>
          </div>
        )}

      </div>

      <div className="p-3 border-t border-border bg-bg-secondary flex gap-2">
        <Input 
          placeholder="Ask CareerCopilot..." 
          className="flex-1 text-xs" 
          disabled
        />
        <Button size="icon" disabled>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
