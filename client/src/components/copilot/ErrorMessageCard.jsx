import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorMessageCard({ message, onRetry }) {
  return (
    <div className="my-2 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400">
      <div className="flex items-center gap-2.5">
        <AlertCircle size={16} className="shrink-0 text-rose-500" />
        <span className="font-medium leading-relaxed">
          {message || "CareerPilot couldn't generate a response right now."}
        </span>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
