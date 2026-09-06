import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { StepsBlock } from './blocks/StepsBlock';
import { CalloutBlock } from './blocks/CalloutBlock';

export function CopilotMessageRenderer({ content, sections }) {
  // Fallback for older messages without structured sections
  if (!sections || !sections.length) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section, idx) => {
        switch (section.type) {
          case 'code':
            return <CodeBlock key={idx} language={section.language} content={section.content} />;
          case 'steps':
            return <StepsBlock key={idx} title={section.title} items={section.items} />;
          case 'callout':
            return <CalloutBlock key={idx} intent={section.intent} title={section.title} content={section.content} />;
          case 'text':
          case 'markdown':
          default:
            return <TextBlock key={idx} content={section.content} />;
        }
      })}
    </div>
  );
}
