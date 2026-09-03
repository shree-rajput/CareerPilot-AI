import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Sparkles, AlertCircle, Plus, Menu, MessageSquare, MoreVertical, Edit2, Trash2, Share2 } from 'lucide-react';
import { copilotApi } from '../api/career';
import { Button } from '../components/ui/Button';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from "../context/ToastContext";

const SimpleMarkdown = ({ content }) => {
  if (!content) return null;
  const blocks = content.split('\n\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {blocks.map((block, i) => {
        if (block.startsWith('```')) {
          const code = block.replace(/```[a-z]*\n?/g, '').replace(/```$/g, '');
          return <pre key={i} className="bg-bg text-text p-2.5 rounded-lg overflow-x-auto text-[11px] font-mono border border-border">{code}</pre>;
        }

        if (block.match(/^[-*]\s/m)) {
          const items = block.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          return (
            <ul key={i} className="list-disc pl-4 space-y-1">
              {items.map((item, j) => {
                const text = item.replace(/^[-*]\s/, '');
                const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <li key={j} dangerouslySetInnerHTML={{ __html: bolded }} />;
              })}
            </ul>
          );
        }

        if (block.startsWith('#')) {
          const level = block.match(/^#+/)[0].length;
          const text = block.replace(/^#+\s/, '');
          const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          const Tag = `h${Math.min(level + 3, 6)}`;
          return <Tag key={i} className="font-bold text-text mt-3 mb-1 text-xs" dangerouslySetInnerHTML={{ __html: bolded }} />;
        }

        const formatted = block
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-bg-secondary px-1 py-0.5 rounded text-[11px] font-mono text-primary">$1</code>');

        return <p key={i} className="m-0 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
};

export function CopilotPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSharedView = !!token;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('copilot_sidebar_collapsed');
    return saved !== 'true';
  });

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('copilot_sidebar_collapsed', (!newState).toString());
  };

  useEffect(() => {
    if (isSharedView) {
      loadSharedConversation();
    } else {
      loadConversations();
    }
  }, [token]);

  // Handle incoming initialPrompt from Projects or Preparation Pages
  useEffect(() => {
    if (location.state?.initialPrompt && !isSharedView && !isLoading) {
      const promptText = location.state.initialPrompt;
      const titleText = location.state.title || "Career Copilot";
      // Clear location state after consumption
      window.history.replaceState({}, document.title);
      startContextThread(promptText, titleText);
    }
  }, [location.state]);

  const startContextThread = async (queryText, titleText) => {
    try {
      setIsLoading(true);
      setError(null);
      setMessages([{ role: 'user', content: queryText }]);

      const createRes = await copilotApi.createConversation(titleText);
      const newConv = createRes?.data;
      if (!newConv?._id) throw new Error("Failed to create conversation session");
      
      setActiveConversation(newConv);

      const sendRes = await copilotApi.sendMessage(newConv._id, queryText);
      const payload = sendRes?.data;

      if (payload?.conversation) {
        setActiveConversation(payload.conversation);
        setMessages(payload.conversation.messages || []);
        setSuggestedActions(payload.suggestedActions || []);
        loadConversations();
      } else if (payload?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: payload.reply }]);
        setSuggestedActions(payload.suggestedActions || []);
        loadConversations();
      }
    } catch (err) {
      console.error("Failed to start context thread:", err);
      setError(err?.message || "Failed to start Copilot thread.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSharedConversation = async () => {
    try {
      setIsLoading(true);
      const res = await copilotApi.getSharedConversation(token);
      const conv = res?.data;
      if (!conv) throw new Error("Shared conversation not found");
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
      const list = Array.isArray(res?.data) ? res.data : [];
      setConversations(list);
      if (autoSelectId) {
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
      const conv = res?.data;
      if (!conv) throw new Error("Invalid conversation data");
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

      if (!activeId) {
        const createRes = await copilotApi.createConversation("New Conversation");
        const newConv = createRes?.data;
        activeId = newConv?._id;
        if (!activeId) throw new Error("Failed to create conversation");
        setActiveConversation(newConv);
      }

      const sendRes = await copilotApi.sendMessage(activeId, userQuery);
      const payload = sendRes?.data;

      if (payload?.conversation) {
        setActiveConversation(payload.conversation);
        setMessages(payload.conversation.messages || []);
        setSuggestedActions(payload.suggestedActions || []);
        loadConversations();
      } else if (payload?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: payload.reply }]);
        setSuggestedActions(payload.suggestedActions || []);
        loadConversations();
      }
    } catch (err) {
      console.error("Copilot error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "CareerCopilot is temporarily unavailable. Please try again later.";
      setError(errMsg);
      setMessages(prev => prev.slice(0, -1));
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
        toast.success("Conversation renamed.");
        loadConversations();
      } catch (err) {
        toast.error("Failed to rename conversation.");
      }
    }
    setMenuOpen(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete conversation?")) {
      try {
        await copilotApi.deleteConversation(id);
        if (activeConversation?._id === id) {
          handleNewChat();
        }
        toast.success("Conversation deleted.");
        loadConversations();
      } catch (err) {
        toast.error("Failed to delete conversation.");
      }
    }
    setMenuOpen(null);
  };

  const handleShare = async (id) => {
    try {
      const res = await copilotApi.shareConversation(id);
      const data = res?.data || res;
      const shareToken = data?.shareToken;
      if (!shareToken) throw new Error("No share token received");
      const url = `${window.location.origin}/copilot/shared/${shareToken}`;
      navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to generate share link.");
    }
    setMenuOpen(null);
  };

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
      <div className="mb-4">
        <h3 className="text-[10px] uppercase font-bold text-text-muted mb-1 px-2">{title}</h3>
        <div className="space-y-0.5">
          {group.map(conv => (
            <div
              key={conv._id}
              className={`group relative flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                activeConversation?._id === conv._id ? 'bg-primary text-white font-bold' : 'hover:bg-bg-secondary text-text-secondary'
              }`}
              onClick={() => handleSelectConversation(conv._id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={14} className="shrink-0 opacity-70" />
                <span className="truncate">{conv.title}</span>
              </div>

              {!isSharedView && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === conv._id ? null : conv._id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 text-current"
                  >
                    <MoreVertical size={13} />
                  </button>
                  {menuOpen === conv._id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-lg shadow-md py-1 z-10 text-text text-xs">
                      <button onClick={(e) => { e.stopPropagation(); handleRename(conv._id); }} className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary flex items-center gap-1.5"><Edit2 size={12} /> Rename</button>
                      <button onClick={(e) => { e.stopPropagation(); handleShare(conv._id); }} className="w-full text-left px-3 py-1.5 hover:bg-bg-secondary flex items-center gap-1.5"><Share2 size={12} /> Share</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(conv._id); }} className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-1.5"><Trash2 size={12} /> Delete</button>
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

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {!isSharedView && (
        <div className={`
          fixed md:relative z-30 h-full bg-bg-secondary border-r border-border flex flex-col transition-all duration-200
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-14 md:translate-x-0'}
        `}>
          <div className="p-3 border-b border-border flex items-center justify-between shrink-0 h-14">
            {sidebarOpen ? (
              <>
                <Button size="xs" variant="primary" className="flex-1 justify-start gap-1.5 font-bold" onClick={handleNewChat}>
                  <Plus size={14} />
                  <span>New Chat</span>
                </Button>
                <button onClick={toggleSidebar} className="p-1.5 text-text-secondary hover:text-text rounded ml-1 hidden md:block">
                  <Menu size={16} />
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 items-center w-full">
                <button onClick={toggleSidebar} className="p-1.5 text-text-secondary hover:text-text rounded">
                  <Menu size={16} />
                </button>
                <button onClick={handleNewChat} className="p-1.5 text-white bg-primary rounded" title="New Chat">
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-3 ${sidebarOpen ? 'block' : 'hidden'}`}>
            {renderConversationGroup("Today", groupedConversations.today)}
            {renderConversationGroup("Yesterday", groupedConversations.yesterday)}
            {renderConversationGroup("Previous", groupedConversations.older)}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0">

        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-border flex items-center px-4 justify-between bg-surface z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && !isSharedView && (
              <button onClick={toggleSidebar} className="p-1 text-text-secondary hover:text-text rounded mr-1">
                <Menu size={16} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="bg-primary-bg text-primary p-1 rounded border border-primary-border">
                <Sparkles size={15} />
              </div>
              <h1 className="font-bold text-text text-sm m-0">CareerPilot Copilot</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSharedView && activeConversation && (
              <Button onClick={() => handleShare(activeConversation._id)} variant="outline" size="xs">
                <Share2 size={13} className="mr-1" /> Share
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4">

            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-12 h-12 bg-primary-bg text-primary rounded-xl flex items-center justify-center mb-3 border border-primary-border">
                  <Bot size={24} />
                </div>
                <h2 className="text-lg font-bold text-text mb-1 m-0">How can I assist your career today?</h2>
                <p className="text-xs text-text-secondary mb-6 max-w-sm">I have full visibility into your profile, resumes, target roles, and skill gaps.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {["Analyze my resume for Frontend role", "Prepare mock interview questions", "Identify my top skill gaps", "Generate study plan for System Design"].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="p-3 bg-surface border border-border hover:border-primary/40 rounded-lg text-xs font-semibold text-text text-left transition-all flex items-center justify-between"
                    >
                      <span>{prompt}</span>
                      <span className="text-primary font-bold">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                  msg.role === 'user' ? 'bg-primary text-white font-bold' : 'bg-primary-bg text-primary border border-primary-border'
                }`}>
                  {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  <div className={`text-xs rounded-xl p-3.5 ${
                    msg.role === 'user'
                      ? 'bg-primary text-white font-medium rounded-tr-none'
                      : 'bg-bg-secondary text-text border border-border rounded-tl-none'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    ) : (
                      <SimpleMarkdown content={msg.content} />
                    )}
                  </div>

                  {msg.role === 'assistant' && idx === messages.length - 1 && suggestedActions.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {suggestedActions.map((actionText, actIdx) => (
                        <button
                          key={actIdx}
                          onClick={() => setInput(actionText)}
                          className="px-2.5 py-1 bg-surface hover:bg-bg-secondary border border-primary-border text-[11px] font-semibold text-primary rounded-md transition-all flex items-center gap-1"
                        >
                          <span>{actionText}</span>
                          <span>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 flex-row items-center text-xs text-text-secondary font-medium">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-primary-bg text-primary flex items-center justify-center border border-primary-border">
                  <Bot size={15} />
                </div>
                <div className="p-2.5 rounded-lg bg-bg-secondary border border-border flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle size={15} className="shrink-0" />
                <p className="m-0">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>
        </main>

        {/* Input Area */}
        {!isSharedView && (
          <div className="p-3 bg-surface border-t border-border shrink-0">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1.5 focus-within:border-primary">
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
                  placeholder="Ask Copilot anything about your career..."
                  className="flex-1 bg-transparent border-0 px-2 py-1 text-xs text-text placeholder-text-muted focus:outline-none resize-none min-h-[36px] max-h-32"
                  rows={1}
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  size="xs"
                  disabled={!input.trim() || isLoading}
                  className="h-8 w-8 p-0 rounded-md shrink-0 flex items-center justify-center"
                >
                  <Send size={13} />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
