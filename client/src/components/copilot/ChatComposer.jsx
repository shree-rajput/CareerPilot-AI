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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
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
    <div className="p-3 bg-surface border-t border-border shrink-0 z-10">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading && !disabled) {
              onSubmit(e);
            }
          }}
          className="flex items-end gap-2 bg-bg-secondary/70 border border-border rounded-2xl p-2 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs"
        >
          <div className="pl-2 pb-2 text-primary">
            <Sparkles size={16} />
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading || disabled}
            className="flex-1 bg-transparent border-0 px-2 py-1 text-xs text-text placeholder-text-muted focus:outline-none resize-none min-h-[36px] max-h-32 leading-relaxed"
          />

          <Button
            type="submit"
            size="xs"
            disabled={!input.trim() || isLoading || disabled}
            className="h-8 w-8 p-0 rounded-xl shrink-0 flex items-center justify-center cursor-pointer shadow-xs mb-0.5"
          >
            <Send size={13} />
          </Button>
        </form>

        <p className="text-[10px] text-text-muted text-center mt-1.5 font-medium m-0">
          Press <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border text-[9px]">Shift + Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
}
