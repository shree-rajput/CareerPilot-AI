import React from 'react';
import { Target, Zap, ArrowRight } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ExpandableSection } from '../ExpandableSection';

export function RecommendationView({ message, onSelectAction }) {
  const { summary, keyPoints, content, expandableSections } = message;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Target size={15} />
          <span>Career Recommendation</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold tracking-wide">
          High Priority
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text font-medium leading-relaxed">
          <MarkdownRenderer content={summary} />
        </div>
      )}

      {/* Key Focus Items */}
      {keyPoints.length > 0 && (
        <div className="space-y-2 bg-surface p-3 rounded-xl border border-border/80">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Recommended Focus Items</span>
          <div className="space-y-1.5">
            {keyPoints.map((kp, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-bg-secondary/50 border border-border/40 text-xs">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="text-text-secondary flex-1">
                  <MarkdownRenderer content={kp} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {content && (
        <div className="text-xs text-text leading-relaxed">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Expandable Details */}
      {expandableSections.map((sec, idx) => (
        <ExpandableSection key={idx} title={sec.title || "Detailed Preparation Plan & Strategy"} content={sec.content} />
      ))}
    </div>
  );
}
