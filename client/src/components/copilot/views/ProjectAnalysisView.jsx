import React from 'react';
import { Briefcase, Code, Compass, ArrowRight, ShieldCheck } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ExpandableSection } from '../ExpandableSection';

export function ProjectAnalysisView({ message, onSelectAction }) {
  const { summary, keyPoints, content, expandableSections } = message;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Briefcase size={15} />
          <span>Project Architecture & Interview Focus</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <ShieldCheck size={11} /> Grounded in Resume Context
        </span>
      </div>

      {/* Direct Summary */}
      {summary && (
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text leading-relaxed font-medium">
          <MarkdownRenderer content={summary} />
        </div>
      )}

      {/* Focus Areas Grid */}
      {keyPoints.length > 0 && (
        <div className="p-3 rounded-xl bg-surface border border-border/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text">
            <Compass size={14} className="text-primary" />
            <span>Interviewer Focus Areas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {keyPoints.map((kp, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-bg-secondary/60 border border-border/50 text-xs text-text-secondary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="font-medium text-text">{kp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {content && (
        <div className="text-xs text-text leading-relaxed space-y-2">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Expandable Technical Deep Dive */}
      {expandableSections.map((sec, idx) => (
        <ExpandableSection key={idx} title={sec.title || "Technical Deep Dive & Architecture Proposals"} content={sec.content} />
      ))}
    </div>
  );
}
