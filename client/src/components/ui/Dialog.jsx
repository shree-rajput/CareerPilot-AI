import React, { useEffect } from "react";
import { X } from "lucide-react";

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-text/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }) {
  return (
    <div className={`relative bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 px-6 py-4 border-b border-border ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }) {
  return <h3 className={`text-lg font-bold text-text m-0 ${className}`}>{children}</h3>;
}

export function DialogFooter({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-bg-secondary/50 ${className}`}>
      {children}
    </div>
  );
}
