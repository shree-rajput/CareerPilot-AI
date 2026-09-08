import React, { useState } from 'react';
import { User, Copy, Check, Edit2, X, Send } from 'lucide-react';

export function UserMessage({ message, onEditSubmit }) {
  const content = typeof message === 'string' ? message : message?.content || '';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy user prompt:", err);
    }
  };

  const handleSaveEdit = (e) => {
    e?.preventDefault();
    if (!editValue.trim()) return;
    setIsEditing(false);
    if (onEditSubmit) {
      onEditSubmit(editValue.trim());
    }
  };

  return (
    <div className="flex gap-3 flex-row-reverse items-start my-2 animate-fade-in group w-full">
      {/* User Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs mt-0.5">
        <User size={15} />
      </div>

      <div className="flex flex-col items-end gap-1.5 max-w-[85%] sm:max-w-[75%] min-w-0">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="w-full bg-surface border border-primary/50 rounded-2xl p-2.5 shadow-md flex flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-bg-secondary text-text text-xs rounded-xl p-2.5 border border-border focus:outline-none focus:border-primary resize-none min-h-[60px] leading-relaxed font-medium"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditValue(content); }}
                className="px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text bg-bg-secondary rounded-lg border border-border transition-colors cursor-pointer flex items-center gap-1"
              >
                <X size={12} /> Cancel
              </button>
              <button
                type="submit"
                disabled={!editValue.trim() || editValue.trim() === content}
                className="px-3 py-1 text-[11px] font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-xs"
              >
                <Send size={11} /> Save & Resubmit
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Bubble */}
            <div className="p-3.5 rounded-2xl bg-primary text-white font-medium text-xs leading-relaxed rounded-tr-xs shadow-xs whitespace-pre-wrap break-words w-full">
              {content}
            </div>

            {/* Action Toolbar on Hover */}
            <div className="flex items-center gap-2 text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity px-1">
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                title="Copy prompt"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {onEditSubmit && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => { setEditValue(content); setIsEditing(true); }}
                    className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                    title="Edit prompt"
                  >
                    <Edit2 size={11} />
                    <span>Edit</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
