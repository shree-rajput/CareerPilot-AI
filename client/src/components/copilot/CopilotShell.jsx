import React, { useState } from 'react';
import { Menu, Sparkles, Share2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';

export function CopilotShell({
  conversations = [],
  activeConversation = null,
  messages = [],
  isLoading = false,
  error = null,
  input = '',
  setInput,
  onSendMessage,
  onRetry,
  onSelectPrompt,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
  onShare,
  isSharedView = false
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('copilot_sidebar_collapsed');
    return saved !== 'true';
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('copilot_sidebar_collapsed', (!next).toString());
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={onSelectConversation}
        onNewChat={onNewChat}
        onRename={onRename}
        onDelete={onDelete}
        onShare={onShare}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        isSharedView={isSharedView}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0">
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-border flex items-center px-4 justify-between bg-surface z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && !isSharedView && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-text-secondary hover:text-text rounded-lg mr-1 cursor-pointer"
                title="Expand sidebar"
              >
                <Menu size={16} />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 text-primary p-1.5 rounded-xl border border-primary/20">
                <Sparkles size={16} />
              </div>
              <div>
                <h1 className="font-bold text-text text-sm m-0 leading-tight">CareerPilot Copilot</h1>
                <span className="text-[10px] text-text-secondary font-medium">Personal Placement & Career Coach</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSharedView && activeConversation && (
              <Button
                onClick={() => onShare && onShare(activeConversation._id)}
                variant="outline"
                size="xs"
                className="rounded-xl"
              >
                <Share2 size={13} className="mr-1.5" /> Share
              </Button>
            )}
          </div>
        </header>

        {/* Message Container */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onRetry={onRetry}
          onSelectPrompt={onSelectPrompt}
        />

        {/* Fixed Input Composer */}
        {!isSharedView && (
          <ChatComposer
            input={input}
            setInput={setInput}
            onSubmit={(e) => {
              e?.preventDefault();
              onSendMessage(input);
              setInput('');
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
