import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, ExternalLink } from 'lucide-react';
import { copilotApi } from '../api/career';
import { Button } from './ui/Button';

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am CareerCopilot. How can I help you maximize your placement chances today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      let currentId = activeId;
      if (!currentId) {
        // copilotApi.createConversation() returns { status: 'success', data: conversationObject }
        const createRes = await copilotApi.createConversation("Quick Chat");
        currentId = createRes?.data?._id;
        if (!currentId) throw new Error("Failed to create conversation session");
        setActiveId(currentId);
      }

      // copilotApi.sendMessage() returns { status: 'success', data: { reply, suggestedActions, conversation } }
      const sendRes = await copilotApi.sendMessage(currentId, userQuery);
      const replyText = sendRes?.data?.reply
        || sendRes?.data?.conversation?.messages?.slice(-1)?.[0]?.content
        || "I couldn't generate a response. Please try again.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
    } catch (error) {
      console.error("Copilot error:", error);
      const errMsg = error?.response?.data?.message || error?.message || 'Sorry, I couldn\'t process that request right now. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-11 h-11 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-[100] flex items-center justify-center cursor-pointer ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Copilot"
      >
        <MessageSquare size={20} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[85vh] max-w-[calc(100vw-3rem)] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col z-[100] transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-bg-secondary rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-text leading-tight">CareerCopilot</h3>
              <p className="text-xs text-text-secondary font-medium">Your personal placement coach</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setIsOpen(false);
                window.open('/copilot', '_blank', 'noopener,noreferrer');
              }}
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 text-text-secondary hover:bg-border rounded-full transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-primary'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-bg-secondary text-text border border-border rounded-tl-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 flex-row">
              <div className="shrink-0 w-8 h-8 rounded-full bg-surface border border-border text-primary flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="max-w-[75%] p-3 rounded-2xl text-sm bg-bg-secondary text-text border border-border rounded-tl-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-text-secondary font-medium">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-surface rounded-b-2xl shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              disabled={isLoading}
            />
            <Button type="submit" variant="primary" disabled={!input.trim() || isLoading} className="!px-3 !py-2 rounded-xl h-auto">
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
