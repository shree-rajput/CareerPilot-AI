import React from 'react';

export function AITextRenderer({ text, className = '' }) {
  if (!text) return null;
  return (
    <div className={`text-text-secondary leading-relaxed text-sm whitespace-pre-wrap ${className}`}>
      {text}
    </div>
  );
}
