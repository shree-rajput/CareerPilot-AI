import React from 'react';
import { RESPONSE_TYPES } from '../../utils/copilotMessageNormalizer';
import { ResponseSummary } from './ResponseSummary';
import { KeyPoints } from './KeyPoints';
import { ExpandableSection } from './ExpandableSection';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InterviewPrepView } from './views/InterviewPrepView';
import { ResumeAnalysisView } from './views/ResumeAnalysisView';
import { ProjectAnalysisView } from './views/ProjectAnalysisView';
import { RecommendationView } from './views/RecommendationView';

export function ResponseContent({ message, onSelectAction }) {
  if (!message) return null;

  const {
    responseType,
    summary,
    keyPoints = [],
    content = '',
    expandableSections = [],
    sections = []
  } = message;

  // 1. Route to Specialized Views based on responseType
  if (responseType === RESPONSE_TYPES.INTERVIEW_PREPARATION) {
    return <InterviewPrepView message={message} onSelectAction={onSelectAction} />;
  }

  if (responseType === RESPONSE_TYPES.RESUME_ANALYSIS) {
    return <ResumeAnalysisView message={message} onSelectAction={onSelectAction} />;
  }

  if (responseType === RESPONSE_TYPES.PROJECT_ANALYSIS) {
    return <ProjectAnalysisView message={message} onSelectAction={onSelectAction} />;
  }

  if (responseType === RESPONSE_TYPES.RECOMMENDATION || responseType === RESPONSE_TYPES.ACTION_PLAN) {
    return <RecommendationView message={message} onSelectAction={onSelectAction} />;
  }

  // 2. Default Progressive Renderer for DIRECT_ANSWER, EXPLANATION, CODE_EXPLANATION, etc.
  return (
    <div className="space-y-3">
      {/* Short Summary / Direct Answer first */}
      {summary && <ResponseSummary summary={summary} title={responseType === RESPONSE_TYPES.CODE_EXPLANATION ? "Quick Code Summary" : "Direct Answer"} />}

      {/* Key Focus Points */}
      {keyPoints.length > 0 && <KeyPoints points={keyPoints} />}

      {/* Primary Markdown Content */}
      {content && (
        <div className="text-xs text-text leading-relaxed">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Render UI Sections if present in message model */}
      {sections.length > 0 && (
        <div className="space-y-2 pt-1">
          {sections.map((sec, idx) => (
            <div key={idx}>
              {sec.title && <h4 className="font-bold text-text text-xs mt-2 mb-1">{sec.title}</h4>}
              {sec.content && <MarkdownRenderer content={sec.content} />}
            </div>
          ))}
        </div>
      )}

      {/* Progressive Disclosure: Expandable Sections for deep dives, code breakdowns, or examples */}
      {expandableSections.map((sec, idx) => (
        <ExpandableSection
          key={sec.id || idx}
          title={sec.title || "Show Detailed Explanation"}
          content={sec.content}
        />
      ))}
    </div>
  );
}
