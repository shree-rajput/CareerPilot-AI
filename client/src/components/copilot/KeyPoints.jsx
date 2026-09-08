import React from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export function KeyPoints({ points = [], title = "Key Focus Areas" }) {
  if (!Array.isArray(points) || points.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-text uppercase tracking-wider">
        <Target size={13} className="text-primary" />
        <span>{title}</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {points.map((pt, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface border border-border/60 hover:border-primary/30 transition-colors shadow-2xs"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
              {idx + 1}
            </div>
            <div className="flex-1 text-xs text-text-secondary leading-relaxed">
              <MarkdownRenderer content={typeof pt === 'string' ? pt : String(pt)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
