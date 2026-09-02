import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

let globalToastHandler = null;

export const toast = {
  success: (message, options) => globalToastHandler?.("success", message, options),
  error: (message, options) => globalToastHandler?.("error", message, options),
  info: (message, options) => globalToastHandler?.("info", message, options),
  warning: (message, options) => globalToastHandler?.("warning", message, options)
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, options = {}) => {
    const id = Date.now() + Math.random().toString();
    const duration = options.duration || 4000;

    setToasts((prev) => [...prev, { id, type, message, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  globalToastHandler = addToast;

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Floating Toast Stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-top-4 duration-300 ${
                isSuccess
                  ? "bg-surface/95 border-success/30 text-text shadow-success/10"
                  : isError
                  ? "bg-surface/95 border-danger/30 text-text shadow-danger/10"
                  : isWarning
                  ? "bg-surface/95 border-warning/30 text-text shadow-warning/10"
                  : "bg-surface/95 border-primary/30 text-text shadow-primary/10"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {isSuccess && <CheckCircle2 className="text-success" size={18} />}
                  {isError && <AlertCircle className="text-danger" size={18} />}
                  {isWarning && <AlertTriangle className="text-warning" size={18} />}
                  {!isSuccess && !isError && !isWarning && <Info className="text-primary" size={18} />}
                </div>

                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isSuccess ? "text-success" : isError ? "text-danger" : isWarning ? "text-warning" : "text-primary"
                  }`}>
                    {isSuccess ? "Success" : isError ? "Error" : isWarning ? "Warning" : "Notice"}
                  </span>
                  <p className="text-xs font-semibold leading-relaxed m-0 text-text break-words">
                    {t.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-bg-secondary shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
