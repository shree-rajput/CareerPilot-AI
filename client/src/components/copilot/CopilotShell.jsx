import React, { useState } from 'react';
import { Menu, Sparkles, Share2, Download } from 'lucide-react';
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
  pinnedIds = [],
  onSendMessage,
  onRetry,
  onSelectPrompt,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
  onShare,
  onTogglePin,
  onExportChat,
  onClearAll,
  onEditUserPrompt,
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
    <div className="flex h-screen w-full bg-surface overflow-hidden font-sans text-text">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        pinnedIds={pinnedIds}
        onSelectConversation={onSelectConversation}
        onNewChat={onNewChat}
        onRename={onRename}
        onDelete={onDelete}
        onShare={onShare}
        onTogglePin={onTogglePin}
        onExportChat={onExportChat}
        onClearAll={onClearAll}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        isSharedView={isSharedView}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0">
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-border flex items-center px-4 justify-between bg-bg-secondary/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            {!sidebarOpen && !isSharedView && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-text-secondary hover:text-text rounded-lg mr-1 cursor-pointer transition-colors"
                title="Expand sidebar"
              >
                <Menu size={16} />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1 shadow-2xs">
                <img src="/favicon.png" alt="CareerPilot AI" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-text text-sm m-0 leading-tight tracking-tight">CareerPilot Copilot</h1>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold tracking-wide">
                    Live AI
                  </span>
                </div>
                <span className="text-[10px] text-text-muted font-medium">Personal Placement & Career Coach</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSharedView && activeConversation && (
              <>
                <Button
                  onClick={() => onExportChat && onExportChat(activeConversation._id)}
                  variant="outline"
                  size="xs"
                  className="rounded-xl border-border/80 hover:border-primary/40 transition-all text-xs font-semibold"
                >
                  <Download size={13} className="mr-1.5 text-primary" /> Export .md
                </Button>
                <Button
                  onClick={() => onShare && onShare(activeConversation._id)}
                  variant="outline"
                  size="xs"
                  className="rounded-xl border-border/80 hover:border-primary/40 transition-all text-xs font-semibold"
                >
                  <Share2 size={13} className="mr-1.5 text-primary" /> Share Chat
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Message Container */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onRetry={onRetry}
          onSelectPrompt={onSelectPrompt}
          onEditUserPrompt={onEditUserPrompt}
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
