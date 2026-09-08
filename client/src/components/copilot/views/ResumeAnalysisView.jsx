import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ExpandableSection } from '../ExpandableSection';

export function ResumeAnalysisView({ message, onSelectAction }) {
  const { summary, keyPoints, content, expandableSections } = message;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <FileText size={15} />
          <span>Resume & Portfolio Review</span>
        </div>
        <span className="text-[10px] text-text-muted font-medium">ATS & Impact Evaluation</span>
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text leading-relaxed font-medium">
          <MarkdownRenderer content={summary} />
        </div>
      )}

      {/* Structured Strong Areas / Needs Improvement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Strong Areas */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <CheckCircle2 size={14} />
            <span>Strong Areas</span>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary">
            {keyPoints.slice(0, 3).map((kp, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{kp}</span>
              </li>
            ))}
            {keyPoints.length === 0 && (
              <li className="italic text-text-muted text-[11px]">Technical experience and project stack highlighted clearly.</li>
            )}
          </ul>
        </div>

        {/* Needs Improvement */}
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle size={14} />
            <span>Needs Improvement</span>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary">
            {keyPoints.slice(3).map((kp, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{kp}</span>
              </li>
            ))}
            {keyPoints.length <= 3 && (
              <li className="italic text-text-muted text-[11px]">Add measurable impact metrics and quantifiable results to experience bullet points.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Main Body content if present */}
      {content && (
        <div className="p-3 rounded-xl bg-surface border border-border/70 text-xs text-text leading-relaxed">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Expandable detailed breakdown */}
      {expandableSections.map((sec, idx) => (
        <ExpandableSection key={idx} title={sec.title || "Detailed Bullet & ATS Recommendations"} content={sec.content} />
      ))}
    </div>
  );
}
