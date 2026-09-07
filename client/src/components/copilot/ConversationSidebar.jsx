import React, { useState } from 'react';
import { Plus, Menu, MessageSquare, MoreVertical, Edit2, Trash2, Share2, Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from '../../context/ToastContext';

export function ConversationSidebar({
  conversations = [],
  activeConversation = null,
  onSelectConversation,
  onNewChat,
  onRename,
  onDelete,
  onShare,
  sidebarOpen = true,
  toggleSidebar,
  isSharedView = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = safeConversations.filter(c =>
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = filteredConversations.reduce((acc, conv) => {
    const date = new Date(conv.updatedAt || conv.createdAt || Date.now());
    if (date >= today) acc.today.push(conv);
    else if (date >= yesterday) acc.yesterday.push(conv);
    else acc.older.push(conv);
    return acc;
  }, { today: [], yesterday: [], older: [] });

  const renderGroup = (title, group) => {
    if (!group.length) return null;
    return (
      <div className="mb-4">
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-1.5 px-2">{title}</h3>
        <div className="space-y-0.5">
          {group.map(conv => {
            const isActive = activeConversation?._id === conv._id;

            return (
              <div
                key={conv._id}
                onClick={() => onSelectConversation && onSelectConversation(conv._id)}
                className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-xs'
                    : 'hover:bg-bg-secondary/80 text-text-secondary hover:text-text'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <MessageSquare size={14} className="shrink-0 opacity-70" />
                  <span className="truncate">{conv.title || "Untitled Conversation"}</span>
                </div>

                {!isSharedView && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === conv._id ? null : conv._id);
                      }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/10 text-current transition-opacity"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {menuOpenId === conv._id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-lg py-1 z-50 text-text text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onRename && onRename(conv._id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 size={12} /> Rename
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onShare && onShare(conv._id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 size={12} /> Share
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onDelete && onDelete(conv._id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 cursor-pointer font-medium"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20 backdrop-blur-xs"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside className={`
        fixed md:relative z-30 h-full bg-bg-secondary/90 border-r border-border flex flex-col transition-all duration-200 shrink-0
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-14 md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0 h-14">
          {sidebarOpen ? (
            <>
              <Button
                size="xs"
                variant="primary"
                className="flex-1 justify-start gap-1.5 font-bold rounded-xl"
                onClick={onNewChat}
              >
                <Plus size={14} />
                <span>New Chat</span>
              </Button>
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-text-secondary hover:text-text rounded-lg ml-1 hidden md:block cursor-pointer"
                title="Collapse sidebar"
              >
                <Menu size={16} />
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 items-center w-full">
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-text-secondary hover:text-text rounded-lg cursor-pointer"
                title="Expand sidebar"
              >
                <Menu size={16} />
              </button>
              <button
                onClick={onNewChat}
                className="p-1.5 text-white bg-primary rounded-lg cursor-pointer shadow-xs"
                title="New Chat"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Search & List */}
        <div className={`flex-1 overflow-y-auto p-3 ${sidebarOpen ? 'block' : 'hidden'}`}>
          {/* Search Box */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-surface border border-border/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-text placeholder-text-muted focus:outline-none focus:border-primary/60"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-text-muted hover:text-text cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {renderGroup("Today", grouped.today)}
          {renderGroup("Yesterday", grouped.yesterday)}
          {renderGroup("Previous", grouped.older)}
        </div>
      </aside>
    </>
  );
}
