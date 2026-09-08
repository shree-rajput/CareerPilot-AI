import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export function ExpandableSection({
  title = "Show Detailed Explanation",
  content = "",
  defaultOpen = false,
  badge = null
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className="my-2 border border-border/80 rounded-xl overflow-hidden bg-surface transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-bg-secondary/60 hover:bg-bg-secondary text-text text-xs font-semibold cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-primary/10 text-primary">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="text-text font-bold text-xs">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-muted font-normal">
          {isOpen ? "Hide details" : "Expand to view"}
        </span>
      </button>

      {isOpen && (
        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-surface animate-fade-in text-xs space-y-2">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
