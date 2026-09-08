import React, { useState } from 'react';
import { Copy, Check, RefreshCw, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ResponseContent } from './ResponseContent';
import { StructuredResponse } from './StructuredResponse';
import { ErrorMessageCard } from './ErrorMessageCard';
import { toast } from '../../context/ToastContext';

export function AssistantMessage({
  message,
  onRetry,
  onSelectAction,
  isLastMessage = false,
  isLoading = false
}) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(null); // 'up' | 'down' | null

  if (!message) return null;

  const isError = message.status === 'error';
  const content = message.content || '';
  const structuredData = message.structuredData;
  const suggestedActions = message.suggestedActions || [];

  const handleCopy = async () => {
    const textToCopy = message.summary
      ? `${message.summary}\n\n${content}`
      : content;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleRate = (type) => {
    if (rating === type) {
      setRating(null);
    } else {
      setRating(type);
      toast.success("Feedback submitted. Thank you!");
    }
  };

  return (
    <div className="flex gap-3 flex-row items-start my-4 animate-fade-in group w-full">
      {/* Assistant Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-2xs mt-0.5">
        <img src="/favicon.png" alt="CareerPilot" className="w-4 h-4 object-contain" />
      </div>

      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        {/* Assistant Header Badge */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-text text-xs">CareerPilot</span>
          <span className="text-[10px] text-text-muted font-medium bg-bg-secondary px-1.5 py-0.5 rounded border border-border/50">
            Copilot
          </span>
        </div>

        {/* Response Body */}
        {isError ? (
          <div className="p-4 rounded-2xl bg-bg-secondary text-text border border-border/80">
            <ErrorMessageCard message={content} onRetry={onRetry} />
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {/* Primary Response Content Dispatcher */}
            <ResponseContent message={message} onSelectAction={onSelectAction} />

            {/* Optional Legacy Structured Data Cards */}
            {structuredData && <StructuredResponse structuredData={structuredData} />}
          </div>
        )}

        {/* Action Bar & Suggested Follow-up Actions */}
        {!isError && (
          <div className="flex flex-col gap-2 pt-1">
            {/* Action Toolbar */}
            <div className="flex items-center gap-3 text-[11px] text-text-muted px-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
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

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleRate('up')}
                  className={`p-1 rounded hover:bg-bg-secondary transition-colors cursor-pointer ${
                    rating === 'up' ? 'text-emerald-600 font-bold' : 'hover:text-primary'
                  }`}
                  title="Good response"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('down')}
                  className={`p-1 rounded hover:bg-bg-secondary transition-colors cursor-pointer ${
                    rating === 'down' ? 'text-rose-600 font-bold' : 'hover:text-primary'
                  }`}
                  title="Bad response"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>

              {onRetry && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                    title="Retry response"
                  >
                    <RefreshCw size={11} />
                    <span>Retry</span>
                  </button>
                </>
              )}
            </div>

            {/* Suggested Follow-up Action Buttons */}
            {isLastMessage && !isLoading && suggestedActions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Suggested Next Steps
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedActions.map((actionText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectAction && onSelectAction(actionText)}
                      className="px-3 py-1.5 bg-surface hover:bg-primary/10 border border-primary/30 text-[11px] font-semibold text-primary rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-primary/60 active:scale-98"
                    >
                      <span>{actionText}</span>
                      <ArrowRight size={11} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
