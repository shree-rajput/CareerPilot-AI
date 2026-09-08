import React from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export function ResponseSummary({ summary, title = "Direct Answer" }) {
  if (!summary || typeof summary !== 'string') return null;

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 text-text space-y-1.5 shadow-2xs">
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
        <Zap size={13} className="fill-primary/20 text-primary" />
        <span>{title}</span>
      </div>
      <div className="text-xs sm:text-sm text-text font-medium leading-relaxed">
        <MarkdownRenderer content={summary} />
      </div>
    </div>
  );
}
