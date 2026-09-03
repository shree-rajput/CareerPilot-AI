import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

export function DeleteJobModal({ job, isOpen, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !job) return null;

  const hasApplication = !!(job.applicationId || job.hasApplication);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(job._id || job.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle size={18} />
            <h3 className="text-sm font-bold text-text m-0">Delete Target Job?</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-bg-secondary p-3 rounded-lg border border-border/60">
            <p className="text-xs font-bold text-text m-0 line-clamp-1">{job.title}</p>
            <p className="text-[11px] text-text-muted m-0 truncate">{job.company}</p>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed m-0">
            This will remove this opportunity from your Job Board.
          </p>

          {hasApplication && (
            <div className="bg-primary-bg/50 border border-primary-border/60 p-2.5 rounded-lg text-[11px] text-text-secondary">
              💡 <strong>Note:</strong> This job has application activity. Your application history will be preserved.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            <Trash2 size={14} /> Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
}
