import React from 'react';
import { MarkdownRenderer } from '../../MarkdownRenderer';

export function StepsBlock({ title, items }) {
  if (!items || !items.length) return null;

  return (
    <div className="my-2">
      {title && <h4 className="font-bold text-sm text-text mb-2">{title}</h4>}
      <ol className="list-decimal list-outside pl-5 space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-text leading-relaxed">
            <MarkdownRenderer content={item} />
          </li>
        ))}
      </ol>
    </div>
  );
}
