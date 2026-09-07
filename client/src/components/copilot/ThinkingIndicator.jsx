import React from 'react';

export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 my-2 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
        <img src="/favicon.png" alt="CareerPilot" className="w-4 h-4 object-contain" />
      </div>

      <div className="p-3 rounded-2xl bg-bg-secondary text-text border border-border/80 rounded-tl-sm flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-text-secondary font-medium ml-1">CareerPilot is thinking...</span>
      </div>
    </div>
  );
}
