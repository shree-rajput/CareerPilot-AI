import React from 'react';
import { MarkdownRenderer } from '../../MarkdownRenderer';

export function TextBlock({ content }) {
  if (!content) return null;
  return (
    <div className="text-sm leading-relaxed text-text">
      <MarkdownRenderer content={content} />
    </div>
  );
}
