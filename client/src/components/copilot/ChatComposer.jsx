import React, { useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export function ChatComposer({
  input = '',
  setInput,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Ask CareerPilot anything about your career, resume, or projects..."
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && !disabled) {
        onSubmit(e);
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-bg-secondary/40 border-t border-border/70 backdrop-blur-md shrink-0 z-10">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading && !disabled) {
              onSubmit(e);
            }
          }}
          className="flex items-end gap-2 bg-surface border border-border/80 rounded-2xl p-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all shadow-sm"
        >
          <div className="pl-1.5 pb-2 text-primary">
            <Sparkles size={16} className="opacity-90" />
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading || disabled}
            className="flex-1 bg-transparent border-0 px-2 py-1 text-xs sm:text-sm text-text placeholder-text-muted focus:outline-none resize-none min-h-[36px] max-h-32 leading-relaxed"
          />

          <Button
            type="submit"
            size="xs"
            disabled={!input.trim() || isLoading || disabled}
            className="h-8.5 w-8.5 p-0 rounded-xl shrink-0 flex items-center justify-center cursor-pointer shadow-xs mb-0.5 transition-transform active:scale-95 disabled:opacity-40"
          >
            <Send size={14} />
          </Button>
        </form>

        <p className="text-[10px] text-text-muted text-center mt-2 font-medium m-0 flex items-center justify-center gap-1">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px] font-mono shadow-2xs">Enter ↵</kbd>
          <span>to send,</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px] font-mono shadow-2xs">Shift + Enter</kbd>
          <span>for newline</span>
        </p>
      </div>
    </div>
  );
}
