import React, { useRef, useEffect } from 'react';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { CopilotLandingState } from './CopilotLandingState';

export function ChatMessageList({
  messages = [],
  isLoading = false,
  onRetry,
  onSelectPrompt
}) {
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  // Check scroll position to determine if user is manually reviewing history
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 120;
    userScrolledUpRef.current = !isNearBottom;
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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar max-w-3xl mx-auto w-full"
    >
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;

        if (msg.role === 'user') {
          return <UserMessage key={msg.id || idx} message={msg} />;
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
  );
}
