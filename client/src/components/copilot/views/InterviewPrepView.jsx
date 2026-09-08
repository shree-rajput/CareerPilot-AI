import React from 'react';
import { HelpCircle, Play, ArrowRight, MessageSquareCode } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ExpandableSection } from '../ExpandableSection';

export function InterviewPrepView({ message, onSelectAction }) {
  const { summary, keyPoints, content, expandableSections, suggestedActions } = message;

  // Extract numbered questions if present in main content or summary
  const rawQuestions = [];
  const lines = (content || '').split('\n');
  let currentQuestion = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    const numMatch = /^(\d+)\.\s+(.*)/.exec(trimmed);
    if (numMatch) {
      if (currentQuestion) rawQuestions.push(currentQuestion);
      currentQuestion = { num: numMatch[1], title: numMatch[2], details: '' };
    } else if (currentQuestion && trimmed) {
      currentQuestion.details += (currentQuestion.details ? '\n' : '') + trimmed;
    }
  });
  if (currentQuestion) rawQuestions.push(currentQuestion);

  // Take top 4 questions for direct presentation, place rest in expandable
  const topQuestions = rawQuestions.slice(0, 4);
  const overflowQuestions = rawQuestions.slice(4);

  return (
    <div className="space-y-3">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <HelpCircle size={15} />
          <span>Interview Preparation Focus</span>
        </div>
        <span className="text-[10px] text-text-muted font-medium">Prioritized for maximum impact</span>
      </div>

      {/* Summary / Direct Answer */}
      {summary && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text leading-relaxed font-medium">
          <MarkdownRenderer content={summary} />
        </div>
      )}

      {/* Key Focus Points */}
      {keyPoints.length > 0 && (
        <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-border/70">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Key Areas Interviewer Will Focus On</span>
          <ul className="space-y-1 text-xs text-text-secondary list-disc list-inside">
            {keyPoints.map((kp, idx) => (
              <li key={idx}><span className="font-semibold text-text">{kp}</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Interview Questions Cards */}
      {topQuestions.length > 0 ? (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">Most Likely Questions</span>
          {topQuestions.map((q, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-surface border border-border/80 hover:border-primary/40 transition-all space-y-2 shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {q.num || idx + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-text text-xs m-0 leading-snug">{q.title}</h4>
                  {q.details && (
                    <div className="text-[11px] text-text-secondary leading-relaxed">
                      <MarkdownRenderer content={q.details} />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button per Question */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onSelectAction && onSelectAction(`Practice answer for: ${q.title}`)}
                  className="px-2.5 py-1 rounded-lg bg-bg-secondary hover:bg-primary/10 border border-border text-[11px] font-medium text-text hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquareCode size={12} className="text-primary" />
                  <span>Practice Answer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* If no structured questions extracted, render main content concisely */
        content && (
          <div className="text-xs text-text leading-relaxed">
            <MarkdownRenderer content={content} />
          </div>
        )
      )}

      {/* Overflow questions placed inside expandable */}
      {overflowQuestions.length > 0 && (
        <ExpandableSection
          title={`▸ Additional Questions (${overflowQuestions.length} more)`}
          content={overflowQuestions.map(q => `${q.num}. ${q.title}\n${q.details}`).join('\n\n')}
        />
      )}

      {/* Custom expandable sections from model */}
      {expandableSections.map((sec, idx) => (
        <ExpandableSection key={idx} title={sec.title || "Deep Technical Questions & Follow-ups"} content={sec.content} />
      ))}
    </div>
  );
}
