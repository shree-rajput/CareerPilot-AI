import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlockComponent({ code = '', language = 'code' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-border bg-[#0d1117] text-gray-200 overflow-hidden text-xs font-mono shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-border/50 text-[11px] text-gray-400 font-sans">
        <span className="font-semibold uppercase tracking-wider text-gray-300">
          {language || 'code'}
        </span>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto leading-relaxed">
        <pre className="m-0 font-mono whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}
