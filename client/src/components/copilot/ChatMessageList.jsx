import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { CopilotLandingState } from './CopilotLandingState';

export function ChatMessageList({
  messages = [],
  isLoading = false,
  onRetry,
  onSelectPrompt,
  onEditUserPrompt
}) {
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Check scroll position to determine if user is manually reviewing history
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 120;
    userScrolledUpRef.current = !isNearBottom;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  if (!messages.length && !isLoading) {
    return <CopilotLandingState onSelectPrompt={onSelectPrompt} />;
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar max-w-3xl mx-auto w-full"
      >
        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;

          if (msg.role === 'user') {
            return (
              <UserMessage
                key={msg.id || idx}
                message={msg}
                onEditSubmit={(newText) => onEditUserPrompt && onEditUserPrompt(idx, newText)}
              />
            );
          }

          return (
            <AssistantMessage
              key={msg.id || idx}
              message={msg}
              onRetry={isLast ? onRetry : null}
              onSelectAction={onSelectPrompt}
              isLastMessage={isLast}
              isLoading={isLoading}
            />
          );
        })}

        {isLoading && <ThinkingIndicator />}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 md:right-10 z-20 px-3 py-1.5 rounded-full bg-surface/90 border border-primary/40 text-primary text-xs font-bold shadow-lg backdrop-blur-md hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer animate-bounce"
        >
          <ArrowDown size={13} />
          <span>Scroll to bottom</span>
        </button>
      )}
    </div>
  );
}
