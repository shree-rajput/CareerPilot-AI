import React from 'react';
import { MarkdownRenderer } from '../../../copilot/MarkdownRenderer';
import { CodeBlockComponent } from '../../../copilot/CodeBlockComponent';

export function CopilotMessageRenderer({ content, sections }) {
  if (!sections || !sections.length) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section, idx) => {
        if (section.type === 'code') {
          return <CodeBlockComponent key={idx} language={section.language} code={section.content} />;
        }
        return (
          <div key={idx}>
            {section.title && <h4 className="font-bold text-text text-xs mt-2 mb-1">{section.title}</h4>}
            <MarkdownRenderer content={section.content || ''} />
          </div>
        );
      })}
    </div>
  );
}

