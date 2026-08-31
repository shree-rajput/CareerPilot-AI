import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Sparkles, AlertCircle, Plus, Menu, MessageSquare, MoreVertical, Edit2, Trash2, Share2, X } from 'lucide-react';
import { copilotApi } from '../api/career';
import { Button } from '../components/ui/Button';
import { useParams, useNavigate } from 'react-router-dom';

// Simple Markdown Renderer to avoid dependencies
const SimpleMarkdown = ({ content }) => {
  if (!content) return null;
  const blocks = content.split('\n\n');

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        // Code blocks
        if (block.startsWith('```')) {
          const code = block.replace(/```[a-z]*\n?/g, '').replace(/```$/g, '');
          return <pre key={i} className="bg-bg text-text-secondary p-3 rounded-xl overflow-x-auto text-xs font-mono">{code}</pre>;
        }

        // Lists
        if (block.match(/^[-*]\s/m)) {
          const items = block.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {items.map((item, j) => {
                const text = item.replace(/^[-*]\s/, '');
                const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <li key={j} dangerouslySetInnerHTML={{ __html: bolded }} />;
              })}
            </ul>
          );
        }

        // Headings
        if (block.startsWith('#')) {
          const level = block.match(/^#+/)[0].length;
          const text = block.replace(/^#+\s/, '');
          const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          const Tag = `h${Math.min(level + 3, 6)}`;
          return <Tag key={i} className="font-bold text-text mt-4 mb-2" dangerouslySetInnerHTML={{ __html: bolded }} />;
        }

        // Paragraphs with inline bold and inline code
        const formatted = block
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-border px-1 py-0.5 rounded text-xs text-primary">$1</code>');

        return <p key={i} className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
};

export function CopilotPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const isSharedView = !!token;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('copilot_sidebar_collapsed');
    return saved !== 'true';
  });

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // id of conversation with open menu

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Toggle Sidebar
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('copilot_sidebar_collapsed', (!newState).toString());
  };

  // Initial Load
  useEffect(() => {
    if (isSharedView) {
      loadSharedConversation();
    } else {
      loadConversations();
    }
  }, [token]);

  const loadSharedConversation = async () => {
    try {
      setIsLoading(true);
      const res = await copilotApi.getSharedConversation(token);
      const conv = res.data || res;
      setActiveConversation(conv);
      setMessages(conv.messages || []);
    } catch (err) {
      setError("Shared conversation not found or access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async (autoSelectId = null) => {
    try {
      const res = await copilotApi.getConversations();
      // Ensure we always get an array
      let list = [];
      if (res && Array.isArray(res)) list = res;
      else if (res && Array.isArray(res.data)) list = res.data;
      else if (res && res.data && Array.isArray(res.data.data)) list = res.data.data;
      
      setConversations(list);
      if (list.length > 0 && !activeConversation && !autoSelectId) {
        // don't auto-load the first one, let them see an empty state or load explicit ID
      } else if (autoSelectId) {
        handleSelectConversation(autoSelectId);
      }
    } catch (err) {
      console.error("Failed to load history", err);
      setConversations([]);
    }
  };

  const handleSelectConversation = async (id) => {
    if (isSharedView) return;
    try {
      setIsLoading(true);
      const res = await copilotApi.getConversation(id);
      const conv = res.data || res;
      setActiveConversation(conv);
      setMessages(conv.messages || []);
      setError(null);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) {
      setError("Failed to load conversation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (isSharedView) {
      navigate('/copilot');
      return;
    }
    setActiveConversation(null);
    setMessages([]);
    setError(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isSharedView && !isLoading) {
      inputRef.current?.focus();
    }
  }, [activeConversation, isSharedView, isLoading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isSharedView) return;

    const userQuery = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      let activeId = activeConversation?._id;

      // Create new conversation if none active
      if (!activeId) {
        const res = await copilotApi.createConversation("New Conversation");
        const newConv = res.data || res;
        activeId = newConv._id;
        setActiveConversation(newConv);
      }

      const res = await copilotApi.sendMessage(activeId, userQuery);
      const responseData = res.data || res;

      if (responseData && responseData.conversation) {
        setActiveConversation(responseData.conversation);
        setMessages(responseData.conversation.messages);

        // Refresh history to update title implicitly generated in backend
        loadConversations();
      }
    } catch (err) {
      console.error("Copilot error:", err);
      setError("CareerPilot Copilot is temporarily unavailable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (id) => {
    const currentName = conversations.find(c => c._id === id)?.title || '';
    const newName = window.prompt("Rename conversation:", currentName);
    if (newName && newName.trim() && newName !== currentName) {
      try {
        await copilotApi.renameConversation(id, newName.trim());
        loadConversations();
      } catch (err) {
        alert("Failed to rename conversation.");
      }
    }
    setMenuOpen(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete conversation? This conversation and its messages will be permanently deleted.")) {
      try {
        await copilotApi.deleteConversation(id);
        if (activeConversation?._id === id) {
          handleNewChat();
        }
        loadConversations();
      } catch (err) {
        alert("Failed to delete conversation.");
      }
    }
    setMenuOpen(null);
  };

  const handleShare = async (id) => {
    try {
      const res = await copilotApi.shareConversation(id);
      const data = res.data || res;
      const url = `${window.location.origin}/copilot/shared/${data.shareToken}`;
      navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard!\n\n" + url);
    } catch (err) {
      alert("Failed to generate share link.");
    }
    setMenuOpen(null);
  };

  // Group conversations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const groupedConversations = safeConversations.reduce((acc, conv) => {
    const date = new Date(conv.updatedAt);
    if (date >= today) acc.today.push(conv);
    else if (date >= yesterday) acc.yesterday.push(conv);
    else acc.older.push(conv);
    return acc;
  }, { today: [], yesterday: [], older: [] });

  const renderConversationGroup = (title, group) => {
    if (group.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-2 px-3">{title}</h3>
        <div className="space-y-1">
          {group.map(conv => (
            <div
              key={conv._id}
              className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${activeConversation?._id === conv._id ? 'bg-primary text-white' : 'hover:bg-border/50 text-text'
                }`}
              onClick={() => handleSelectConversation(conv._id)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0 opacity-70" />
                <span className="text-sm font-medium truncate">{conv.title}</span>
              </div>

              {!isSharedView && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === conv._id ? null : conv._id); }}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${activeConversation?._id === conv._id ? 'hover:bg-white/20' : 'hover:bg-border text-text-secondary'
                      }`}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuOpen === conv._id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-lg py-1 z-10 text-text">
                      <button onClick={(e) => { e.stopPropagation(); handleRename(conv._id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-bg-secondary flex items-center gap-2"><Edit2 size={12} /> Rename</button>
                      <button onClick={(e) => { e.stopPropagation(); handleShare(conv._id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-bg-secondary flex items-center gap-2"><Share2 size={12} /> Share</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(conv._id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-danger/10 text-danger flex items-center gap-2"><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden">

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {!isSharedView && (
        <div className={`
          fixed md:relative z-30 h-full bg-bg-secondary border-r border-border flex flex-col transition-all duration-300
          ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'}
        `}>
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0 h-16">
            {sidebarOpen ? (
              <>
                <Button variant="primary" className="flex-1 justify-start gap-2 shadow-sm rounded-xl py-2 h-auto" onClick={handleNewChat}>
                  <Plus size={18} />
                  <span className="font-bold">New Chat</span>
                </Button>
                <button onClick={toggleSidebar} className="p-2 text-text-secondary hover:text-text rounded-lg ml-2 hidden md:block">
                  <Menu size={20} />
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4 items-center w-full">
                <button onClick={toggleSidebar} className="p-2 text-text-secondary hover:text-text hover:bg-border rounded-xl">
                  <Menu size={20} />
                </button>
                <button onClick={handleNewChat} className="p-2 text-white bg-primary shadow-sm rounded-xl" title="New Chat">
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-4 ${sidebarOpen ? 'block' : 'hidden md:hidden'}`}>
            {renderConversationGroup("Today", groupedConversations.today)}
            {renderConversationGroup("Yesterday", groupedConversations.yesterday)}
            {renderConversationGroup("Previous", groupedConversations.older)}

            {conversations.length === 0 && !isLoading && (
              <div className="text-center text-text-secondary text-sm p-4">
                No chat history yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0">

        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-border flex items-center px-4 md:px-6 justify-between bg-surface/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {(!sidebarOpen || isSharedView) && !isSharedView && (
              <button onClick={toggleSidebar} className="md:hidden p-2 -ml-2 text-text-secondary hover:bg-border rounded-xl">
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary p-1.5 rounded-lg border border-primary/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h1 className="font-bold text-text leading-none m-0 text-lg">CareerPilot Copilot</h1>
                {isSharedView && <span className="text-[10px] text-primary uppercase font-bold tracking-widest mt-0.5 block">Shared View - Read Only</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSharedView && (
              <Button onClick={() => navigate('/copilot')} variant="primary" size="sm" className="h-9 px-4 rounded-xl">
                Start your own Chat
              </Button>
            )}
            {!isSharedView && activeConversation && (
              <Button onClick={() => handleShare(activeConversation._id)} variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 hidden sm:flex">
                <Share2 size={14} /> Share
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">

            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                  <Bot size={32} />
                </div>
                <h2 className="text-2xl font-black text-text mb-2">How can I help you today?</h2>
                <p className="text-text-secondary mb-8 text-center max-w-md">I am aware of your Career Profile, Target Roles, and Active Preparation Plans.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {["Improve my resume", "Prepare me for an interview", "Analyze my career readiness", "Create a preparation plan"].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="p-4 bg-bg border border-border hover:border-primary/50 hover:shadow-md rounded-2xl text-sm font-medium text-text transition-all text-left group"
                    >
                      {prompt} <span className="opacity-0 group-hover:opacity-100 transition-opacity float-right text-primary">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-primary'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>

                <div className={`max-w-[85%] text-sm rounded-2xl p-5 shadow-sm ${msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-bg-secondary text-text border border-border rounded-tl-sm'
                  }`}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <SimpleMarkdown content={msg.content} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 flex-row animate-in fade-in duration-300">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-surface border border-border text-primary flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-sm text-sm bg-bg-secondary text-text border border-border shadow-sm flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span className="text-text-secondary font-semibold">Copilot is thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-danger-bg border border-danger/20 rounded-2xl p-4 flex items-start gap-3 mt-4 animate-in slide-in-from-bottom-2">
                <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-danger font-semibold m-0">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input Area */}
        {!isSharedView && (
          <div className="p-4 md:p-6 bg-surface shrink-0">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="relative flex items-end gap-3 bg-bg-secondary border border-border rounded-3xl p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask Copilot anything..."
                  className="flex-1 bg-transparent border-0 px-4 py-3 text-sm text-text placeholder-text-secondary focus:outline-none resize-none min-h-[44px] max-h-[200px]"
                  rows={1}
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 p-0 rounded-2xl shrink-0 flex items-center justify-center"
                >
                  <Send size={18} className={input.trim() && !isLoading ? 'ml-1' : ''} />
                </Button>
              </form>
              <div className="text-center mt-3">
                <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">
                  CareerPilot Copilot AI can make mistakes. Check important information.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
