import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, BriefcaseBusiness, Bell, Calendar, BookOpen, AlertCircle, PlayCircle, Trophy } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export function NotificationToast() {
  const navigate = useNavigate();
  const { toastNotification, clearToast, markAsRead } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toastNotification) {
      setIsVisible(true);
      
      // Auto-dismiss after 6 seconds (or 12s if high priority)
      const duration = toastNotification.priority === "HIGH" ? 12000 : 6000;
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearToast, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toastNotification, clearToast]);

  if (!toastNotification && !isVisible) return null;

  const handleAction = () => {
    if (toastNotification?.actionUrl) {
      navigate(toastNotification.actionUrl);
    } else if (toastNotification?.action?.route) {
      navigate(toastNotification.action.route);
    }
    
    if (toastNotification?._id) {
      markAsRead(toastNotification._id);
    }
    
    setIsVisible(false);
    setTimeout(clearToast, 300);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(clearToast, 300);
  };

  // Icon selection based on type
  const getIcon = () => {
    switch (toastNotification?.type) {
      case "APPLICATION_STATUS":
        return <BriefcaseBusiness size={20} className="text-primary" />;
      case "INTERVIEW":
        return <Calendar size={20} className="text-warning" />;
      case "OPPORTUNITY":
        return <Trophy size={20} className="text-success" />;
      case "ACTION_REQUIRED":
        return <AlertCircle size={20} className="text-danger" />;
      case "LEARNING":
      case "PREPARATION_REMINDER":
        return <BookOpen size={20} className="text-indigo-500" />;
      case "INTERVIEW_REMINDER":
        return <PlayCircle size={20} className="text-amber-500" />;
      default:
        return <Bell size={20} className="text-text-muted" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <div
        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl bg-surface/95 border-border transition-all duration-300 transform ${
          isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
        }`}
      >
        <div className="mt-1 shrink-0 p-2 rounded-full bg-bg-secondary/50">
          {getIcon()}
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-sm font-bold text-text m-0 pr-4 leading-tight">
              {toastNotification?.title || "New Notification"}
            </h4>
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-text-muted hover:text-text rounded-md hover:bg-bg-secondary p-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          
          <p className="text-xs text-text-secondary leading-relaxed m-0 break-words line-clamp-2">
            {toastNotification?.message}
          </p>
          
          {(toastNotification?.actionUrl || toastNotification?.action?.route) && (
            <div className="mt-2 flex justify-start">
              <button
                onClick={handleAction}
                className="text-[11px] font-bold text-primary hover:text-primary-hover uppercase tracking-wide px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                {toastNotification?.action?.label || "View Details"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
