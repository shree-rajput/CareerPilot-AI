import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CodeBlock({ content, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) return null;

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-bg-secondary my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border">
        <span className="text-xs font-mono text-text-muted">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-text-muted hover:text-text transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"
        >
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-text leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
