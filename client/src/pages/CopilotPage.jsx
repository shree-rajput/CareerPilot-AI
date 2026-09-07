import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { copilotApi } from '../api/career';
import { useCopilotChat } from '../hooks/useCopilotChat';
import { CopilotShell } from '../components/copilot/CopilotShell';
import { toast } from '../context/ToastContext';

export function CopilotPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSharedView = !!token;

  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    startNewChat,
    selectConversation,
    loadConversations
  } = useCopilotChat();

  const [input, setInput] = useState('');

  // Initial load
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
      window.history.replaceState({}, document.title);
      sendMessage(promptText);
    }
  }, [location.state]);

  const loadSharedConversation = async () => {
    try {
      const res = await copilotApi.getSharedConversation(token);
      const conv = res?.data;
      if (!conv) throw new Error("Shared conversation not found");
      selectConversation(conv._id);
    } catch (err) {
      toast.error("Shared conversation not found or access denied.");
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete conversation?")) {
      try {
        await copilotApi.deleteConversation(id);
        if (activeConversation?._id === id) {
          startNewChat();
        }
        toast.success("Conversation deleted.");
        loadConversations();
      } catch (err) {
        toast.error("Failed to delete conversation.");
      }
    }
  };

  const handleShare = async (id) => {
    try {
      const res = await copilotApi.shareConversation(id);
      const data = res?.data || res;
      const shareToken = data?.shareToken;
      if (!shareToken) throw new Error("No share token received");
      const url = `${window.location.origin}/copilot/shared/${shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to generate share link.");
    }
  };

  return (
    <CopilotShell
      conversations={conversations}
      activeConversation={activeConversation}
      messages={messages}
      isLoading={isLoading}
      error={error}
      input={input}
      setInput={setInput}
      onSendMessage={sendMessage}
      onRetry={retryLastMessage}
      onSelectPrompt={(p) => sendMessage(p)}
      onSelectConversation={selectConversation}
      onNewChat={() => {
        if (isSharedView) navigate('/copilot');
        else startNewChat();
      }}
      onRename={handleRename}
      onDelete={handleDelete}
      onShare={handleShare}
      isSharedView={isSharedView}
    />
  );
}
