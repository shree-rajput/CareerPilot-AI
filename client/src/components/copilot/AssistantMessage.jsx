import React, { useState } from 'react';
import { Bot, Copy, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StructuredResponse } from './StructuredResponse';
import { ErrorMessageCard } from './ErrorMessageCard';

export function AssistantMessage({ message, onRetry, onSelectAction, isLastMessage = false, isLoading = false }) {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const isError = message.status === 'error';
  const content = message.content || '';
  const sections = message.sections || [];
  const structuredData = message.structuredData;
  const suggestedActions = message.suggestedActions || [];

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  return (
    <div className="flex gap-3 flex-row items-start my-3 animate-fade-in group">
      {/* Assistant Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
        <img src="/favicon.png" alt="CareerPilot" className="w-4 h-4 object-contain" />
      </div>

      <div className="flex flex-col gap-2 max-w-[88%] sm:max-w-[82%]">
        {/* Message Container */}
        <div className="p-4 rounded-2xl bg-bg-secondary text-text border border-border/80 rounded-tl-xs shadow-xs space-y-3">
          {isError ? (
            <ErrorMessageCard message={content} onRetry={onRetry} />
          ) : (
            <>
              {/* Primary Content (Markdown) */}
              {content && <MarkdownRenderer content={content} />}

              {/* Render Sections if present */}
              {sections.length > 0 && (
                <div className="space-y-2">
                  {sections.map((sec, idx) => (
                    <div key={idx}>
                      {sec.title && <h4 className="font-bold text-text text-xs mt-2 mb-1">{sec.title}</h4>}
                      {sec.content && <MarkdownRenderer content={sec.content} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Structured Data Component Cards */}
              {structuredData && <StructuredResponse structuredData={structuredData} />}
            </>
          )}
        </div>

        {/* Action Bar & Suggested Actions */}
        {!isError && (
          <div className="flex flex-col gap-2">
            {/* Copy / Retry buttons */}
            <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity text-[11px] text-text-muted px-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-500 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRetry && (
                <>
                  <span>•</span>
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                    title="Retry response"
                  >
                    <RefreshCw size={11} />
                    <span>Retry</span>
                  </button>
                </>
              )}
            </div>

            {/* Suggested Follow-up Actions */}
            {isLastMessage && !isLoading && suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestedActions.map((actionText, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectAction && onSelectAction(actionText)}
                    className="px-3 py-1 bg-surface hover:bg-primary/10 border border-primary/30 text-[11px] font-semibold text-primary rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-primary/60"
                  >
                    <span>{actionText}</span>
                    <ArrowRight size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
