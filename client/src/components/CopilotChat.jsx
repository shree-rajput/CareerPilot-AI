import React, { useState } from 'react';
import { MessageSquare, X, ExternalLink } from 'lucide-react';
import { useCopilotChat } from '../hooks/useCopilotChat';
import { ChatMessageList } from './copilot/ChatMessageList';
import { ChatComposer } from './copilot/ChatComposer';

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const {
    messages,
    isLoading,
    sendMessage,
    retryLastMessage
  } = useCopilotChat();

  return (
    <>
      {/* Floating Widget Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-[100] flex items-center justify-center cursor-pointer ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Open CareerPilot Copilot"
      >
        <MessageSquare size={20} />
      </button>

      {/* Floating Chat Drawer */}
      <div
        className={`fixed bottom-6 right-6 w-[400px] h-[620px] max-h-[85vh] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col z-[100] transition-all duration-300 transform origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-bg-secondary rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/20">
              <img src="/favicon.png" alt="CareerPilot" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-text text-xs leading-tight m-0">CareerCopilot</h3>
              <p className="text-[10px] text-text-secondary font-medium m-0">Personal placement coach</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsOpen(false);
                window.open('/copilot', '_blank', 'noopener,noreferrer');
              }}
              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
              title="Open full page"
            >
              <ExternalLink size={16} />
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-text-secondary hover:bg-border/60 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onRetry={retryLastMessage}
          onSelectPrompt={(p) => {
            sendMessage(p);
          }}
        />

        {/* Input Composer */}
        <ChatComposer
          input={input}
          setInput={setInput}
          onSubmit={() => {
            sendMessage(input);
            setInput('');
          }}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
